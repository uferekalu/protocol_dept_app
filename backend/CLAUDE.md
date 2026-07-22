# CLAUDE.md — Backend (NestJS + MongoDB)

Read `../docs/PROTOCOL_APP_BRIEF.md` first if you haven't. This file covers *how* to
build the API described there.

## Stack already installed (see `package.json`)

NestJS 11, Mongoose 8 (via `@nestjs/mongoose`), `class-validator` + `class-transformer`
for DTOs, `@nestjs/config` for env vars, `@nestjs/jwt` + `@nestjs/passport` for auth,
`@nestjs/swagger` for API docs, `helmet` + `bcrypt` for security basics.

`src/main.ts`, `src/app.module.ts`, `src/config/configuration.ts`, and
`src/common/enums.ts` are already written and working — read them before adding
anything, don't recreate them.

`src/common/enums.ts` already encodes the `InvitationStatus` state machine and the valid
transition map from the brief's Section 3. Use it — don't reinvent status logic inline
in a service.

## Module structure convention

Each entity from the brief gets its own module under `src/modules/<name>/`:

```
src/modules/ministers/
  ministers.module.ts
  ministers.controller.ts
  ministers.service.ts
  schemas/minister.schema.ts
  dto/create-minister.dto.ts
  dto/update-minister.dto.ts
```

Follow this pattern for `ministers`, `events`, `invitations`, `protocol-members`,
`assignments`, `status-logs`, and `auth`. Placeholder folders already exist under
`src/modules/` — build into them.

- **Schemas** use `@nestjs/mongoose` decorators (`@Schema()`, `@Prop()`). Use
  `Types.ObjectId` with `ref` for relationships (e.g. `Invitation.minister` refs
  `Minister`).
- **DTOs** use `class-validator` decorators. Every `POST`/`PATCH` endpoint needs a DTO —
  never accept a raw untyped body.
- **Controllers** stay thin — validate/transform via DTOs, delegate everything else to
  the service.
- **Services** hold business logic. The status-transition validation
  (`VALID_STATUS_TRANSITIONS` from `common/enums.ts`) belongs in the `invitations`
  service, not the controller.
- Register every new module in `app.module.ts`'s `imports` array.

## Status workflow — implementation requirement

When an `Invitation`'s status is updated:
1. Look up the current status.
2. Check the new status against `VALID_STATUS_TRANSITIONS[currentStatus]`. Reject with a
   `400` if the transition isn't allowed — don't trust the frontend to only send valid
   transitions.
3. Update `Invitation.status`.
4. Create a new `StatusLog` document (append-only — never edit or delete existing logs).
5. Return the updated invitation with its new status.

This should probably be a single service method, e.g. `InvitationsService.updateStatus()`,
called from a dedicated endpoint like `PATCH /invitations/:id/status`, separate from the
general-purpose `PATCH /invitations/:id` used for editing hotel/date details.

## Auth & roles

- JWT-based auth. `ProtocolMember` is both the "user" record and the domain entity — no
  need for a separate `User` collection.
- Passwords hashed with `bcrypt` before storage, never stored or logged in plaintext.
  Password strength is enforced via the shared `PASSWORD_REGEX` /
  `PASSWORD_REQUIREMENTS_MESSAGE` in `common/validators/password.constants.ts` (at
  least 6 characters, one uppercase, one lowercase, one digit, one special character) —
  applied to `SignupDto`, `CreateProtocolMemberDto`, and `ChangePasswordDto` alike, so
  there's one place to change the rule.
- **Changing your password** goes through the dedicated `PATCH /auth/change-password`
  (`AuthService.changePassword()`), not the general `PATCH /protocol-members/:id` —
  that endpoint's DTO has no password field at all. `changePassword` requires the new
  password differ from the current hash (`bcrypt.compare`) and rejects with `400` if
  it's the same; it deliberately does not ask for the current password as proof of
  identity, relying entirely on the JWT-authenticated session instead.
- **Account creation is self-service, not admin-driven** — see the brief's Section 4G
  ("Revised from the original spec"). `POST /auth/signup` is public (no guard), takes
  `full_name` / `phone_number` / `password`, and always creates the record with
  `role: MEMBER` — never accept a `role` field from the signup payload, even if one is
  sent. Reuse `ProtocolMembersService.create()`'s hashing/duplicate-phone logic rather
  than duplicating it in `AuthService`. Returns the same shape as `POST /auth/login`
  (token + safe member) so the frontend can land the new member straight into a
  logged-in session.
- Use a `RolesGuard` + a `@Roles(...)` decorator (already built — `common/guards/`,
  `common/decorators/`) to enforce `ADMIN` / `COORDINATOR` / `MEMBER` permissions per the
  brief's Section 4G:
  - `ADMIN` and `COORDINATOR` — full read/write on Minister, Event, Invitation,
    Assignment. Only `ADMIN` may change a `ProtocolMember`'s `role` field (the
    Member → Coordinator promotion path) or edit/delete an account that isn't their own.
  - `MEMBER` — read-only on the member directory (`GET /protocol-members`,
    `GET /protocol-members/:id`), can edit their *own* record's `full_name` /
    `phone_number` / `password` but never their own `role`, and is scoped to their own
    assignments (`GET /protocol-members/:id/assignments` and
    `PATCH /assignments/:id/status` only where `id`/`protocol_member_id` matches
    `request.user.sub`).
  - The self-vs-admin distinction on `PATCH /protocol-members/:id` (own record, editable
    minus `role`, vs. someone else's record, `ADMIN`-only, `role` includable) and the
    ownership check on `PATCH /assignments/:id/status` /
    `GET /protocol-members/:id/assignments` (owner or `ADMIN`/`COORDINATOR`) are
    field/resource-level authorization `RolesGuard` alone can't express (it only knows
    the route and the requester's role, not the specific record being touched) — that
    logic lives directly in the controller, comparing `request.user.sub` (via
    `@CurrentUser()`) to the `:id` param / the resource's owning id, throwing
    `ForbiddenException` itself rather than going through `RolesGuard`.
  - `POST /protocol-members` (direct admin-created account) stays `ADMIN`-only — not
    removed, since an Admin may occasionally need to seed an account directly — but it's
    no longer the primary/expected path for new Protocol Members and the frontend
    doesn't build an "Add Protocol Member" UI around it. Sign-up is the primary path.
- **`PATCH /invitations/:id/status`'s `updated_by`** is derived from
  `request.user.sub` (via `@CurrentUser()`), never trusted from the request body — the
  DTO still *accepts* an `updated_by` field (optional, silently unused) purely so a
  not-yet-updated client isn't rejected by the global `ValidationPipe`'s
  `forbidNonWhitelisted` check; the value is always ignored in favor of the
  authenticated identity.
- **Bootstrapping the first ADMIN.** `AuthService.signup()` checks
  `ProtocolMembersService.count()` before creating the record: if this is the very first
  `ProtocolMember` document in the database, the account is created with `role: ADMIN`
  instead of `MEMBER`. Every signup after that first one is a normal `MEMBER`. This
  means simply being the first person to sign up on a fresh database makes you the
  Admin — no manual `mongosh` step needed. (If a Mongo collection somehow already has
  members but no Admin, the same manual `mongosh` role flip still works as a fallback:
  `mongosh "mongodb://127.0.0.1:27017/protocol_department" --eval "db.protocolmembers.updateOne({phone_number: '+234...'}, {\$set: {role: 'ADMIN'}})"`
  — log in again afterward, since an already-issued JWT still carries the old role until
  it's reissued.)
- Built last relative to the other modules per the brief's Phase 5, and staged across
  several PRs so the app is never left broken mid-phase: backend infrastructure first
  (login/JWT, unguarded), then the frontend (login screen/session), then finally the PR
  that adds `/auth/signup` and applies the guards above to the real endpoints. The
  `ProtocolMember` schema itself (with a hashed password field) has been in place since
  Phase 1 since `Assignment` references it.

## API conventions

- REST, prefixed with `/api` (already set in `main.ts`).
- Plural resource names: `/api/ministers`, `/api/events`, `/api/invitations`,
  `/api/protocol-members`, `/api/assignments`.
- Standard CRUD verbs (`GET`, `POST`, `PATCH`, `DELETE`), plus purpose-built endpoints
  where a plain CRUD verb doesn't capture the action, e.g.:
  - `PATCH /invitations/:id/status` — the guarded status-transition endpoint above
  - `GET /invitations/currently-hosting` — powers the live dashboard (any invitation not
    yet in `DEPARTED_TRIP_COMPLETED`)
  - `GET /protocol-members/:id/assignments` — powers "My Assignments"
- Every endpoint gets Swagger annotations (`@ApiTags`, `@ApiOperation`, etc.) — Swagger
  docs are already wired up at `/api/docs`, use them.
- Validate that `departure_date` is after `arrival_date` and that `preaching_dates` fall
  within the invitation's stay window, in the DTO or service layer.

## Testing expectations

- Each service should have at least basic unit tests for its core logic — especially the
  status-transition validation, since that's the piece most likely to have a subtle bug
  that erodes trust in the whole system.
- Use `@nestjs/testing`'s `Test.createTestingModule` with a mocked Mongoose model for
  service-level tests; save full e2e tests (via `supertest`) for the critical paths
  (create invitation → update status → verify log written).

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in a real MONGODB_URI and JWT_SECRET
npm run start:dev
```

API will be at `http://localhost:4000/api`, Swagger docs at
`http://localhost:4000/api/docs`.

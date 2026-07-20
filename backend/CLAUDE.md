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
- Use a `RolesGuard` + a `@Roles(...)` decorator to enforce `ADMIN` / `COORDINATOR` /
  `MEMBER` permissions per the brief's Section 4G. A `MEMBER` should only be able to see
  and update their own assignments, not the full member directory or other people's
  assignments.
- Build auth last relative to the other modules per the brief's Phase 5 — but keep the
  `ProtocolMember` schema itself (with a hashed password field) in place from Phase 1
  since `Assignment` references it.

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

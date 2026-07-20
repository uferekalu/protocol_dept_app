# CLAUDE.md — Protocol Department App (Monorepo Root)

This repository is a monorepo with two independent apps:

- `frontend/` — Next.js (App Router) + TypeScript + Redux Toolkit
- `backend/` — NestJS + TypeScript + MongoDB (Mongoose)

**Before writing any code, read `docs/PROTOCOL_APP_BRIEF.md` in full.** It is the single
source of truth for what this application does — the entities, the status workflow, the
feature list, and the build order. `frontend/CLAUDE.md` and `backend/CLAUDE.md` both
assume you've already read it and go deeper on stack-specific conventions.

Read them in this order:
1. `docs/PROTOCOL_APP_BRIEF.md` (what to build)
2. `backend/CLAUDE.md` (how to build the API)
3. `frontend/CLAUDE.md` (how to build the UI)

---

## What this app is, in one paragraph

The Protocol Department of the Presbyterian Church of Nigeria hosts visiting ministers
for Revivals and Crusades. This app tracks every visiting minister through a precise
status pipeline (invited → picked up → en route → checked in → at venue → returned →
departed), records which Protocol member is responsible for each leg of the journey, and
gives the department a live dashboard of who is where, right now. Get this right and it
replaces a WhatsApp-group-and-phone-calls process that currently has no accountability
trail.

---

## Non-negotiable ground rules

1. **The data model in `docs/PROTOCOL_APP_BRIEF.md` Section 2 is canonical.** Don't
   rename fields, don't drop fields, don't restructure entities without flagging it to
   the user first and explaining why.
2. **The status workflow in Section 3 is a state machine, not a string field.** Enforce
   valid transitions server-side. A minister cannot jump from "Invited" straight to
   "Departed" — the backend should reject invalid transitions, not just the UI.
3. **Every status change is logged, never overwritten.** `StatusLog` is an append-only
   collection. The current status on `Invitation` is a denormalized convenience field;
   the log is the source of truth for history.
4. **Follow the phased build order in Section 7.** Don't build the reports/notifications
   polish (Phase 6) before the core tracking pipeline (Phase 2) is working end-to-end.
   Confirm each phase works before moving to the next — this is how you get to "100%
   correct" instead of a pile of half-finished features.
5. **Ask before expanding scope.** If something isn't in the brief, don't silently add
   it. Flag it, suggest it, wait for confirmation.

---

## Working style expected on this project

- **Confirm the plan before generating large amounts of code.** For each phase, restate
  what you're about to build (schemas, endpoints, or screens) in a short plan, then
  proceed once it looks right.
- **Small, verifiable steps over big-bang generation.** Build one module fully
  (schema → DTO → service → controller → basic test) before starting the next, rather
  than scaffolding all six backend modules empty and filling them in later.
- **Keep frontend and backend in sync deliberately.** When you add or change a field on
  a backend DTO, update the corresponding frontend TypeScript type in the same batch of
  work, not "later."
- **Real validation, not happy-path only.** Required fields, date logic (departure after
  arrival), and role permissions should be enforced on the backend regardless of what
  the frontend does.
- **This is a real tool for real people who are not developers.** Optimize the UI for
  clarity under pressure — a Protocol member standing at an airport arrivals hall needs
  to update a status in two taps, not hunt through a settings menu. Favor obvious, large,
  well-labeled actions over dense admin-panel aesthetics.
- **Environment variables, not hardcoded values.** MongoDB URI, JWT secret, API base URL
  all come from `.env` files (`.env.example` files are provided in both `frontend/` and
  `backend/` — copy them to `.env`/`.env.local` and fill in real values).

## Git workflow — mandatory, no exceptions

This repository lives at `https://github.com/uferekalu/protocol_dept_app`. `main` is
**protected**: pull requests are required, direct pushes are rejected by GitHub for
everyone (including admins, via `enforce_admins`), and force-pushes/deletions are
disabled. There is no legitimate way to push straight to `main` — if a push is rejected
with `GH006: Protected branch update failed`, that's the protection working as intended,
not a bug to work around.

### Branch naming

Every branch follows this exact format:

```
feature/PR-XXX-short-kebab-description
```

- `XXX` is a zero-padded, sequential 3-digit number (`001`, `002`, `003`, …) tracked in
  `.github/PR_COUNTER` at the repo root. That file holds a single integer: the last
  number used.
- `short-kebab-description` is a few kebab-case words describing the work (e.g.
  `minister-module`, `event-module`, `status-state-machine`).
- Example: `feature/PR-001-minister-module`, `feature/PR-002-event-module`.

**Before creating a new branch:**
1. Read the current value in `.github/PR_COUNTER`.
2. Increment it by 1 — that's your `XXX` (zero-padded to 3 digits).
3. Create the branch off the latest `main` using that number.
4. As part of your first commit on the branch, update `.github/PR_COUNTER` to the new
   value, so the next branch (in this or a future session) picks the correct next number.

### The cycle, per module/phase

This repo builds one module/phase at a time (see the phased build order below and in the
brief). Each one goes through this exact cycle:

1. Build the module fully and verify it locally — tests pass, and where practical, a live
   smoke test against a running server (per `backend/CLAUDE.md`'s testing expectations).
2. `git checkout main && git pull` to make sure you're branching from the latest merged
   state.
3. Create a branch named per the convention above.
4. Commit the work with a clear, conventional message.
5. Push the branch: `git push -u origin <branch-name>`.
6. Open a pull request into `main` (`gh pr create --base main --title ... --body ...`),
   describing what was built and how it was verified.
7. **Stop and ask the user to review and merge the PR on GitHub.** Do not attempt to merge
   it yourself, and do not start the next module until the user confirms it's merged.
8. Once confirmed, `git checkout main && git pull` before starting the next branch.

Never batch multiple unrelated modules into a single PR — one module/phase per PR, matching
the "small, verifiable steps" principle above.

## Definition of "done" for this project

The Protocol Department should be able to:
- Log in with their own account and see only what their role permits
- Create an event, invite a minister to it, and record their hotel + schedule
- Assign specific members to airport pickup, hotel drop, daily transport, and final
  departure
- Update a minister's status from a phone in under 10 seconds
- See, at a glance on the dashboard, every minister currently being hosted and their
  live status
- Look back at any past event and see the full timeline of who did what, when

That's the bar. Build toward it phase by phase.

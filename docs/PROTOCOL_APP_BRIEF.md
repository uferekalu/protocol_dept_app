# Project Brief: Protocol Department Minister-Tracking App
### For: Presbyterian Church of Nigeria — Protocol Department

This is the full, authoritative product brief for this application. Every module, screen,
and API endpoint built in this repository must trace back to something in this document.
If a feature is requested that isn't covered here, treat this document as the source of
truth and ask before inventing new scope.

---

## 1. Purpose

The Protocol Department hosts invited ministers (guest preachers) during Revivals,
Crusades, and special programs. This app digitizes and tracks the entire lifecycle of
hosting a minister — from arrival at the airport/park, to hotel check-in, through their
preaching engagements, to their departure — and records which Protocol member handled
each leg.

**Core goal:** at any moment, anyone in the department should be able to open the app and
know: *Where is Minister X right now, who is responsible for them, and what's next?*

---

## 2. Core Entities (Data Model)

This is the canonical data model. Backend schemas and frontend types must match this
exactly, field for field, unless a deliberate change is discussed and documented.

### `Minister`
- `id`
- `full_name`
- `title` (e.g. Rev., Pastor, Bishop, Rev. Dr.)
- `phone_number`
- `email` (optional)
- `home_church_or_parish`
- `photo` (optional)
- `notes` (dietary needs, special requests, etc.)

### `Event` (Revival, Crusade, Special Program)
- `id`
- `name` (e.g. "2026 Easter Revival")
- `start_date`
- `end_date`
- `venue`
- `description`

### `Invitation` (links a Minister to an Event — one minister can be invited to many
events over time)
- `id`
- `minister_id`
- `event_id`
- `arrival_date`
- `departure_date`
- `number_of_days` (auto-calculated from arrival/departure, but editable)
- `hotel_name`
- `hotel_address`
- `hotel_room_number` (optional)
- `preaching_dates[]` (specific days they're scheduled to minister within the event)
- `status` (see Section 3 — this is the key tracking field)

### `ProtocolMember` (the users of the app)
- `id`
- `full_name`
- `phone_number`
- `role` (Admin / Coordinator / Driver-Escort / Member)

### `Assignment` (which Protocol member is responsible for which leg of the trip)
- `id`
- `invitation_id`
- `protocol_member_id`
- `assignment_type` (Pickup from Airport, Drop to Hotel, Hotel-to-Venue transport,
  Venue-to-Hotel transport, Drop-off at Airport/Departure)
- `scheduled_time`
- `actual_time_completed`
- `status` (Pending / In Progress / Completed)
- `notes` (e.g. "flight delayed," "took alternate route")

### `StatusLog` (timeline/audit trail — every status change is recorded, not overwritten)
- `id`
- `invitation_id`
- `status`
- `timestamp`
- `updated_by` (protocol_member_id)
- `notes`

---

## 3. The Status Workflow (Most Important Part)

This is the heart of the app. Each `Invitation` moves through a clear, linear status
pipeline. This must be modeled as an explicit **state machine**, not a free-text field:

1. **Invited** — minister confirmed, not yet arrived
2. **Airport Pickup In Progress** — protocol member en route to/at airport
3. **En Route to Hotel** — picked up, being driven to hotel
4. **Checked In / Settled at Hotel** — confirmed arrival at hotel
5. **En Route to Venue** — being driven from hotel to church for a service
6. **At Venue / Ministering** — currently preaching/at the event
7. **Returned to Hotel** — back at hotel after service (this repeats for each preaching
   day — see below)
8. **En Route to Departure Point** — being driven to airport/park at the end of their stay
9. **Departed / Trip Completed** — confirmed they've left, engagement closed

Each status change must:
- Be timestamped automatically
- Record which Protocol member updated it
- Be visible in a per-minister timeline (the `StatusLog`)
- Trigger the next logical action (e.g. once "Checked In" is set, the app should surface
  "who is picking them up for the first service?")

> **Important:** Steps 5–7 repeat for every day the minister preaches. Do not model this
> as a single one-way pipeline — build it as a repeating sub-cycle within the overall
> stay, tied to `preaching_dates[]`.

---

## 4. Feature List

### A. Minister & Invitation Management
- Add/edit/view minister profiles (reusable across multiple events over the years)
- Create an invitation linking a minister to an event, with arrival/departure dates
- Auto-calculate and display number of days the minister will spend
- Attach hotel details to each invitation
- Attach preaching schedule (specific dates/times within the event)

### B. Live Status Tracking
- Visual status pipeline per minister (Section 3) — a simple stepper/progress bar UI
- "Currently hosting" dashboard — a live overview screen showing every minister
  currently in-stay, their current status, and who's responsible for them right now
- Manual status update by assigned Protocol member
- Full timeline/history log per minister — who did what, when

### C. Protocol Member & Assignment Management
- Protocol member directory (name, phone, role)
- Assign a specific member to each leg of a trip
- Each member can see "my assignments" — a personal task list
- Mark assignment as completed with timestamp
- Reassignment if a member is unavailable

### D. Calendar / Schedule View
- Calendar showing all ministers currently hosted, arrival/departure dates, and
  preaching dates
- Upcoming arrivals view (who's coming this week)
- Upcoming departures view (who needs a ride out soon)

### E. Notifications & Reminders (v2, but design the data model to support it from day one)
- Reminder to assigned member X hours before a scheduled pickup/drop-off
- Alert to Admin/Coordinator if a status hasn't been updated within an expected window

### F. Reporting & History
- Past events archive — see all ministers hosted historically, with full logs
- Simple reports: total days hosted per minister, most active Protocol members,
  average response time between pickup and hotel check-in
- Exportable minister list per event

### G. User Roles & Access

> **Revised from the original spec** (see Section 7's Phase 5 note): account creation is
> self-service, not admin-driven. The department announces (e.g. in church) that it
> needs Protocol volunteers; anyone interested joins by visiting the app and signing up
> themselves, rather than an Admin or Coordinator creating their account for them.

- **Sign-up is self-service.** A prospective Protocol Member creates their own account
  (full name, phone number, password) via the Sign Up screen. Every self-registered
  account starts as **Member** — the role is never user-selectable at sign-up, to
  prevent privilege escalation.
- **Admin** — full access: manages events, ministers, invitations, and assignments. The
  *only* role that can change another member's role (e.g. promoting a Member to
  Coordinator). Neither Admin nor Coordinator creates member accounts on someone else's
  behalf.
- **Coordinator** — creates/edits events, ministers, and invitations; assigns members to
  trip legs; views all dashboards. Same operational scope as Admin *except* it cannot
  change anyone's role or edit another member's account.
- **Protocol Member/Driver** — can view the member directory read-only (everyone can see
  who else is in the department) and edit their own profile, but sees and updates only
  the assignments assigned to them. Cannot create/edit Ministers, Events, Invitations, or
  Assignments, and cannot edit anyone else's account.
- (v2) **View-only** role for church leadership

---

## 5. Suggested Screens

1. **Sign Up** — self-service account creation (full name, phone number, password);
   always creates a Member account
2. **Login** (role-based access)
3. **Dashboard** — "Currently Hosting" live overview (cards per minister with status +
   assigned member)
4. **Minister Profile** — details, invitation history
5. **Create/Edit Invitation** — event link, dates, hotel info, preaching schedule
6. **Assignment Board** — assign Protocol members to each leg
7. **My Assignments** — personal view for each Protocol member
8. **Status Timeline** — per-invitation history log
9. **Calendar View**
10. **Events List / Event Detail** (Revival, Crusade, etc.)
11. **Member Directory** — read-only list of everyone in the department; **My Profile**
    for editing your own account (Admin can additionally change another member's role
    from here)
12. **Reports/History Archive**

---

## 6. Tech Stack (locked in for this repo)

- **Frontend:** Next.js (App Router) + TypeScript + Redux Toolkit + Tailwind CSS +
  shadcn/ui (Radix primitives) + react-hook-form + zod for validation
- **Backend:** NestJS + TypeScript + MongoDB via Mongoose
- **Auth:** JWT-based, self-service sign-up (every new account starts as Member),
  role-based guards (Admin / Coordinator / Protocol Member), admin-only role promotion
- **API style:** REST, documented with Swagger (`@nestjs/swagger`)

---

## 7. Phased Build Order

1. **Phase 1 — Foundation:** Mongoose schemas + REST CRUD for Minister, Event,
   Invitation, ProtocolMember, Assignment, StatusLog.
2. **Phase 2 — Core Tracking:** Status state machine + Status Timeline UI +
   "Currently Hosting" dashboard.
3. **Phase 3 — Assignments:** Assignment board + "My Assignments" view.
4. **Phase 4 — Scheduling:** Calendar view, preaching-date sub-cycles, days-count
   auto-calculation.
5. **Phase 5 — Auth & Roles:** Self-service sign-up (every new account starts as
   Member), login, role-based permissions and guards, admin-only role promotion. Staged
   across several PRs to avoid ever leaving the app in a broken state: backend
   infrastructure first (unguarded), then the frontend (login/session), then finally
   applying guards + building sign-up once both sides are proven working together.
6. **Phase 6 — Polish:** Notifications/reminders, reports, historical archive, export.

Build and verify each phase before moving to the next. Don't jump ahead to polish while
the core tracking pipeline is still unverified.

# CLAUDE.md — Frontend (Next.js App Router + Redux Toolkit)

Read `../docs/PROTOCOL_APP_BRIEF.md` first if you haven't. This file covers *how* to
build the UI described there.

## Stack already installed (see `package.json`)

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Redux Toolkit + React-Redux,
Tailwind CSS v4, react-hook-form + zod for forms/validation, date-fns, lucide-react
icons, sonner for toasts, axios for API calls.

`app/layout.tsx`, `app/providers.tsx`, `lib/redux/store.ts`, `lib/redux/hooks.ts`, and
`lib/api/client.ts` already exist and work — read them before recreating anything.

## First thing to do after `npm install`

Initialize shadcn/ui (not pre-scaffolded here since its CLI is interactive and needs to
detect your installed Tailwind version):

```bash
npx shadcn@latest init
```

Use it for buttons, cards, dialogs, forms, tables, badges, and the stepper/progress
components the status pipeline UI needs. Don't hand-roll primitives shadcn already
covers well.

Immediately after `init`, install `next-themes` (`npm install next-themes`) — it's the
mechanism for dark/light mode per the Theming section below, and everything after this
point assumes it's in place.

## Brand

- **Brand colors: purple and white.** Purple is the primary/accent color across the
  entire UI (primary buttons, active states, links, the status stepper's "active" step,
  focus rings, selected nav items). White (and near-white/near-black neutrals derived
  from it — see Tokenization below) forms the base surface in light mode.
  - Do not hardcode a single purple hex value in multiple places. Pick one purple hue
    and derive a full scale from it (e.g. 50–950, the way Tailwind/shadcn generate
    scales) so there's exactly one source for "purple" and every shade used anywhere in
    the app is a step on that scale, not an eyeballed variant.
  - Neutrals (grays used for text, borders, muted backgrounds) should be a genuinely
    neutral or very slightly purple-tinted scale — not an unrelated gray that clashes
    with the brand hue.

## Design tokens — mandatory, no exceptions

**Nothing in this UI is styled with a magic number or a one-off hex/px value.** Every
visual property — every color, every spacing value, every font size/weight/line-height,
every radius, every shadow, every breakpoint — must resolve to a named design token.
"Tokenized" here means: defined once, in one place, referenced everywhere by name. If a
future rebrand needs to change the purple or bump the base spacing unit, it should be a
one-line edit to a token file, never a find-and-replace across components.

Concretely:

1. **Single source of truth: `app/globals.css`.** Define all tokens as CSS variables
   under `@theme` (Tailwind v4's token mechanism) — colors, spacing scale, font family,
   font sizes, font weights, line heights, radii, shadows, and the dark-mode overrides
   for all of the above (see Theming below). This file is the only place raw color/size
   values are allowed to appear.
2. **Every component consumes tokens via Tailwind utility classes or `var(--token-name)`
   — never a raw value.** No `style={{ color: '#7C3AED' }}`, no `className="p-[13px]"`,
   no `text-[15px]`. If a utility class exists for it, use the class; if a one-off value
   is genuinely needed, add it as a new named token first, then reference the token.
3. **Spacing and sizing use a consistent scale**, not arbitrary values — stick to
   Tailwind's default spacing scale (which is itself token-based) unless the brief
   specifically needs a custom scale, in which case define that scale once in `@theme`.
4. **Typography is tokenized**: a small, fixed set of named text styles (e.g.
   `text-heading-lg`, `text-heading-md`, `text-body`, `text-body-sm`, `text-label`,
   `text-caption`) composed from the font/size/weight/line-height tokens, applied
   consistently by role across the app — not ad hoc `text-[17px] font-[560]` combinations
   invented per screen.
5. **Component variants (button styles, badge colors, card elevation, etc.) are defined
   once** using `class-variance-authority` (already installed) and reused everywhere that
   component type appears — never restyled inline per screen.
6. **Every token must have a clear source/rationale.** When you add a token, its name
   should make its purpose obvious (`--color-primary`, `--color-primary-hover`,
   `--radius-card`, `--space-section-gap`) — not implementation-detail names like
   `--purple-1` or `--gap-14`. Someone reading the token file alone should understand the
   design system without reading component code.

Treat any PR/change that introduces a raw color, raw pixel value, or inline style outside
`globals.css` as incomplete work — go back and tokenize it before considering the task
done.

## Theming — dark and light mode (mandatory, must work perfectly)

The app must fully support both light and dark mode, correctly, everywhere — not just on
the pages built first.

- **Mechanism:** `next-themes`'s `ThemeProvider`, wrapping the app inside
  `app/providers.tsx` alongside the existing Redux `Provider`. Use `attribute="class"`
  so Tailwind's `dark:` variant and shadcn's CSS-variable convention both work.
- **Token-driven, not component-driven:** every color token defined in `@theme` gets a
  light value and a dark value (shadcn's standard pattern: define the light values under
  `:root` and override the same variable names under `.dark`). Components should never
  contain their own `dark:bg-...` overrides for brand colors — they should reference a
  token (e.g. `bg-background`, `text-foreground`, `bg-primary`) whose value already
  changes correctly based on the active theme. `dark:` variants are only acceptable for
  genuine one-off exceptions, not as the default way of handling dark mode.
- **Default to system preference**, with an explicit toggle (sun/moon icon, using
  `lucide-react`) placed in a persistent, obvious location (top nav/header) so a user can
  override it. Persist the user's explicit choice (next-themes handles this via
  localStorage automatically).
- **No flash of wrong theme on load.** Follow next-themes' standard SSR-safe setup
  (`suppressHydrationWarning` on `<html>`, theme script injected before paint) — verify
  this actually works by hard-refreshing on both a light-preference and dark-preference
  system before considering theming done.
- **Verify every screen in both modes before marking it complete**, not just the
  dashboard. Pay particular attention to: status stepper colors, form field borders/focus
  states, table row hover/zebra colors, toast (`sonner`) styling, and chart/report colors
  in Phase 6 — these are the elements most likely to be forgotten and left light-mode-only.
- Purple as the primary brand color must remain legible and on-brand in both themes —
  this typically means a slightly brighter/lighter purple token value in dark mode than
  the one used in light mode (define both as separate token values, don't reuse the exact
  same hex for both and hope for the best).

## Folder structure convention

```
app/                     — routes (App Router). One folder per route segment.
  (dashboard)/            — route group for authenticated screens, if you choose to group them
  ministers/
  events/
  invitations/
  assignments/
components/              — shared, reusable UI components (shadcn output lands in components/ui)
lib/
  redux/
    store.ts
    hooks.ts
    slices/              — one slice per domain concept (invitationsSlice, ministersSlice, etc.)
  api/
    client.ts            — shared axios instance
    <domain>.ts           — API call functions per domain, e.g. invitations.ts, ministers.ts
  types/                 — shared TypeScript types mirroring the backend DTOs
```

## State management approach

- **Redux Toolkit for client/UI state** (sidebar, filters, active view, auth session).
- **Server state (data from the API)**: either extend Redux with RTK Query (recommended
  — it's part of the same package, gives you caching/loading/error states for free and
  fits naturally next to the existing slices) or fetch in Server Components directly
  where the data doesn't need to be reactive/client-interactive. Don't build a third,
  separate data-fetching pattern — pick RTK Query and use it consistently once auth
  exists, since most screens here are inherently interactive (status updates, live
  dashboard).
- Keep slices scoped to one domain concept each — don't create a single giant
  `appSlice`.

## Screens to build (maps to brief Section 5 and the phased plan in Section 7)

Build in this order, matching the backend's phase order so each screen has a working
API to call against:

1. **Dashboard (`/`)** — "Currently Hosting" live overview. Cards per minister showing
   name, current status (use a stepper/progress component, not just a text badge),
   assigned Protocol member, and quick action button for the next status update.
2. **Minister profile (`/ministers/[id]`)** and **minister list (`/ministers`)**.
3. **Invitation create/edit (`/invitations/new`, `/invitations/[id]/edit`)** — links a
   minister to an event, date range, hotel details, preaching dates. Auto-calculate and
   display `number_of_days` from arrival/departure (recompute live as dates change,
   still let the coordinator override it manually).
4. **Status timeline (`/invitations/[id]`)** — the append-only log, most recent first.
5. **Assignment board (`/assignments`)** — assign Protocol members to trip legs.
6. **My assignments (`/my-assignments`)** — scoped to the logged-in member.
7. **Calendar (`/calendar`)** — arrivals, departures, preaching dates at a glance.
8. **Events (`/events`, `/events/[id]`)**.
9. **Reports/archive (`/reports`)** — build last, per Phase 6.
10. **Login (`/login`)** — built. **Sign up (`/signup`)** — self-service account
    creation (full name, phone number, password); always lands as `MEMBER`, the role is
    never a form field. Both are Phase 5, staged after the core tracking screens per the
    brief's Section 7 — see backend/CLAUDE.md's "Auth & roles" for why sign-up replaced
    admin-created accounts and how the three-PR staging worked.
11. **Member directory (`/team`)** — read-only list of everyone in the department, open
    to every logged-in role. **My profile (`/profile`)** — edit your own `full_name` /
    `phone_number` / password; an Admin viewing someone else's entry can additionally
    change that person's role (the Member → Coordinator promotion path) — no one else
    can change a role, including their own.

## Forms

- Every form uses `react-hook-form` + a `zod` schema, with `@hookform/resolvers/zod`
  wiring them together. Define the zod schema once per entity and reuse it for both
  create and edit forms where the shape matches.
- Mirror backend validation rules on the frontend (e.g. departure date after arrival
  date) so users get instant feedback, but never treat frontend validation as sufficient
  on its own — the backend re-validates everything per `backend/CLAUDE.md`.

## Design & UX bar

This is a real tool a non-technical church volunteer will use, often on a phone, often
while standing at an airport or venue. That should visibly shape the UI:

- Big, unambiguous primary actions (e.g. "Mark as Checked In" as a prominent button, not
  a small icon in a dropdown).
- The status pipeline should be genuinely visual — a horizontal or vertical stepper
  showing where the minister currently is, not just a colored badge with text.
- Mobile-first layouts for the "My Assignments" and status-update screens specifically,
  since those are the ones used in the field. The dashboard and reports can be more
  desktop-oriented since they're used by coordinators at a desk.
- Use consistent, restrained color coding for status (e.g. neutral → in-progress →
  complete), and don't rely on color alone — pair with icons/labels for accessibility.
  Status colors are tokens too (e.g. `--color-status-pending`,
  `--color-status-in-progress`, `--color-status-complete`), each with light and dark
  values, not inline colors chosen per screen.
- Loading and error states on every screen that fetches data — never a blank white
  screen while waiting on the API. ("White" here is figurative — respect the active
  theme; a loading state should use `bg-background`, not a hardcoded white.)

## Setup

```bash
cd frontend
npm install
npx shadcn@latest init
npm install next-themes
cp .env.local.example .env.local   # then point NEXT_PUBLIC_API_BASE_URL at the backend
npm run dev
```

App will be at `http://localhost:3000`, calling the API at whatever
`NEXT_PUBLIC_API_BASE_URL` is set to (defaults to `http://localhost:4000/api`, matching
the backend's default port).

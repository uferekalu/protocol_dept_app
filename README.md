# Protocol Department App

Minister-tracking application for the Protocol Department of the Presbyterian Church of
Nigeria. Tracks visiting ministers from airport pickup through hotel check-in, daily
preaching engagements, and final departure — with a full accountability trail of which
Protocol member handled each step.

## Structure

```
docs/CLAUDE.md                docs/PROTOCOL_APP_BRIEF.md  — full product brief (read first)
CLAUDE.md                     — root instructions for Claude Code
frontend/                     — Next.js (App Router) + TypeScript + Redux Toolkit
  CLAUDE.md                   — frontend-specific conventions
backend/                      — NestJS + TypeScript + MongoDB
  CLAUDE.md                   — backend-specific conventions
```

## Quick start

You need Node.js 20+ and a MongoDB instance (local, or a free Atlas cluster) before you
start.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env — set MONGODB_URI to your MongoDB connection string and JWT_SECRET to a
# long random string
npm run start:dev
```

API runs at `http://localhost:4000/api`, Swagger docs at `http://localhost:4000/api/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npx shadcn@latest init
cp .env.local.example .env.local
npm run dev
```

App runs at `http://localhost:3000`.

## Developing with Claude Code

Open this whole folder (`protocol-department-app/`) in Claude Code. It will pick up
`CLAUDE.md` at the root automatically, which points to `docs/PROTOCOL_APP_BRIEF.md` (the
full spec) and the two stack-specific `CLAUDE.md` files. Start a session with something
like:

> Read CLAUDE.md, docs/PROTOCOL_APP_BRIEF.md, backend/CLAUDE.md, and frontend/CLAUDE.md
> in full. Then let's start on Phase 1 from the brief — the backend schemas and CRUD
> APIs. Walk me through your plan for the Minister and Event modules before writing code.

Work through the phases in order (see brief Section 7). Don't let it jump ahead to
polish before the core status-tracking pipeline works end-to-end — that pipeline is the
whole point of the app.

## Notes

- Neither `frontend/` nor `backend/` has `node_modules/` installed yet — run
  `npm install` in each before starting.
- No MongoDB is bundled — point `MONGODB_URI` at either a local `mongod` instance or a
  free MongoDB Atlas cluster.

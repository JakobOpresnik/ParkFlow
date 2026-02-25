# ParkFlow — Project Context for Claude Code

## Your Role
You are the sole developer on this project. The product owner communicates with you via direct messages and TASKS.md. You do not ask for permissions fro unimportant commands like npm, git  bash,..

Rules:
- Always read TASKS.md at the start of each session
- Mark tasks as `[x]` when done, move them to ## ✅ Done
- When you start a task, move it to ## 🔥 In Progress
- After finishing a task, summarize what you did in 2-3 sentences
- If you're unsure about a requirement, make a reasonable assumption, document it, and continue. Ask only if completely blocked.
- Never skip error handling
- Always use .env for secrets — never hardcode credentials
- **Write tests as you code** — do not leave tests for later. Every new route, middleware, or non-trivial utility must have tests written in the same commit.
- Backend tests use Vitest + Supertest (`bun run test` from `/backend`). Frontend tests use Vitest + React Testing Library (`bun test` from `/frontend`).
- After marking a task done, always commit: `git add -A && git commit -m "feat/fix/chore: description"`
- Commit messages follow conventional commits — keep them short and descriptive

---

## Project Overview
Internal parking management system for a small office (10–50 spots).

**Core features:**
- Interactive parking map (CAD image with SVG overlay — clickable spots)
- Search spot by number → see owner, status, vehicle plate
- Assign / unassign owner to a parking spot
- Status updates (free / occupied / reserved)
- Owner management (add, edit, remove)

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS v4 + React Query |
| UI Components | shadcn/ui |
| State | Zustand |
| Backend | Node.js + Express |
| Database | PostgreSQL (local, via `pg` library) |
| Real-time | React Query polling (refetchInterval: 15000) |
| Parking Map | Static image (`docs/parking-map.png`) + SVG overlay |
| Package manager | Bun (never use npm, yarn or pnpm) |
| Testing | Vitest + React Testing Library |
| Auth | None for MVP |

---

## Commands
```
bun dev           — Start dev server (frontend)
bun run build     — Type-check + production build
bun run lint      — Run ESLint
bun run lint:fix  — Auto-fix lint issues
bun run format    — Format all source files
bun test          — Run Vitest tests
bun test --watch  — Watch mode
```

Backend (from `/backend`):
```
bun run dev       — Start Express server with hot reload
bun run start     — Start Express server (production)
```

## Formatting
Prettier config: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`
No separate CSS files — Tailwind utility classes only. Custom values go in `@theme` in `index.css`.
shadcn/ui components live in `frontend/src/components/ui/` — they are part of the project, edit them freely.

---

## Project Structure
```
parking-app/
├── CLAUDE.md
├── TASKS.md
├── docs/
│   ├── architecture.md
│   ├── parking-map.png        ← CAD floor plan (to be added by PO)
│   └── spot-coordinates.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParkingMap/
│   │   │   ├── SpotCard/
│   │   │   ├── SpotSearch/
│   │   │   └── OwnerModal/
│   │   ├── hooks/             ← useSpots, useOwners (React Query wrappers)
│   │   ├── store/             ← Zustand stores (parkingStore, uiStore)
│   │   ├── api/               ← fetch wrappers for Express API
│   │   ├── types/             ← shared TypeScript interfaces
│   │   ├── __tests__/         ← Vitest test files
│   │   └── pages/
│   │       ├── MapPage.tsx
│   │       └── OwnersPage.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── spots.ts
│   │   │   └── owners.ts
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── db/
│   │   │   └── pool.ts        ← pg Pool instance
│   │   └── index.ts
│   ├── migrations/            ← SQL migration files (run manually via psql)
│   │   └── 001_initial.sql
│   ├── .env.example
│   └── package.json
└── .gitignore
```

---

## Database Schema (PostgreSQL)

### Table: `owners`
```sql
CREATE TABLE owners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  vehicle_plate TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Table: `spots`
```sql
CREATE TABLE spots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number      INTEGER UNIQUE NOT NULL,
  label       TEXT,
  floor       TEXT DEFAULT 'P1',
  status      TEXT DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
  owner_id    UUID REFERENCES owners(id) ON DELETE SET NULL,
  coordinates JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

Migrations live in `backend/migrations/` as numbered SQL files. Run manually:
```bash
psql $DATABASE_URL -f backend/migrations/001_initial.sql
```

---

## API Endpoints (Express backend)

```
GET    /api/spots              → all spots with joined owner data
GET    /api/spots/:number      → single spot by number, 404 if not found
PATCH  /api/spots/:id/owner    → assign/unassign owner { owner_id: string | null }
PATCH  /api/spots/:id/status   → update status { status: 'free'|'occupied'|'reserved' }

GET    /api/owners             → all owners
POST   /api/owners             → create owner { name, email, phone, vehicle_plate }
PUT    /api/owners/:id         → update owner
DELETE /api/owners/:id         → delete owner (spot owner_id becomes null via FK)

GET    /health                 → { ok: true }
```

---

## State Management (Zustand)
- `parkingStore` — selected spot, floor filter
- `uiStore` — modals open/closed
- Stores live in `frontend/src/store/`, one file per store
- Never put server state in Zustand — that belongs in React Query

## React Query Polling
No WebSocket or real-time subscription. React Query handles refresh:
```ts
useQuery({ queryKey: ['spots'], queryFn: api.getSpots, refetchInterval: 15_000 })
```
15 seconds is sufficient for office parking. Adjust if needed.

---

## Coding Conventions
- **TypeScript:** Never use `any` — use proper types or `unknown` with narrowing
- Components in `PascalCase`, hooks start with `use`, stores end with `Store`
- One component per file, co-located with its route if page-specific
- All API calls go through `frontend/src/api/` — no direct fetch in components
- Always wrap async routes with try/catch, return `{ error: message }` on failure
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Server Error
- Commits: conventional commits — `feat:`, `fix:`, `chore:`, `refactor:`
- No inline `style` props — Tailwind classes only
- No new CSS files — all custom values go in `@theme` in `index.css`
- shadcn/ui components can and should be modified to fit project needs — they are not a black box

---

## Testing
Write tests when:
- A utility function has non-trivial logic (e.g. spot status computation)
- A component handles complex state or user interactions
- A bug is fixed — add a regression test
- A hook has branching async logic

Use Vitest + React Testing Library. Test files go in `src/__tests__/` or co-located as `ComponentName.test.tsx`. Run `bun test` to verify.

---

## Rules for Claude (AI Assistant)
1. Always run `bun run build` after changes — TypeScript errors must be zero
2. Always run `bun run lint` and `bun run format` before marking a task done
3. Never introduce `any` types
4. Keep components small — one component per file
5. Write tests when you see logic that warrants it (see Testing section above)
6. Use shadcn/ui components for interactive UI (Button, Dialog, Input, Badge, etc.) — they live in `src/components/ui/`
7. Use Tailwind for styling, not inline `style` props
8. When modifying data structures, update `src/types/index.ts` and SQL schema accordingly
9. Mobile-first — test on mobile viewport first

---

## Definition of Done (DoD)
A task is done when:
- [ ] Feature works end-to-end (frontend ↔ backend ↔ DB)
- [ ] Error states are handled (empty results, failed requests)
- [ ] No hardcoded secrets or credentials
- [ ] TASKS.md is updated

---

## Dev Container
Projekt uporablja VSCode Dev Container. Ko odpreš repo v VSCode:
1. Klikni **Reopen in Container** (ali F1 → Dev Containers: Reopen in Container)
2. VSCode zažene app + PostgreSQL containerja
3. `postCreateCommand` avtomatsko požene `bun install` za frontend in backend
4. PostgreSQL je dostopen na `localhost:5432` znotraj containerja

Credentiali so že nastavljeni v `docker-compose.yml`:
```
DATABASE_URL=postgresql://parkflow:parkflow@db:5432/parkflow
```

Za zagon migracije znotraj containerja:
```bash
psql $DATABASE_URL -f backend/migrations/001_initial.sql
```

---

## Environment Variables

### `backend/.env` (lokalno razvijanje brez Dev Containerja)
```
DATABASE_URL=postgresql://user:password@localhost:5432/parkflow
PORT=3001
```

### `frontend/.env`
```
VITE_API_URL=http://localhost:3001
```

---

## Notes for Map Implementation
- `docs/parking-map.png` is the CAD floor plan — DO NOT modify it
- `docs/spot-coordinates.json` contains SVG coordinates for each spot polygon
- Format: `{ "spots": [{ "number": 1, "points": "x1,y1 x2,y2 x3,y3 x4,y4" }] }`
- The ParkingMap component renders the image as background and SVG polygons on top
- Spot colors: green = free, red = occupied, yellow = reserved
- On click → open SpotCard for that spot

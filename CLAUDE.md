# ParkFlow — Monorepo Guide

## Repo Structure

- `/backend` — Live full-stack API: Express + PostgreSQL (promoted from the former `/jan`)
- `/frontend` — Live React SPA frontend
- `/jakob`, `/jan` — **Archived prototypes, no longer worked on.** Kept for reference only; not in version control as active code.

## Strategic Decision

**The live app lives at the repo root: `/backend` + `/frontend`.** This was promoted from the former `/jan` project — it has the production-critical pieces: real backend, PostgreSQL with migrations, authentication (Authentik SSO + JWT), admin panel, backend tests, and Docker deployment.

`/jakob` and `/jan` are archived; the comparison and porting notes below are kept as historical context for features that originated in the Jakob prototype.

## Comparison

### Jan's advantages

- Full Express REST API (15+ endpoints)
- PostgreSQL with 6 tables, FK constraints, transactions, audit log
- JWT + bcrypt authentication with admin/user roles
- SVG parking map overlaid on real CAD floor plan (zoom/pan/pinch)
- Admin panel for lots, spots, owners
- Multi-lot architecture
- 6 backend test files (Vitest + Supertest)
- Docker Compose deployment
- Dark mode

### Jakob's advantages

- Rich dashboard (occupancy rings, weekly bar charts, live activity feed)
- Smart parking recommendations (scoring algorithm: floor preference, proximity, reliability, EV, compact)
- Analytics/Reports page (floor breakdown, stacked progress bars, utilization metrics)
- Profile page with attendance, preferences, quick stats
- Heatmap view for historical occupancy
- Notification system with popover
- Report problem modal
- More polished UI overall (Mantine components, gradient branding)

## What to Port from Jakob → Jan

### High priority

1. **Dashboard page** — Occupancy overview with ring charts, weekly bar chart, smart suggestions, activity feed
2. **Analytics/Reports page** — Floor breakdown table, utilization metrics, stacked progress bars
3. **Recharts dependency** — For bar charts and progress visualizations

### Medium priority

4. **Smart suggestions algorithm** (`jakob/src/hooks/useSmartSuggestions.ts`) — Adapt scoring logic to use Jan's API data
5. **Activity feed** (`jakob/src/hooks/useActivityFeed.ts` + store) — Wire to Jan's audit log endpoint (`GET /api/changes`)
6. **Profile page** — User profile with preferences (needs backend endpoint)
7. **Heatmap view** — Historical occupancy overlay on Jan's SVG map

### Low priority

8. Booking timeline visualization
9. Notification popover + store
10. Report problem modal

### Do NOT port

- **Mantine dependency** — Rebuild UI concepts using shadcn/ui + Tailwind (Jan's existing stack)
- **Mock data files** — Jan has a real database
- **Grid-based parking map** — Jan's SVG overlay on CAD images is superior
- **pnpm** — Jan uses Bun

## Working Rules

### General

- Never use `any` types — use proper types or `unknown` with narrowing
- Tailwind utility classes only — no separate CSS files
- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: all`
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Mobile-first design — test on mobile viewport first
- Never hardcode secrets — use .env files

### When working in /frontend

- Package manager: **Bun** (never npm/yarn/pnpm)
- **Always run `bun run fix` (from `/frontend/package.json`) after making any code changes to the frontend** — this runs the linter in fix mode and the formatter together

### When working in /backend

- Package manager: **Bun** (never npm/yarn/pnpm)
- Run: `bun run build`, `bun run lint`, `bun run format`, `bun test`

### When working in /jakob (archived — reference only)

- Package manager: **pnpm** (never npm or yarn)
- Read `/jakob/CLAUDE.md` for full rules
- Run: `pnpm build`, `pnpm lint:all`

### When porting features from Jakob to Jan

- Do NOT copy Mantine components — rewrite using shadcn/ui equivalents
- Adapt mock data references to use React Query hooks calling Jan's API
- Maintain Jan's existing patterns (`api/` layer, `hooks/`, `store/` structure)
- Add backend endpoints if the feature needs data Jan doesn't serve yet

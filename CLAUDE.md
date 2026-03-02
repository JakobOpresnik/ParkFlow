# ParkFlow — Monorepo Guide

## Repo Structure

- `/jakob` — Frontend-only SPA (React 19 + Mantine 8 + Tailwind + mock data)
- `/jan` — Full-stack app (React + shadcn/ui + Express + PostgreSQL)
- Each folder has its own CLAUDE.md with detailed rules — always read the subfolder CLAUDE.md when working in that folder

## Strategic Decision

**Use /jan as the base project going forward.** It has the production-critical pieces: real backend, PostgreSQL database with migrations, JWT authentication, admin panel, backend tests, and Docker deployment.

/jakob is a polished frontend prototype with superior UI/UX but no backend. Its best features should be ported into /jan's frontend.

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

### When working in /jan

- Package manager: **Bun** (never npm/yarn/pnpm)
- Read `/jan/CLAUDE.md` for full rules
- Run: `bun run build`, `bun run lint`, `bun run format`, `bun test`

### When working in /jakob

- Package manager: **pnpm** (never npm or yarn)
- Read `/jakob/CLAUDE.md` for full rules
- Run: `pnpm build`, `pnpm lint:all`

### When porting features from Jakob to Jan

- Do NOT copy Mantine components — rewrite using shadcn/ui equivalents
- Adapt mock data references to use React Query hooks calling Jan's API
- Maintain Jan's existing patterns (`api/` layer, `hooks/`, `store/` structure)
- Add backend endpoints if the feature needs data Jan doesn't serve yet

# ParkFlow — Task Board

> **Workflow:** Move tasks to 🔥 In Progress when you start, mark `[x]` and move to ✅ Done when complete.
> Always update this file after each session.

---

## 🔥 In Progress

---

## 📋 Backlog

---

## ✅ Done
- [x] MAP-EDITOR-2: Map editor rewrite — DB-backed coordinates. New `PATCH /api/spots/:id/coordinates` endpoint. `SpotCoordinates` type changed to `{x,y,width,height,rotation,labelPosition}`. `ParkingMap` updated to render `<rect>` with rotation transform instead of `<polygon>`. `MapEditorPage` rewritten with React Query (useLots + useSpots), lot-selector tabs, draw mode saves directly to DB. Two-tab pending sidebar: assign existing unmapped spot or create new spot. Select mode: click existing rect → edit rotation/labelPosition → Save/Remove. All mutations via `usePatchCoordinates`.
- [x] MAP-EDITOR-1: `/map-editor` — SVG canvas (koncan.svg, 792×612) with draw/select mode toggle. Draw rects via click+drag (SVG coordinate conversion via getScreenCTM). Per-rect sidebar: spot number, label position (top/bottom/left/right), rotation (slider + preset buttons + direct input), geometry readout, delete. Floor selector (Zunaj / 1. / 2. nadstropje) with per-floor state. Export → `coords-{floor}.json`. Import JSON back into editor. Corner handles on selection. Auto-switches to Select mode after drawing. Nav item added (PenLine icon).
- [x] MODAL-1: SpotModal Dialog — spot number/label/floor/status, owner info, status buttons, assign owner dropdown + inline create owner form, unassign, book. Replaces SpotCard side panel and AssignOwnerModal. Opens on map click or search result click.
- [x] SEARCH-1: Search highlight — found spot gets pulsing white border on map; auto-switches lot if spot is on a different lot; highlight cleared when search cleared.
- [x] VIEW-1: Map/Grid toggle — Map icon (SVG overlay) and Grid icon (responsive card grid); toggle buttons in MapPage header; mode stored in uiStore; grid click opens SpotModal.
- [x] STATS-1: Audit log — migration 004_audit_log.sql (spot_changes table + indexes); PATCH /owner and PATCH /status routes log changes; GET /api/changes endpoint with optional lot_id filter; non-fatal logging (won't break mutations if table missing).
- [x] STATS-2: Statistics page enhanced — lot filter dropdown (All floors + per lot); summary cards per lot; donut chart + breakdown; audit log table (last 50 changes, time/spot/change/value columns); 15s auto-refresh via React Query.
- [x] MULTI-LOT: Three parking lots (Zunaj, 1. nadstropje, 2. nadstropje) — `parking_lots` table (migration 003), `lot_id` FK on spots, unique constraint per lot. MapPage with lot switcher pill buttons, auto-selects first lot. ParkingMap refactored to use DB coordinates (no static JSON). AdminPage with full CRUD for lots (cards) and spots (table + lot filter). Backend tests: 12 for lots routes + 12 for admin spot CRUD (46 total passing).
- [x] AUTH+BOOKING: JWT auth (admin/admin seed on first start), booking system (reserve free spot, 1 active booking/user, 8h auto-expiry, cancel), /my-bookings page with active + history, Book button on SpotCard, login page, sidebar user info + logout. Backend: 22 Vitest integration tests covering auth middleware, auth routes, and booking routes.
- [x] UI-REFRESH: Brand accent (indigo primary), dark mode toggle via next-themes, improved header (ParkingCircle icon + shadow + underline active nav), StatCards on MapPage, SpotCard shadow-md + colored left border, Lucide icons on empty/error states
- [x] SETUP-0: Dev Container — PostgreSQL container starts healthy, `SELECT 1` returns successfully
- [x] SETUP-1: Frontend (Vite + React + TS + Tailwind v4 + shadcn/ui + TanStack Router + React Query + Zustand + Vitest) and backend (Node + Express + pg) scaffolded; `bun run build` passes with zero errors
- [x] SETUP-2: `001_initial.sql` created with owners + spots schema and seed data (10 spots, 3 owners); migration runs cleanly against container DB
- [x] SETUP-3: `.env` + `.env.example` for backend and frontend; all `.env` files gitignored across root, backend, and frontend
- [x] SETUP-4: Express server complete — `/health` endpoint with DB ping, CORS for localhost:5173/4173, error handler middleware, pg Pool wired up
- [x] BE-1: `GET /api/spots` — all spots with LEFT JOIN owners, ordered by number
- [x] BE-2: `GET /api/spots/:number` — single spot by number, 404 if not found
- [x] BE-3: `PATCH /api/spots/:id/owner` — assign/unassign owner with owner existence check
- [x] BE-4: `PATCH /api/spots/:id/status` — update status with enum validation
- [x] BE-5: `GET /api/owners` — list all owners ordered by name
- [x] BE-6: `POST /api/owners` — create owner with required name validation, returns 201
- [x] BE-7: `PUT /api/owners/:id` — update owner fields using COALESCE (partial updates)
- [x] BE-8: `DELETE /api/owners/:id` — delete owner; spot owner_id nullified via FK cascade
- [x] MAP-1: `docs/map-tool.html` — standalone browser tool to load parking-map.png, click polygon corners per spot, import/export spot-coordinates.json; no build step required
- [x] FE-1: ParkingMap component — SVG polygon overlay on parking-map.png background; colors: green=free, red=occupied, yellow=reserved; click emits onSpotClick; gracefully hides missing image
- [x] FE-2: SpotSearch component — number input with search icon; finds spot by number from cached React Query data; shows SpotCard inline
- [x] FE-3: SpotCard component — spot number, label, floor, status badge, owner name + vehicle plate or "No owner assigned"
- [x] FE-4: AssignOwnerModal — owner dropdown with unassign option, confirm assigns/unassigns via API mutation with toast feedback
- [x] FE-5: React Query polling — `refetchInterval: 15_000` on spots query; map colors update automatically
- [x] FE-6: OwnersPage — table of all owners with add/edit/delete dialogs and delete confirmation
- [x] FE-7: Status toggle — change status directly from SpotCard (free / occupied / reserved)
- [x] UI-1: Responsive layout — map uses aspect-ratio (works without image), grid stacks on mobile, search full-width on mobile
- [x] UI-2: Loading skeleton (aspect-ratio matched), error state with backend hint, empty-spots state; OwnersPage loading + empty states
- [x] UI-3: Toast notifications wired via sonner for all mutations: status change, assign/unassign, add/edit/delete owner

---

## 🗒️ Notes & Decisions
- **DB:** Local PostgreSQL via `pg` library — no external services needed
- **Real-time:** React Query polling every 15s — sufficient for office use, no WebSocket needed
- **Map approach:** SVG overlay on static CAD image — no map library dependency
- **Auth:** None for MVP — internal network only
- **spot-coordinates.json:** Placeholder grid layout (2×5) included in `docs/`; PO replaces `frontend/public/parking-map.png` and re-runs MAP-1 tool to generate real coordinates, then updates `docs/spot-coordinates.json`
- **ESLint:** shadcn/ui components (`src/components/ui/**`) excluded from react-refresh rule — they intentionally export non-component values (CVA variants, etc.)

# Jakob → Jan Uplift Instructions

Purpose: bring the best product UX from Jakob into Jan, while keeping Jan as the full-stack source of truth.

## Ground Rules
- Keep Jan architecture (Express + PostgreSQL + React Query + Zustand + shadcn/ui).
- Do **not** copy Jakob UI library usage (Mantine). Rebuild features using Jan components.
- Prefer backend-derived data over mock JSON.
- Ship in small vertical slices with tests where logic is non-trivial.

## Priority 1 — Smart Suggestions (High ROI)

### Goal
Suggest the best currently-free spot for the signed-in user, with explainable reason tags.

### Why from Jakob
Jakob has high-quality “best spot” UX that improves booking speed and perceived intelligence.

### Implementation in Jan
- Add suggestion endpoint (or derive in frontend from existing APIs):
  - Option A (preferred): `GET /api/spots/suggestions?lot_id=...`
  - Option B: compute client-side in hook from `spots + bookings + change history`
- Rank by weighted score:
  - preferred lot/floor proximity
  - historical availability/reliability
  - distance from frequently used entrance area (if available)
  - EV/accessibility compatibility (if user profile supports it)
- Return top 3 suggestions with reason tags.

### Suggested files
- `backend/src/routes/spots.ts` (new route or query extension)
- `frontend/src/hooks/useSpots.ts` or new `frontend/src/hooks/useSmartSuggestions.ts`
- `frontend/src/pages/MapPage.tsx` (or new Dashboard page section)
- `frontend/src/components/` (new `SmartSuggestions` component)

### Acceptance
- User sees top suggestions in <1s after page load.
- Clicking “Reserve” books the suggested spot through existing booking flow.
- Each suggestion displays at least 1 reason tag.

---

## Priority 2 — Global Search + Cross-Lot Jump

### Goal
Search by spot number, owner name, or user name and jump directly to the relevant lot/spot.

### Why from Jakob
Jakob search is fast and discoverable; Jan currently has map-focused workflows but can improve navigation speed.

### Implementation in Jan
- Add debounced global search in top area (sidebar/header).
- Search domains:
  - spot number / label
  - owner name
  - username/display name (where applicable)
- On select:
  - switch active lot if needed
  - center/highlight spot on map
  - open existing spot modal

### Suggested files
- `frontend/src/components/Layout.tsx` (mount global search)
- `frontend/src/components/SpotSearch/` (extend existing)
- `frontend/src/store/parkingStore.ts` (highlight + lot switch orchestration)
- `frontend/src/pages/MapPage.tsx`

### Acceptance
- Search results appear with debounce and keyboard navigation.
- Selecting a result always opens the right spot in the right lot.

---

## Priority 3 — Live Activity Feed (from real events)

### Goal
Show recent parking activity as an event feed (booking created/cancelled/expired, status changes, owner changes).

### Why from Jakob
Creates an operational “live system” feeling and helps admins monitor usage.

### Implementation in Jan
- Reuse existing `changes` endpoint for status/owner events.
- Extend backend with booking events (insert into audit stream/table).
- Render unified timeline in frontend with relative timestamps.
- Auto-refresh every 15s (same cadence as current polling).

### Suggested files
- `backend/src/routes/bookings.ts` (emit audit entries)
- `backend/src/routes/changes.ts` or DB view/query for unified timeline
- `frontend/src/hooks/useChanges.ts` (or new `useActivityFeed.ts`)
- `frontend/src/components/` (new `LiveActivityFeed`)

### Acceptance
- Feed shows mixed event types in chronological order.
- New booking/cancel action appears in feed within refresh window.

---

## Priority 4 — Dashboard Home (KPI + trends)

### Goal
Create a dedicated dashboard page as default landing route with KPI cards and trend chart.

### Why from Jakob
Jakob’s dashboard improves scanability and stakeholder demos.

### Implementation in Jan
- Add `/dashboard` (or make `/` dashboard and move map to `/map`).
- Include:
  - total / free / occupied / reserved cards
  - occupancy rate
  - per-lot snapshot
  - small trend chart (7-day utilization)
- Keep Stats page for deeper analysis and audit details.

### Suggested files
- `frontend/src/pages/` (new `DashboardPage.tsx`)
- `frontend/src/components/Layout.tsx` (nav update)
- `frontend/src/routeTree.gen.tsx`

### Acceptance
- Dashboard loads without breaking existing map/statistics pages.
- KPI values match current spot dataset.

---

## Priority 5 — Booking UX polish from Jakob

### Goal
Add small UX wins that reduce friction in daily usage.

### Additions
- Better “empty states” with clear next action CTA.
- Quick reserve/cancel actions where context allows.
- Consistent status color semantics across map, cards, stats, and feed.

### Suggested files
- `frontend/src/pages/MyBookingsPage.tsx`
- `frontend/src/components/SpotModal/`
- `frontend/src/pages/MapPage.tsx`

### Acceptance
- No page has a dead-end empty state.
- Booking actions are reachable in <=2 clicks from map context.

---

## Nice-to-Have (Later)
- Spot heatmap/history overlay (if usage history granularity is sufficient).
- Reliability score per spot computed from occupancy volatility.
- Notification center (not just toasts) for unread event summaries.

## Explicitly Do NOT Port Directly
- Mantine-specific component patterns and theme assumptions.
- Mock-data-only flows from Jakob (`attendance.json`, `permanent_spots.json`, etc.).

## Delivery Plan (recommended)
1. Smart Suggestions
2. Global Search + jump/highlight
3. Live Activity Feed
4. Dashboard page
5. Booking UX polish

For each step:
- implement backend/frontend slice
- add/adjust tests for new logic
- run build/lint/tests
- update `TASKS.md`

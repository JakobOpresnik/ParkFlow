# Design: `free spots [building] [date]` — date-aware availability

**Date:** 2026-06-02
**Status:** Approved (pending spec review)
**Area:** RocketChat bot integration + backend availability

## Problem

The bot's `free spots` command already lists free spots across **all** lots
(grouped by building) and accepts an optional building filter
(`free spots klet1`). What it does **not** do is accept a date: it reports only
the live, real-time `spot.status` (`status === 'free'`). There is no way to ask
"which spots are free **tomorrow**?".

Users expect parity with the map view, where picking a day shows per-date
availability. We want:

| Command | Meaning |
| --- | --- |
| `free spots` | all lots, today |
| `free spots tomorrow` | all lots, tomorrow |
| `free spots klet1` | only klet1, today |
| `free spots klet1 tomorrow` | only klet1, tomorrow |
| `free spots tomorrow klet1` | same (token order irrelevant) |

"Free on a date" must mean **real availability** (same notion the booking flow
enforces and the map shows), not just live status.

## Current state (as explored)

- **Bot:** `backend/src/routes/integrations.ts`. `parseCommand` maps
  `free spots` / `free` / `spots` / `available` → `{ command: 'spots', rest }`.
  The `spots` handler takes `rest[0]` as a building filter only; it has **no
  date awareness** and calls `GET /api/spots` (live status).
- **Date parsing:** `parseDate(token, now)` already supports `today`,
  `tomorrow`, `dd.mm.yyyy`, Europe/Ljubljana local time. Reusable as-is.
- **Date-based availability logic already exists in two places:**
  1. `backend/src/routes/bookings.ts` (`POST /api/bookings`) — per-spot boolean
     "is bookable on date", priority: active booking → day override → ACEX pool
     → owner presence → fallback `status`.
  2. `frontend/src/hooks/useEffectiveSpots.ts` — per-date effective status for
     the whole map, richer statuses (`free`/`occupied`/`reserved`/`spotted`/
     `unconfirmed`), priority: active booking → override → presence → fallback.
- **The three data-source endpoints the map uses already exist:**
  `GET /api/spots`, `GET /api/presence?date=YYYY-MM-DD`,
  `GET /api/spots/day-overrides?date=YYYY-MM-DD`.
- The bot is backend TypeScript and **cannot import the React hook**, so the
  rule set must be expressed in backend code.

## Decisions

1. **Meaning of "free" on a date:** real availability — a spot is free when its
   effective status for that day is `free`. Every other effective status
   (`occupied`, `reserved`, `spotted`, `unconfirmed`) counts as not free.
2. **Where the logic lives:** a new backend endpoint
   `GET /api/spots/availability?date=…`, backed by a pure helper that ports the
   `useEffectiveSpots` rules. The bot calls this single endpoint. The logic
   lives once in the backend and can later be adopted by the frontend to remove
   the duplication (out of scope here).
3. **Timesheet failure handling (graceful degradation):** if the external
   presence API fails, owner-occupied spots that depend on presence are treated
   as **not free** (no false positives). Override / ACEX / plain-free spots are
   still computed. The response flags `presence_ok: false` and the bot appends a
   "list may be incomplete" note.

## Design

### 1. Backend: availability helper + endpoint

**`backend/src/lib/availability.ts`** — pure, side-effect-free:

```
computeAvailability(spots, presence, overrides, date, { presenceOk }) =>
  Array<{ id, number, lot_id, label, available: boolean }>
```

A faithful port of the priority logic in `useEffectiveSpots.ts`, reduced to a
boolean `available = (effectiveStatus === 'free')`:

1. **Active booking** on `date` (`active_booking_expires_at` date === `date`) →
   not free.
2. **Day override** (`spot_day_status` for the date) → authoritative
   (`free` → free, `occupied` → not free).
3. **Owner presence** (timesheet for the date):
   - Single owner: in office → not free; absent → free.
   - Shared (`a / b`): 0 in-office → free; 1 → not free; 2+ → `unconfirmed` →
     not free.
   - If `presenceOk === false`, any spot that would need presence to decide →
     not free.
4. **Fallback** → `spot.status === 'free'`.

(`spotted` reports layer onto the frontend's status; for availability they make
a spot not free — they never make it free — so we fold them into "not free".)

**`GET /api/spots/availability?date=YYYY-MM-DD` (optional `&lot_id=`):**

- Validate `date` against `^\d{4}-\d{2}-\d{2}$` (400 otherwise), mirroring the
  existing `day-overrides` endpoint.
- Load the same three sources the map uses: spots (optionally filtered by
  `lot_id`), `presence?date=`, `day-overrides?date=`. Presence failure is caught
  and surfaced as `presence_ok: false` rather than failing the request.
- Run `computeAvailability` and respond:
  `{ spots: [{ id, number, lot_id, label, available }], presence_ok }`.

### 2. Bot: parser + handler

- In the `spots` handler, classify each `rest` token: try `parseDate` first; if
  it yields a valid date, it's the date; otherwise try `resolveLot`; if neither,
  reply with the existing friendly "unknown building" guidance.
- Token order is irrelevant (`klet1 tomorrow` === `tomorrow klet1`).
- No date token → today (preserves current behaviour).
- Handler calls `GET /api/spots/availability?date=…[&lot_id=…]`, filters
  `available === true`, and formats the result.

### 3. Output

Reuse existing formatting (`formatFreeSpotsByBuilding`, single-lot path), adding
the date to the header, e.g. `Prosta mesta za 3.6.2026 (4):` followed by the
per-building grouping. Today may render without an explicit date. When
`presence_ok === false`, append:
`⚠️ Seznam je morda nepopoln — lastniških mest trenutno ne morem preveriti.`

## Error handling

- Invalid date token in chat → friendly message listing accepted formats
  (`today`, `tomorrow`, `dd.mm.yyyy`).
- Unknown building token → existing guidance (`zunaj, klet1, klet2`).
- Endpoint `date` validation failure → 400.
- Presence API failure → degrade gracefully (see decision 3), never 500 the
  whole listing.

## Testing

- **Unit — `computeAvailability`:** all branches (booking, override free/occupied,
  ACEX, single-owner present/absent, shared 0/1/2+), plus the `presenceOk:false`
  degradation path.
- **Unit — parser:** date+building in either order, date only, building only,
  unknown token.
- **Route — `GET /api/spots/availability`:** override / active booking / ACEX /
  presence-failure (mocked presence), with and without `lot_id`.
- **E2e (loopback) — bot:** `free spots tomorrow`, `free spots klet1 tomorrow`,
  `free spots tomorrow klet1`, and an unknown token.

## Out of scope

- Migrating `frontend/src/hooks/useEffectiveSpots.ts` to consume the new
  endpoint (a follow-up that would remove the frontend/backend duplication).
- Refactoring `bookings.ts` to share the new helper.
- Any change to live (`today`) behaviour beyond routing through the new
  endpoint.

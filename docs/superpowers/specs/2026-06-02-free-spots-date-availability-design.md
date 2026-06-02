# Design: `free spots [building] [date]` — date-aware availability

**Date:** 2026-06-02
**Status:** Approved (revised — reuse path)
**Area:** RocketChat bot integration (`backend/src/routes/integrations.ts`)

## Problem

The bot's `free spots` command lists free spots across **all** lots (grouped by
building) and accepts an optional building filter (`free spots klet1`). What it
does **not** do is accept a date: it reports only the live `spot.status`
(`status === 'free'`). There is no way to ask "which spots are free
**tomorrow**?".

Users expect parity with the map view, where picking a day shows per-date
availability. We want:

| Command | Meaning |
| --- | --- |
| `free spots` | all lots, today |
| `free spots tomorrow` | all lots, tomorrow |
| `free spots klet1` | only klet1, today |
| `free spots klet1 tomorrow` | only klet1, tomorrow |
| `free spots tomorrow klet1` | same (token order irrelevant) |

"Free on a date" means **real availability** (the same notion the map shows and
the booking flow enforces), not just live status.

## Current state (as explored)

The `owners` command (shipped immediately before this spec) **already built the
date-aware availability machinery this feature needs.** There is nothing new to
design at the logic layer — only a second consumer to wire up.

- **Availability helper already exists:** `isSpotAvailableOnDate(spot, date,
  overrideStatus, isOwnerAbsentOnDate)` in `integrations.ts:407`. It implements
  the full priority chain:
  1. Active booking for `date` → not free.
  2. Per-day override (`spot_day_status`) → authoritative (`free`/`occupied`).
  3. ACEX public pool (`ACEX_OWNER_NAME`) → free.
  4. Owned spot → free only when **every** co-owner is absent that day; if
     presence is unknown for any co-owner, fall back to the spot's stored
     `status`.
  5. Unowned spot → stored `status`.
  Shared-spot ambiguity collapses correctly to the boolean: 0 owners in office →
  free; 1 or 2+ in office → not free.
- **The composition recipe already exists** in the `owners` handler
  (`integrations.ts:750`): it fetches `/api/spots`, `/api/lots`,
  `/api/spots/day-overrides?date=`, `/api/presence?date=` in parallel, builds
  `overrideBySpot` and `isOwnerAbsentOnDate` (returns `null` when presence is
  down), and applies the helper.
- **Date parsing already exists:** `parseDate(token, now)` supports `today`,
  `tomorrow`, `dd.mm.yyyy` (Europe/Ljubljana), returns today for `undefined`,
  and `null` for an unrecognised token (e.g. a building name like `klet1`).
  `resolveLot(token, lots)` resolves building aliases (`zunaj`, `klet1`, …).
  `dayLabel(date, now)` renders `today` / `tomorrow` / `DD.MM.YYYY`.
- **The helper is already unit-tested** across all branches in
  `integrations.routes.test.ts:515` (owned away/present, shared, override
  free/occupied, presence-unknown fallback).

## Decisions

1. **Reuse, don't rebuild.** No new endpoint and no new `lib/` file. The `spots`
   handler mirrors the `owners` handler and reuses `isSpotAvailableOnDate`. This
   was chosen over the originally-drafted `GET /api/spots/availability` +
   `lib/availability.ts`: that logic already lives in backend code and has no
   second (non-bot) consumer today (YAGNI). Extraction to `lib/` can happen
   later if/when another consumer appears.
2. **Meaning of "free" on a date:** `isSpotAvailableOnDate(...) === true`.
3. **Today routes through the same path.** Bare `free spots` is treated as
   `free spots today`: it now fetches presence + overrides and is presence-aware,
   matching the map and the `owners` command. One code path, no divergence
   between `free spots` and `free spots today`. (Trade-off: two extra parallel
   GETs on the most common command — negligible.)
4. **Output language: English**, matching the rest of the bot
   (`Free spots — tomorrow (4):`), not the Slovenian originally drafted.
5. **Presence-down handling:** owned spots fall back to stored status (usually
   `occupied` → excluded), exactly as the shared helper already does. **Net-new:**
   when the presence call did not return 200, append an English warning so the
   degraded list is honest.

## Design

All changes land in `backend/src/routes/integrations.ts` and its tests.

### 1. Token classification (`spots` handler, order-independent)

Iterate over `rest`:

- The first token for which `parseDate(token, now)` is non-null is the **date**.
- Otherwise, the first token that `resolveLot(token, lots)` matches is the
  **building** filter.
- Any token that is neither a date nor a known building → reply with combined
  guidance (accepted date formats + `zunaj, klet1, klet2`).
- No date token → today (`parseDate(undefined)`).

So `free spots klet1 tomorrow` ≡ `free spots tomorrow klet1`. Building
classification needs the lots list, which the handler already fetches.

### 2. Availability composition (mirror the `owners` handler)

Fetch in parallel:

- `GET /api/spots` (+ `?lot_id=<lot.id>` when a building filter is present),
- `GET /api/lots`,
- `GET /api/spots/day-overrides?date=<date>`,
- `GET /api/presence?date=<date>`.

Build `overrideBySpot` (spot_id → status), `isOwnerAbsentOnDate(name)` (returns
`null` when presence is unavailable), and:

```
isAvailable(s) = isSpotAvailableOnDate(s, date, overrideBySpot.get(s.id), isOwnerAbsentOnDate)
```

### 3. Filter + format

`const available = spots.filter(isAvailable)`, then reuse the two existing
output shapes:

- **Building filter present** → single-lot line
  (`<lot.name> — Free spots (N): …`).
- **No building filter** → grouped-by-building.

Repurpose `formatFreeSpots` / `formatFreeSpotsByBuilding` so they group an
**already-filtered** list (drop their internal `status === 'free'` filter) and
accept a `when` label for the header, rendered via `dayLabel(date, now)`:
`Free spots — tomorrow (4):`. `dayLabel` yields `today` for today, so the
today path renders naturally. The old direct `status === 'free'` callers are
replaced by this path.

### 4. Presence-down warning

When the `/api/presence` response status ≠ 200 (presence resolved to `null`),
append after the listing:

```
⚠️ List may be incomplete — I couldn't check owner spots right now.
```

### 5. Help text

Update `HELP_TEXT` to document `free spots [building] [date]` with examples
(`free spots tomorrow`, `free spots klet1 tomorrow`).

## Error handling

- Unrecognised token (neither date nor building) → friendly combined guidance
  listing accepted date formats (`today`, `tomorrow`, `dd.mm.yyyy`) and building
  names (`zunaj, klet1, klet2`).
- Presence API failure → graceful degradation per decision 5 (stored-status
  fallback + warning line); never fail the whole listing.

## Testing

- **Parser / classification (unit):** date+building in either order, date only,
  building only, unknown token.
- **Handler (loopback e2e):** `free spots tomorrow`, `free spots klet1 tomorrow`,
  `free spots tomorrow klet1`, unknown token, and the presence-down warning
  (mocked presence failure).
- **Already covered (no new work):** `isSpotAvailableOnDate` branch coverage
  exists in `integrations.routes.test.ts`.

## Out of scope

- A `GET /api/spots/availability` endpoint and a `lib/availability.ts` extraction
  (deferred until a non-bot consumer needs it).
- Migrating `frontend/src/hooks/useEffectiveSpots.ts` to a shared backend source
  (would remove frontend/backend duplication; separate follow-up).
- Refactoring `bookings.ts` to share the helper.

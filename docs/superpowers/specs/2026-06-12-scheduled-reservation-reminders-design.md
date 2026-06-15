# Scheduled reservation reminders — Design

**Date:** 2026-06-12
**Status:** Proposed (pending spec review)
**Author:** Jan Sernec (with Claude)

## Problem

ParkFlow only notifies users *reactively* — today the single proactive
notification is "your reservation was released" when an owner reclaims a spot
(`reservation_released`, written in the cancel transaction at
`backend/src/routes/bookings.ts`). Nothing reminds a user about their *own*
reservation. We want a **scheduled, time-driven reminder**:

- A **morning** reminder — "you have a reservation today" — sent once each morning
  to users who hold an active booking for that day.

This must reuse the existing notification infrastructure (the `notifications`
table, the in-app bell, and the best-effort RocketChat DM push) rather than
inventing a parallel delivery path. Users must be able to turn the reminder
on/off, and — because the sender runs server-side — that preference must
live **in the database**, not only in the browser (the current
`notifyOnBooking` / `notifyOnAvailability` switches are localStorage-only and
invisible to the server).

The design is built around a **reminder catalog**, so additional reminder types
(e.g. an ending-soon warning) are a one-line catalog edit plus a ticker rule —
deferred from v1 (see Out of scope) but explicitly cheap to add later.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Reminder types in v1 | **`reservation_today` (morning) only** |
| Morning send time | Owned by the cron schedule `35 7 * * 1-5` (07:35 local, Mon–Fri). `REMINDER_MORNING_TIME` (07:30) stays as a backend gate so an off-hours manual trigger can't fire before the morning window. |
| Weekends | Handled by the cron schedule (`1-5` = Mon–Fri) — no Sat/Sun runs. No separate weekend flag. |
| `reservation_ending` (pre-expiry) | **Deferred** — no "extend booking" action exists (verified: bookings only support create/cancel), so an expiry warning has no actionable follow-up. Catalog-ready for later. |
| Scheduler mechanism | **Docker cron service → token-gated `POST /api/internal/reminders/run`**, which calls `runReminderTick()`. No in-process timer. |
| Multi-instance safety | Postgres advisory lock inside `runReminderTick` (also guards double/overlapping triggers) |
| Default state | **ON (opt-out)**: default-on (absent `notification_prefs` row = enabled). A once-a-day morning DM is low-frequency and useful; opt-in would mean near-zero adoption. |
| Preferences storage | Server-side `notification_prefs` table |
| Preferences writers | Both: in-app Settings UI **and** bot command `/reminders` |
| Settings UI model | A **catalog**-driven list — backend defines reminder types, UI lists them |
| Old client-only switches | **Removed** — `notifyOnBooking` / `notifyOnAvailability` deleted; only the new server-backed "Reminders" section remains |
| Delivery channel | Reuse existing dual path: `notifications` row (in-app bell) + best-effort RocketChat DM |
| Notification / DM copy | English, single-language (matches existing `reservation_released`) |
| Settings UI labels | Via existing i18n (`src/i18n/locales/en.ts` + `sl.ts`), keyed by reminder type |

### Out of scope (deliberate)

- **`reservation_ending` (ending-soon) reminder** — deferred. The catalog and the
  ticker's per-rule structure make it a small follow-up: add the catalog entry, a
  second selection rule (`expires_at` within a lead window), copy, and i18n. Worth
  revisiting only if/when an "extend booking" action exists to act on.
- Email / SMS / push-notification channels — RocketChat DM + in-app bell only.
- A "you have **no** reservation today" nudge and owner-side "your spot is free
  today" reminder — considered and dropped from v1.
- Per-user custom reminder *times* (everyone shares the configured morning time).
  Only on/off is user-configurable in v1.
- Recurring / multi-day bookings — bookings are single-day (`expires_at`), so a
  reminder is per booking row.

## Behavior

A single ticker runs every `REMINDER_TICK_MINUTES` (default 15). Each tick, under
an advisory lock, evaluates the morning-reminder rule against currently-active
bookings and, for every match where the user hasn't opted out, writes a
`notifications` row and fires a best-effort RocketChat DM (exactly the existing
`reservation_released` delivery pattern).

### Morning reminder (`reservation_today`)

Fires on the **first tick at/after the morning time** (07:30 local), once per
booking:

- booking `status = 'active'`, and
- its `booking_date` (the authoritative local day, a `DATE` column added in
  `025_booking_date.sql`) equals **today** in `REMINDER_TZ`, and
- today is a weekday when `REMINDER_SKIP_WEEKENDS` is enabled (default) —
  Sat/Sun produce no reminders, and
- local time now `>=` `REMINDER_MORNING_TIME`, and
- the booking was created **before** today's morning time
  (`booked_at < today@MORNING_TIME`) — so booking a spot at 10:00 for today does
  *not* immediately trigger a "reminder", since the user obviously just made it,
  and
- no `reservation_today` notification already exists for this `booking_id`.

Because the ticker is not clock-aligned, the actual send lands somewhere in
`[MORNING_TIME, MORNING_TIME + TICK_MINUTES]` (≈ 07:30–07:45 with the default
15-minute tick) — close enough for a morning heads-up.

Notes:

- Applies to all active bookings regardless of `booked_by_owner` or `starts_at`
  (a time-based booking still "happens today").
- `expireStaleBookings()` already flips past-due bookings to `expired`; the
  ticker only ever looks at `status='active'`, so it never reminds about an
  expired one.

## Data model

New migration — `backend/migrations/026_notification_prefs.sql` (025 is taken by
`025_booking_date.sql` from the rebased `critical-audit-fixes` work):

```sql
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id       TEXT NOT NULL,          -- == bookings.user_id == RC handle == SSO preferred_username
  reminder_type TEXT NOT NULL,          -- one of the catalog types, e.g. 'reservation_today'
  enabled       BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reminder_type)
);
```

**Default-on semantics (opt-out):** the absence of a row means *enabled*. Only an
explicit `enabled = false` row opts a user out of that type. The ticker sends
unless it finds a `false` row for `(user_id, reminder_type)`.

The existing `notifications` table (`backend/migrations/024_notifications.sql`)
is **unchanged**. Reminders are written with new `type` values and reuse
`title` / `body` / `data` / `pushed_at`. `data` carries
`{ booking_id, spot_id, spot_label, expires_at }`. Idempotency keys off
`type` + `data->>'booking_id'`.

## Reminder catalog (single source of truth)

`backend/src/lib/reminders.ts` exports the catalog consumed by the API, the
ticker, and the bot — adding a new reminder type is a one-line edit here:

```ts
export const REMINDER_TYPES = [
  {
    type: 'reservation_today',
    label: 'Morning reminder',
    description: 'Notify me in the morning when I have a reservation today.',
  },
  // Future: { type: 'reservation_ending', label: 'Expiry warning', ... }
] as const

export type ReminderType = (typeof REMINDER_TYPES)[number]['type']
```

v1 ships exactly one type. A deferred type (e.g. `reservation_ending`) is added by
uncommenting/extending this array **and** adding its ticker rule, copy, and i18n —
never listed in the catalog before the ticker can actually send it, so Settings
never shows a dead toggle.

## Scheduler

`backend/src/lib/reminderScheduler.ts`:

- `startReminderScheduler()` — no-op if `REMINDERS_ENABLED` is false. Otherwise
  schedules `setInterval(runReminderTick, REMINDER_TICK_MINUTES * 60_000)` and
  runs one tick shortly after boot. Mirrors the timer style of
  `backend/src/lib/timesheetWs.ts`. Called from `backend/src/index.ts` after
  `runMigrations()` (alongside `startTimesheetWs()`).
- `runReminderTick(now = new Date())` — `now` is injectable so tests pin the
  clock. Steps:
  1. Acquire a dedicated pool client and `SELECT pg_try_advisory_lock($KEY)`. If
     it returns false, another tick/instance holds it → log and return. (Lock
     must be acquired and released on the **same** client.)
  2. Run the morning-reminder selection query (parameterized by `now` and the env
     config), LEFT JOINed against `notifications` so already-reminded bookings are
     excluded in SQL.
  3. For each candidate, skip if `notification_prefs` has `enabled=false` for
     `(user_id, type)`.
  4. Insert the `notifications` row, then `await pushChatMessage(user_id, body)`
     (`backend/src/lib/rocketchatNotify.ts`); on success set `pushed_at`.
  5. `pg_advisory_unlock($KEY)`, release the client.
- Wrapped in try/catch; a failure on one booking is logged and does not abort the
  rest of the batch or crash the process.

Timezone handling is done in SQL via `AT TIME ZONE 'Europe/Ljubljana'` for the
"today" date and the morning-time comparison.

### Configuration (env, with defaults)

| Var | Default | Meaning |
| --- | --- | --- |
| `REMINDER_TRIGGER_TOKEN` | _(required)_ | Shared secret the cron service sends as `X-Reminder-Token`; the endpoint rejects mismatches with 401 |
| `REMINDER_TZ` | `Europe/Ljubljana` | Timezone for the "today" date + morning gate |
| `REMINDER_MORNING_TIME` | `07:30` | Local `HH:MM` gate — `runReminderTick` no-ops before this time |

The schedule (07:35, Mon–Fri) lives in the cron service's crontab, not in backend env.

Added to `backend/.env.example`.

## Regression risk & guards

The feature is mostly additive (new table, new endpoints, new bot command, new UI
section), so blast radius is small. The three places that could actually break
something — all on the ticker — must be handled explicitly:

1. **No pool-client leak.** The tick acquires a dedicated client from the pool for
   the advisory lock. It **must** `release()` the client and `pg_advisory_unlock`
   in a `finally`, even on error — otherwise repeated failures drain the
   connection pool and starve *all* DB queries app-wide. This is the single most
   important invariant.
2. **No auto-start under test.** `startReminderScheduler()` must be a no-op when
   `NODE_ENV === 'test'` (and gated by `REMINDERS_ENABLED`), so the Supertest app
   boot doesn't fire ticks that mutate `notifications` and flake the existing
   notification tests. Tests call `runReminderTick(now)` directly.
3. **No unhandled rejection.** The scheduled async call is `.catch()`-guarded and
   the tick body is wrapped in try/catch, so a failing tick logs and continues
   instead of crashing the Node process (which would take the API down with it).

## API

New endpoints on the existing notifications router
(`backend/src/routes/notifications.ts`), `requireAuth`, non-guest:

- `GET /api/notifications/prefs` →
  ```json
  {
    "catalog": [{ "type": "reservation_today", "label": "...", "description": "..." }],
    "prefs": { "reservation_today": true }
  }
  ```
  `prefs` merges the catalog with the user's `notification_prefs` rows,
  defaulting absent types to `true`.
- `PUT /api/notifications/prefs/:type` body `{ "enabled": boolean }` → upserts one
  `notification_prefs` row (`ON CONFLICT (user_id, reminder_type) DO UPDATE`).
  Rejects a `:type` not in the catalog with 400.

## Bot command

In the RocketChat command router (`backend/src/routes/integrations.ts`), add
`/reminders`, mapping the inbound `user_name` → `user_id`:

- `/reminders` — lists each catalog type and its on/off state for the user.
- `/reminders off <type|all>` / `/reminders on <type|all>` — upserts the same
  `notification_prefs` rows the UI writes. Documented in
  `docs/rocketchat-commands.md`.

## Frontend

- **Remove** the localStorage-only switches `notifyOnBooking` /
  `notifyOnAvailability`. Verified (grep) they have **no functional consumer** —
  only the ProfilePage display cluster reads them; `SpotModal`, `MapPage`, and
  `OwnerParkingPage` use only `arrivalTime` / `reservationDuration` /
  `preferredLotId`. Remove: the props/rows in
  `frontend/src/pages/ProfilePage/PreferencesCard.tsx`, the wiring in
  `index.tsx` + `useProfilePage.ts`, the two fields + setters in
  `frontend/src/store/prefsStore.ts` (keep the other three fields), and the
  `profile.notifyOnBooking*` / `profile.notifyOnAvailability*` keys in
  `src/i18n/locales/en.ts` + `sl.ts`. Stale localStorage keys are harmless.
- **Add** a server-backed "Reminders" section in `PreferencesCard.tsx` that
  **renders the catalog from the API** — one `PreferenceRow` + `<Switch>`
  (`frontend/src/components/ui/switch.tsx`) per reminder type. A new type added to
  the backend catalog appears here automatically.
- **i18n:** the app is bilingual (EN/SL). The backend catalog provides the
  machine `type` (and English `label`/`description` for the bot); the **UI labels
  are rendered via i18n keyed by reminder type** (`profile.reminders.<type>.*`),
  added to both `en.ts` and `sl.ts`. So Slovenian users get Slovenian setting
  labels even though the catalog ships English text for the bot.
- New `frontend/src/api/index.ts` calls `getNotificationPrefs()` /
  `setNotificationPref(type, enabled)` and a `frontend/src/hooks/useNotificationPrefs.ts`
  (query + mutation with `queryClient.invalidateQueries`), following the
  `useNotifications` pattern. Toggling a switch fires the PUT and optimistically
  updates / invalidates the query.
- Types added to `frontend/src/types/index.ts`.

## Copy (English)

- `reservation_today` — title `Reservation today`; body
  `You have a reservation today for {spot_label} ({floor}).`
- DM body is the notification body (matching the `⚠️ {body}` prefix convention
  used for `reservation_released`).

These stored `title`/`body` strings are **single-language English** (the row is
written once, server-side, with no per-user locale) — same as the existing
`reservation_released`. Only the Settings UI labels are localized (see Frontend /
i18n above).

## Edge cases

- **Booked after the morning time for today** → no morning reminder (guarded by
  the `booked_at < today@MORNING_TIME` condition).
- **Server restart mid-day** → the morning reminder still fires on the first tick
  after boot if it's past the morning time and no row exists yet; the existence
  check prevents duplicates across restarts.
- **`ROCKETCHAT_INCOMING_WEBHOOK_URL` unset / DM fails** → the `notifications`
  row is still written (`pushed_at` stays null), so the in-app bell shows it and
  the bot-`status` fallback can surface it. Same semantics as `reservation_released`.
- **User opts out after a row was already written** → no retroactive deletion;
  the opt-out only prevents *future* sends.
- **Multiple active bookings for one user/day** → each booking is reminded
  independently (keyed by `booking_id`).
- **First deploy burst** → on the first tick after go-live, every currently
  active booking for today (if it's already past the morning time) gets a one-time
  DM. Mitigation: deploy before `REMINDER_MORNING_TIME`, or accept the single
  burst (one DM per user with a booking today). Not a correctness bug; the
  idempotency check prevents any repeat.

## Testing (TDD)

Backend (Vitest + Supertest, tests first), with `runReminderTick(now)` given a
pinned `now` against a seeded test DB:

- Morning rule: an active booking for today, booked yesterday, with no prior row,
  `now` past the morning time → one `reservation_today` notification created; a
  second tick creates nothing (idempotent).
- Morning rule, time gate: `now` before the morning time → nothing sent.
- Morning rule negative: booking created today after the morning time → no
  reminder.
- Prefs respected: `notification_prefs` row `enabled=false` for `reservation_today`
  → not sent; absent row (default-on) → sent.
- `GET /api/notifications/prefs` returns catalog + defaults (absent = true);
  `PUT .../prefs/:type` upserts; unknown type → 400; guest blocked.
- Advisory lock: a second concurrent tick acquires no lock and sends nothing.
- DM push mocked: success sets `pushed_at`; failure logs, does not throw, leaves
  the row intact.

Frontend:

- Reminders section renders one switch per catalog type with the correct initial
  state from the API; toggling fires the PUT and reflects the new state.
- The removed `notifyOnBooking` / `notifyOnAvailability` switches are gone.

Run: `bun run build`, `bun run lint`, `bun test` (backend); `bun run fix`
(frontend).

## Docs

No `BUSINESS_RULES.md` versioned system in this repo, so the rule is recorded
here (design doc of record). The new `/reminders` bot command is added to
`docs/rocketchat-commands.md`.

## Files

**Backend:** `migrations/026_notification_prefs.sql`, `src/lib/reminders.ts`
(catalog), `src/lib/reminderScheduler.ts` (ticker + tick), `src/routes/notifications.ts`
(prefs GET/PUT), `src/routes/integrations.ts` (`/reminders` command), `src/index.ts`
(start ticker), `.env.example`, tests.

**Frontend:** `src/api/index.ts`, `src/hooks/useNotificationPrefs.ts`,
`src/pages/ProfilePage/PreferencesCard.tsx` (+ `useProfilePage.ts`, `store/prefsStore.ts`
cleanup), `src/types/index.ts`.

**Docs:** `docs/rocketchat-commands.md`.

---

## Amendment (2026-06-12): rebased onto `critical-audit-fixes`

The branch was rebased onto `origin/main` (`e320b7e`), which merged the
`critical-audit-fixes` work. Two changes there affect this design:

1. **Migration numbering** — `025_booking_date.sql` now exists, so this feature's
   migration is **`026_notification_prefs.sql`** (was 025).
2. **`booking_date` column** — bookings now carry an authoritative local-day
   `DATE` (`booking_date`), and day-keyed logic across the bot/frontend was
   re-pointed from `expires_at::date` (which mis-rolls across UTC midnight) to
   `booking_date`. The morning-reminder "is this booking for today?" test
   therefore uses `b.booking_date = (now AT TIME ZONE $tz)::date` rather than
   deriving the day from `expires_at`. The "booked before the morning window"
   guard still uses `booked_at` (a timestamptz), and the morning-time gate is
   unchanged.

## Amendment (2026-06-12): scheduler mechanism → Option B (Docker cron + endpoint)

After implementing the in-process ticker, we switched the **trigger** mechanism
(the *logic* — `runReminderTick()` — is unchanged):

- **Removed** the in-process `setInterval` timer (`startReminderScheduler` /
  `stopReminderScheduler`) and the boot wiring in `index.ts`.
- **Added** a token-gated `POST /api/internal/reminders/run`
  (`backend/src/routes/internal.ts`, mounted at `/api/internal`): it checks an
  `X-Reminder-Token` header against `REMINDER_TRIGGER_TOKEN` (401 on mismatch),
  then `await runReminderTick(new Date())` and returns `{ ok: true }`. Same
  token pattern as the existing RocketChat webhook.
- **Added** a `reminders-cron` service to `docker-compose.yml` (a tiny image
  whose crontab is `35 7 * * 1-5`, TZ Europe/Ljubljana) that `curl`s the
  endpoint over the internal Docker network with the token header.
- **Weekends** are handled by the cron schedule (`1-5`); no `REMINDER_SKIP_WEEKENDS`.
- **Env (final):** `REMINDER_TRIGGER_TOKEN` (new, required), `REMINDER_TZ`,
  `REMINDER_MORNING_TIME` (kept as a defense gate). Dropped `REMINDERS_ENABLED`,
  `REMINDER_TICK_MINUTES`, `REMINDER_SKIP_WEEKENDS`.
- The advisory lock stays in `runReminderTick` (guards double/overlapping
  triggers); the morning-time gate stays so an off-hours manual `curl` can't
  fire before 07:30. Schedule + weekday selection now live in the crontab.

Why: a single tiny morning job doesn't need an always-on timer; an explicit cron
schedule is more ops-visible, and the logic stays in the backend (Celery /
BullMQ / a separate worker would be overkill — no broker or job queue needed).

**Verified (2026-06-15) — cron timezone:** an empirical test reproducing the exact
`reminders-cron` setup (`alpine:3.20` + `-e TZ=Europe/Ljubljana` + `apk add tzdata`
+ busybox `crond`) confirmed busybox `crond` schedules in **local time** — a job set
for the current Ljubljana clock minute fired at that wall-clock instant (10:19:00
CEST), not 2h later. So `35 7 * * 1-5` = 07:35 Ljubljana, with DST handled
automatically by tzdata. **Residual dependency:** the container's `apk add tzdata`
must succeed at startup (needs network to the apk repo); if it can't, musl
`localtime` falls back to UTC (times 1–2h off). To eliminate that, bake `tzdata`
into a prebuilt image instead of installing at start.

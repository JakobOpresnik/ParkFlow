# Morning Reservation Reminder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send each user a once-a-day "you have a reservation today" reminder at 07:30 (in-app notification + best-effort RocketChat DM), reusing the existing notification path, with a per-user server-side on/off preference editable from Settings and the bot.

**Architecture:** An in-process `setInterval` ticker (started on boot like `startTimesheetWs`) runs every 15 min; under a Postgres advisory lock it selects active bookings due for a morning reminder (all time/date/dedup/opt-out filtering done in one SQL query, DST-safe via `AT TIME ZONE`), inserts a `notifications` row, and fires a best-effort DM. A catalog (`lib/reminders.ts`) is the single source of truth for reminder types, consumed by the ticker, the `/api/notifications/prefs` endpoints, and the `/reminders` bot command. The frontend lists the catalog with per-type switches.

**Tech Stack:** TypeScript, Express 5, PostgreSQL (`pg`), Vitest + Supertest (backend, **mocks the pool** — no real DB in tests); React + React Query + Zustand + i18next + Tailwind/shadcn (frontend). Package manager: Bun. Runtime: Node (`node --import tsx/esm`).

**Conventions:** Prettier `semi:false, singleQuote:true` for new lib files; existing files (e.g. `notifications.ts`, `index.ts`, `integrations.ts`) use semicolons + double quotes — match the file you edit, and the format step normalizes either way. Every commit message ends with the trailer:
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

**Backend (create):**
- `backend/migrations/026_notification_prefs.sql` — new opt-out table (025 is taken by `025_booking_date.sql`).
- `backend/src/lib/reminders.ts` — reminder-type catalog (single source of truth).
- `backend/src/lib/reminderScheduler.ts` — ticker + `runReminderTick(now)`.
- `backend/src/__tests__/reminderScheduler.test.ts` — orchestration + SQL-shape tests.

**Backend (modify):**
- `backend/src/routes/notifications.ts` — add `GET /prefs` + `PUT /prefs/:type`.
- `backend/src/__tests__/notifications.routes.test.ts` — prefs endpoint tests.
- `backend/src/index.ts` — start the scheduler on boot.
- `backend/src/routes/integrations.ts` — `reminders` command (parser + handler) + HELP_TEXT.
- `backend/src/__tests__/integrations.routes.test.ts` — `parseCommand('reminders …')` test.
- `backend/.env.example` — new env vars.
- `docs/rocketchat-commands.md` — document `/reminders`.

**Frontend (create):**
- `frontend/src/hooks/useNotificationPrefs.ts` — query + mutation hooks.
- `frontend/src/pages/ProfilePage/RemindersSection.tsx` — catalog-driven switch list.

**Frontend (modify):**
- `frontend/src/types/index.ts` — `ReminderTypeDef` + `NotificationPrefs`.
- `frontend/src/api/index.ts` — `getNotificationPrefs` / `setNotificationPref`.
- `frontend/src/pages/ProfilePage/PreferencesCard.tsx` — render reminders, drop old switches.
- `frontend/src/pages/ProfilePage/useProfilePage.ts` — drop notify fields.
- `frontend/src/pages/ProfilePage/index.tsx` — drop notify props.
- `frontend/src/store/prefsStore.ts` — drop `notifyOnBooking` / `notifyOnAvailability`.
- `frontend/src/i18n/locales/en.ts` + `sl.ts` — drop old keys, add `reminders` block.

---

## Task 1: Migration — notification_prefs table

**Files:**
- Create: `backend/migrations/026_notification_prefs.sql` (025 is taken by `025_booking_date.sql`)

- [ ] **Step 1: Create the migration file**

```sql
-- 026_notification_prefs.sql
-- Per-user opt-out for scheduled reminder types. Absence of a row = enabled
-- (default-on). user_id matches bookings.user_id / notifications.user_id
-- (== preferred_username == RocketChat handle, same SSO).
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id       TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reminder_type)
);
```

- [ ] **Step 2: Verify it parses as part of the build**

Run: `cd backend && bun run build`
Expected: PASS (tsc compiles; the SQL file is applied at runtime on next boot by `runMigrations()`).

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/026_notification_prefs.sql
git commit -m "feat(reminders): add notification_prefs table"
```

---

## Task 2: Reminder catalog

**Files:**
- Create: `backend/src/lib/reminders.ts`
- Test: `backend/src/__tests__/reminders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/__tests__/reminders.test.ts
import { describe, expect, it } from 'vitest'

import { isReminderType, REMINDER_TYPES } from '../lib/reminders.js'

describe('reminder catalog', () => {
  it('includes the morning reminder type', () => {
    expect(REMINDER_TYPES.some((r) => r.type === 'reservation_today')).toBe(true)
  })

  it('validates known/unknown types', () => {
    expect(isReminderType('reservation_today')).toBe(true)
    expect(isReminderType('nope')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && bun run test src/__tests__/reminders.test.ts`
Expected: FAIL — cannot find module `../lib/reminders.js`.

- [ ] **Step 3: Implement the catalog**

```ts
// backend/src/lib/reminders.ts
// Single source of truth for scheduled reminder types. Consumed by the
// scheduler, the /api/notifications/prefs endpoints, and the /reminders bot
// command. Add a type here AND wire its ticker rule before shipping it.
export interface ReminderTypeDef {
  type: string
  label: string
  description: string
}

export const REMINDER_TYPES: readonly ReminderTypeDef[] = [
  {
    type: 'reservation_today',
    label: 'Morning reminder',
    description: 'Notify me in the morning when I have a reservation today.',
  },
  // Future: { type: 'reservation_ending', label: 'Expiry warning', ... }
]

export function isReminderType(value: string): boolean {
  return REMINDER_TYPES.some((rt) => rt.type === value)
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd backend && bun run test src/__tests__/reminders.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/reminders.ts backend/src/__tests__/reminders.test.ts
git commit -m "feat(reminders): add reminder-type catalog"
```

---

## Task 3: Reminder scheduler (ticker + tick)

**Files:**
- Create: `backend/src/lib/reminderScheduler.ts`
- Test: `backend/src/__tests__/reminderScheduler.test.ts`

Note: the test harness **mocks the pool**, so tests verify orchestration (lock handling, insert→push→pushed_at, client release, push-failure resilience) and the SQL *shape* (`stringContaining`). The SQL's timezone/dedup/opt-out correctness is exercised in staging against a real DB, not in these unit tests.

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/__tests__/reminderScheduler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}))
vi.mock('../lib/rocketchatNotify.js', () => ({
  pushChatMessage: vi.fn(),
}))

const { pool } = await import('../db/pool.js')
const { pushChatMessage } = await import('../lib/rocketchatNotify.js')
const { runReminderTick } = await import('../lib/reminderScheduler.js')

const mockConnect = pool.connect as ReturnType<typeof vi.fn>
const mockPush = pushChatMessage as ReturnType<typeof vi.fn>

const due = {
  booking_id: 'b1',
  user_id: 'jsernec',
  spot_id: 's1',
  spot_label: 'A1',
  floor: 'P1',
  expires_at: '2026-06-12T15:00:00.000Z',
}

beforeEach(() => vi.resetAllMocks())

describe('runReminderTick', () => {
  it('inserts a reminder and pushes a DM for a due booking', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ok: true }] }) // advisory lock
        .mockResolvedValueOnce({ rows: [due] }) // candidates
        .mockResolvedValueOnce({ rows: [{ id: 'n1' }] }) // insert
        .mockResolvedValueOnce({ rows: [] }) // pushed_at update
        .mockResolvedValueOnce({ rows: [] }), // advisory unlock
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)
    mockPush.mockResolvedValue(true)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining(['jsernec']),
    )
    expect(mockPush).toHaveBeenCalledWith('jsernec', expect.stringContaining('A1'))
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('pushed_at = now()'),
      ['n1'],
    )
    expect(client.release).toHaveBeenCalled()
  })

  it('does nothing when the advisory lock is held by another tick', async () => {
    const client = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ ok: false }] }),
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    expect(client.query).toHaveBeenCalledTimes(1) // only the lock attempt
    expect(mockPush).not.toHaveBeenCalled()
    expect(client.release).toHaveBeenCalled()
  })

  it('keeps the notification when the DM push fails (no pushed_at)', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ok: true }] })
        .mockResolvedValueOnce({ rows: [due] })
        .mockResolvedValueOnce({ rows: [{ id: 'n1' }] })
        .mockResolvedValueOnce({ rows: [] }), // unlock (no pushed_at update)
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)
    mockPush.mockResolvedValue(false)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('pushed_at = now()'),
      expect.anything(),
    )
    expect(client.release).toHaveBeenCalled()
  })

  it('selects only active bookings, dedups, and respects opt-out (SQL shape)', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ok: true }] })
        .mockResolvedValueOnce({ rows: [] }) // no candidates
        .mockResolvedValueOnce({ rows: [] }), // unlock
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    const selectSql = client.query.mock.calls[1]?.[0] as string
    expect(selectSql).toContain("status = 'active'")
    expect(selectSql).toContain('AT TIME ZONE')
    expect(selectSql).toContain('NOT EXISTS')
    expect(selectSql).toContain('notification_prefs')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && bun run test src/__tests__/reminderScheduler.test.ts`
Expected: FAIL — cannot find module `../lib/reminderScheduler.js`.

- [ ] **Step 3: Implement the scheduler**

```ts
// backend/src/lib/reminderScheduler.ts
import { pool } from '../db/pool.js'
import { pushChatMessage } from './rocketchatNotify.js'

// Constant advisory-lock key — guards against overlapping ticks / multiple
// app instances running the batch at the same time.
const LOCK_KEY = 4730247

const TZ = process.env.REMINDER_TZ ?? 'Europe/Ljubljana'
const MORNING_TIME = process.env.REMINDER_MORNING_TIME ?? '07:30'

interface MorningRow {
  booking_id: string
  user_id: string
  spot_id: string
  spot_label: string | null
  floor: string | null
  expires_at: string
}

// All time/date/dedup/opt-out logic lives here so it is DST-safe (Postgres
// AT TIME ZONE) and single-pass. Params: $1 = now (ISO), $2 = tz, $3 = HH:MM.
// Day-of-booking uses the authoritative `booking_date` column (added in
// 025_booking_date.sql) — NOT expires_at::date, which mis-rolls across UTC
// midnight for late/long bookings.
const MORNING_SQL = `
  SELECT
    b.id::text      AS booking_id,
    b.user_id       AS user_id,
    b.spot_id::text AS spot_id,
    s.label         AS spot_label,
    s.floor         AS floor,
    b.expires_at    AS expires_at
  FROM bookings b
  JOIN spots s ON s.id = b.spot_id
  WHERE b.status = 'active'
    -- only after the local morning time has passed
    AND $1::timestamptz >= (date_trunc('day', $1::timestamptz AT TIME ZONE $2) + $3::interval) AT TIME ZONE $2
    -- the booking's authoritative local day is today
    AND b.booking_date = ($1::timestamptz AT TIME ZONE $2)::date
    -- skip bookings made today after the morning window (just created)
    AND b.booked_at < (date_trunc('day', $1::timestamptz AT TIME ZONE $2) + $3::interval) AT TIME ZONE $2
    -- not already reminded
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.type = 'reservation_today' AND n.data->>'booking_id' = b.id::text
    )
    -- user hasn't opted out
    AND NOT EXISTS (
      SELECT 1 FROM notification_prefs p
      WHERE p.user_id = b.user_id
        AND p.reminder_type = 'reservation_today'
        AND p.enabled = false
    )
`

export async function runReminderTick(now: Date = new Date()): Promise<void> {
  const client = await pool.connect()
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [
      LOCK_KEY,
    ])
    if (!lock.rows[0]?.ok) {
      console.log('[reminders] another tick holds the lock; skipping')
      return
    }
    try {
      const { rows } = await client.query<MorningRow>(MORNING_SQL, [
        now.toISOString(),
        TZ,
        MORNING_TIME,
      ])
      for (const r of rows) {
        try {
          const title = 'Reservation today'
          const body = `You have a reservation today for ${r.spot_label ?? 'your spot'}${r.floor ? ` (${r.floor})` : ''}.`
          const ins = await client.query<{ id: string }>(
            `INSERT INTO notifications (user_id, type, title, body, data)
             VALUES ($1, 'reservation_today', $2, $3, $4::jsonb)
             RETURNING id`,
            [
              r.user_id,
              title,
              body,
              JSON.stringify({
                booking_id: r.booking_id,
                spot_id: r.spot_id,
                spot_label: r.spot_label,
                expires_at: r.expires_at,
              }),
            ],
          )
          const notifId = ins.rows[0]?.id
          const ok = await pushChatMessage(r.user_id, '🅿️ ' + body)
          if (ok && notifId) {
            await client.query(
              'UPDATE notifications SET pushed_at = now() WHERE id = $1',
              [notifId],
            )
          }
        } catch (err) {
          console.error('[reminders] failed for booking', r.booking_id, err)
        }
      }
      if (rows.length > 0) {
        console.log(`[reminders] sent ${rows.length} morning reminder(s)`)
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY])
    }
  } finally {
    client.release()
  }
}

let timer: ReturnType<typeof setInterval> | null = null

export function startReminderScheduler(): void {
  if (process.env.NODE_ENV === 'test') return
  if (process.env.REMINDERS_ENABLED === 'false') {
    console.log('[reminders] disabled via REMINDERS_ENABLED=false')
    return
  }
  const tickMinutes = Number(process.env.REMINDER_TICK_MINUTES ?? '15')
  const run = (): void => {
    void runReminderTick().catch((err) =>
      console.error('[reminders] tick failed:', err),
    )
  }
  setTimeout(run, 10_000) // first run shortly after boot
  timer = setInterval(run, tickMinutes * 60_000)
  console.log(
    `[reminders] scheduler started (every ${tickMinutes} min, morning ${MORNING_TIME} ${TZ})`,
  )
}

export function stopReminderScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd backend && bun run test src/__tests__/reminderScheduler.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/reminderScheduler.ts backend/src/__tests__/reminderScheduler.test.ts
git commit -m "feat(reminders): add morning-reminder scheduler"
```

---

## Task 4: Start the scheduler on boot

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add the import**

In `backend/src/index.ts`, add after the existing `startTimesheetWs` import (line 5):

```ts
import { startReminderScheduler } from "./lib/reminderScheduler.js";
```

- [ ] **Step 2: Call it in the boot sequence**

Replace the `startTimesheetWs();` call (line 22) with:

```ts
    // Connect to Abelium timesheet WebSocket for real-time parking-availability updates
    startTimesheetWs();

    // Start the scheduled morning-reminder ticker
    startReminderScheduler();
```

- [ ] **Step 3: Verify the build**

Run: `cd backend && bun run build`
Expected: PASS.

- [ ] **Step 4: Verify existing tests still pass (scheduler must NOT auto-start under test)**

Run: `cd backend && bun test`
Expected: PASS — all suites green; no scheduler logs (gated by `NODE_ENV==='test'`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(reminders): start scheduler on boot"
```

---

## Task 5: Preferences API (GET/PUT)

**Files:**
- Modify: `backend/src/routes/notifications.ts`
- Test: `backend/src/__tests__/notifications.routes.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/__tests__/notifications.routes.test.ts` (before the final blank line):

```ts
describe('GET /api/notifications/prefs', () => {
  it('returns the catalog and per-type state (absent = enabled)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ reminder_type: 'reservation_today', enabled: false }],
    })
    const res = await request(app).get('/api/notifications/prefs')
    expect(res.status).toBe(200)
    expect(res.body.catalog.some((c: { type: string }) => c.type === 'reservation_today')).toBe(true)
    expect(res.body.prefs.reservation_today).toBe(false)
  })

  it('defaults an absent type to enabled', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/notifications/prefs')
    expect(res.body.prefs.reservation_today).toBe(true)
  })
})

describe('PUT /api/notifications/prefs/:type', () => {
  it('upserts a known type', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const res = await request(app)
      .put('/api/notifications/prefs/reservation_today')
      .send({ enabled: false })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notification_prefs'),
      ['jsernec', 'reservation_today', false],
    )
  })

  it('rejects an unknown type', async () => {
    const res = await request(app)
      .put('/api/notifications/prefs/nope')
      .send({ enabled: true })
    expect(res.status).toBe(400)
  })

  it('rejects a non-boolean enabled', async () => {
    const res = await request(app)
      .put('/api/notifications/prefs/reservation_today')
      .send({ enabled: 'yes' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && bun run test src/__tests__/notifications.routes.test.ts`
Expected: FAIL — GET/PUT `/prefs` 404s (routes not defined).

- [ ] **Step 3: Implement the endpoints**

In `backend/src/routes/notifications.ts`, add the import after line 4:

```ts
import { REMINDER_TYPES } from "../lib/reminders.js";
```

Then insert these two routes immediately after the `GET "/"` route (after its closing `});`, before the `read-all` route):

```ts
// GET /api/notifications/prefs — reminder catalog + this user's on/off state
router.get("/prefs", requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT reminder_type, enabled FROM notification_prefs WHERE user_id = $1`,
      [req.user!.userId],
    );
    const overrides = new Map<string, boolean>(
      result.rows.map((r) => [r.reminder_type, r.enabled]),
    );
    const prefs: Record<string, boolean> = {};
    for (const rt of REMINDER_TYPES) {
      prefs[rt.type] = overrides.get(rt.type) ?? true;
    }
    res.json({ catalog: REMINDER_TYPES, prefs });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/prefs/:type  body { enabled: boolean }
router.put(
  "/prefs/:type",
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      const type = req.params.type;
      if (!REMINDER_TYPES.some((rt) => rt.type === type)) {
        res.status(400).json({ error: "Unknown reminder type" });
        return;
      }
      const enabled = (req.body as { enabled?: unknown }).enabled;
      if (typeof enabled !== "boolean") {
        res.status(400).json({ error: "enabled must be a boolean" });
        return;
      }
      await pool.query(
        `INSERT INTO notification_prefs (user_id, reminder_type, enabled, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, reminder_type)
         DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
        [req.user!.userId, type, enabled],
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && bun run test src/__tests__/notifications.routes.test.ts`
Expected: PASS (original 4 + 5 new = 9 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/notifications.ts backend/src/__tests__/notifications.routes.test.ts
git commit -m "feat(reminders): add notification preferences API"
```

---

## Task 6: Bot `/reminders` command

**Files:**
- Modify: `backend/src/routes/integrations.ts`
- Test: `backend/src/__tests__/integrations.routes.test.ts`
- Modify: `docs/rocketchat-commands.md`

- [ ] **Step 1: Write the failing parser test**

Append to `backend/src/__tests__/integrations.routes.test.ts` a test for `parseCommand` (the file already imports/exercises it — mirror the existing `parseCommand` tests' import):

```ts
describe('parseCommand — reminders', () => {
  it('parses the bare command', () => {
    expect(parseCommand('reminders')).toEqual({ command: 'reminders', rest: [] })
  })
  it('parses on/off with a target', () => {
    expect(parseCommand('reminders off all')).toEqual({
      command: 'reminders',
      rest: ['off', 'all'],
    })
  })
})
```

(If `parseCommand` is not yet imported in this test file, add it to the existing import from `../routes/integrations.js`.)

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && bun run test src/__tests__/integrations.routes.test.ts`
Expected: FAIL — `parseCommand('reminders')` returns `{ command: 'unknown', rest: ['reminders'] }`.

- [ ] **Step 3: Extend the command union and parser**

In `backend/src/routes/integrations.ts`, add `"reminders"` to the `Command` union (after `"peak-hours"`):

```ts
  | "peak-hours"
  | "reminders"
  | "unknown";
```

Add a case in `parseCommand`'s switch (after the `case "owners":` block, before `case "stats":`):

```ts
    case "reminders":
    case "reminder":
      return { command: "reminders", rest: after(1) };
```

- [ ] **Step 4: Run to verify the parser test passes**

Run: `cd backend && bun run test src/__tests__/integrations.routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the handler**

In the big `switch (command)` (the webhook route), add this case before `default:`:

```ts
      case "reminders": {
        if (!needUser()) return;
        const token = mintUserToken(username!);
        const { data } = await call<{
          catalog: { type: string; label: string; description: string }[];
          prefs: Record<string, boolean>;
        }>("GET", "/api/notifications/prefs", { token });
        const catalog = data?.catalog ?? [];
        const prefs = data?.prefs ?? {};

        const sub = rest[0]?.toLowerCase();
        if (sub === "on" || sub === "off") {
          const enabled = sub === "on";
          const targetArg = rest[1]?.toLowerCase();
          const targets =
            !targetArg || targetArg === "all"
              ? catalog.map((c) => c.type)
              : catalog.filter((c) => c.type === targetArg).map((c) => c.type);
          if (targets.length === 0) {
            reply(
              `Unknown reminder. Available: ${catalog.map((c) => c.type).join(", ")}.`,
            );
            return;
          }
          await Promise.all(
            targets.map((type) =>
              call("PUT", `/api/notifications/prefs/${type}`, {
                token,
                body: { enabled },
              }),
            ),
          );
          reply(`✅ Reminders turned ${sub} for: ${targets.join(", ")}.`);
          return;
        }

        const lines = catalog.map(
          (c) =>
            `${prefs[c.type] === false ? "🔕" : "🔔"} *${c.type}* — ${c.label}`,
        );
        reply(
          [
            "*Your reminders:*",
            ...lines,
            "",
            "_Toggle with_ `reminders off <type>` _/_ `reminders on <type>` _(or_ `all`_)._",
          ].join("\n"),
        );
        return;
      }
```

- [ ] **Step 6: Add `/reminders` to HELP_TEXT**

In the `HELP_TEXT` array (near line 48), add before the `"*help* …"` line:

```ts
  "*reminders* `[on|off] [type|all]` — manage your scheduled reminders",
```

- [ ] **Step 7: Document the command**

Append this section to `docs/rocketchat-commands.md`:

```markdown
### `reminders` — manage scheduled reminders

ParkFlow can DM you a morning heads-up ("you have a reservation today"). These
are **on by default**.

- `reminders` — list each reminder type and whether it's on (🔔) or off (🔕).
- `reminders off <type|all>` — turn a reminder off (e.g. `reminders off reservation_today`, or `reminders off all`).
- `reminders on <type|all>` — turn it back on.

The same toggles live in the app under **Profile → Preferences**.
```

- [ ] **Step 8: Verify build + tests**

Run: `cd backend && bun run build && bun run test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/routes/integrations.ts backend/src/__tests__/integrations.routes.test.ts docs/rocketchat-commands.md
git commit -m "feat(reminders): add /reminders bot command"
```

---

## Task 7: Environment variables

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Append the new vars**

Add to `backend/.env.example`:

```
# Scheduled reminders — morning "you have a reservation today"
REMINDERS_ENABLED=true
REMINDER_TZ=Europe/Ljubljana
REMINDER_MORNING_TIME=07:30
REMINDER_TICK_MINUTES=15
```

- [ ] **Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "chore(reminders): document reminder env vars"
```

---

## Task 8: Frontend types + API calls

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/index.ts`

- [ ] **Step 1: Add types**

In `frontend/src/types/index.ts`, after the `AppNotification` interface (line 245):

```ts
export interface ReminderTypeDef {
  type: string
  label: string
  description: string
}

export interface NotificationPrefs {
  catalog: ReminderTypeDef[]
  prefs: Record<string, boolean>
}
```

- [ ] **Step 2: Add the import**

In `frontend/src/api/index.ts`, add `NotificationPrefs` to the type import block (after `FeedbackStatus,` or alphabetically near it):

```ts
  NotificationPrefs,
```

- [ ] **Step 3: Add the API calls**

In `frontend/src/api/index.ts`, inside the `api` object after `markAllNotificationsRead` (before the closing `}`):

```ts
  getNotificationPrefs: () =>
    request<NotificationPrefs>('/api/notifications/prefs'),
  setNotificationPref: (type: string, enabled: boolean) =>
    request<{ ok: boolean }>(`/api/notifications/prefs/${type}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
```

- [ ] **Step 4: Verify the build**

Run: `cd frontend && bun run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/index.ts
git commit -m "feat(reminders): add notification-prefs types and API"
```

---

## Task 9: Frontend hooks

**Files:**
- Create: `frontend/src/hooks/useNotificationPrefs.ts`

- [ ] **Step 1: Implement the hooks**

```ts
// frontend/src/hooks/useNotificationPrefs.ts
import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/api'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'

export function useNotificationPrefs() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['notification-prefs'],
    queryFn: api.getNotificationPrefs,
    enabled: !!token,
    retry: false,
  })
}

export function useSetNotificationPref() {
  return useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      api.setNotificationPref(type, enabled),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notification-prefs'] }),
  })
}
```

- [ ] **Step 2: Verify the build**

Run: `cd frontend && bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useNotificationPrefs.ts
git commit -m "feat(reminders): add useNotificationPrefs hooks"
```

---

## Task 10: Frontend Settings — reminders section, remove old switches

**Files:**
- Create: `frontend/src/pages/ProfilePage/RemindersSection.tsx`
- Modify: `frontend/src/pages/ProfilePage/PreferencesCard.tsx`
- Modify: `frontend/src/pages/ProfilePage/useProfilePage.ts`
- Modify: `frontend/src/pages/ProfilePage/index.tsx`
- Modify: `frontend/src/store/prefsStore.ts`
- Modify: `frontend/src/i18n/locales/en.ts` + `frontend/src/i18n/locales/sl.ts`

- [ ] **Step 1: Create the reminders section**

```tsx
// frontend/src/pages/ProfilePage/RemindersSection.tsx
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PreferenceRow } from '@/components/PreferenceRow/PreferenceRow'
import { Switch } from '@/components/ui/switch'
import {
  useNotificationPrefs,
  useSetNotificationPref,
} from '@/hooks/useNotificationPrefs'

export function RemindersSection() {
  const { t } = useTranslation()
  const { data } = useNotificationPrefs()
  const setPref = useSetNotificationPref()

  if (!data) return null

  return (
    <>
      {data.catalog.map((c) => (
        <div key={c.type} className="py-4">
          <PreferenceRow
            icon={Bell}
            title={t(`profile.reminders.${c.type}.label`, c.label)}
            description={t(`profile.reminders.${c.type}.desc`, c.description)}
          >
            <Switch
              checked={data.prefs[c.type] !== false}
              onCheckedChange={(enabled) =>
                setPref.mutate({ type: c.type, enabled })
              }
            />
          </PreferenceRow>
        </div>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Update PreferencesCard — render reminders, drop old switches**

In `frontend/src/pages/ProfilePage/PreferencesCard.tsx`:

Replace the imports block (lines 1-6) with:

```tsx
import { Clock, ParkingCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PreferenceRow } from '@/components/PreferenceRow/PreferenceRow'
import { Select } from '@/components/ui/select'

import { RemindersSection } from './RemindersSection'
```

In `interface PreferencesCardProps`, remove these four lines:

```tsx
  readonly notifyOnBooking: boolean
  readonly notifyOnAvailability: boolean
  readonly onNotifyOnBookingChange: (v: boolean) => void
  readonly onNotifyOnAvailabilityChange: (v: boolean) => void
```

In the destructured params, remove `notifyOnBooking,`, `notifyOnAvailability,`, `onNotifyOnBookingChange,`, `onNotifyOnAvailabilityChange,`.

Replace the first two `<div className="py-4">…</div>` blocks (the two PreferenceRows for `notifyOnBooking` and `notifyOnAvailability`, lines 50-73) with a single line as the first child of the `divide-y` container:

```tsx
        <RemindersSection />
```

(Keep the `Select` import and the lots/arrivalTime/duration rows unchanged.)

- [ ] **Step 3: Update useProfilePage — drop notify fields**

In `frontend/src/pages/ProfilePage/useProfilePage.ts`, remove these lines:

```ts
  const notifyOnBooking = usePrefsStore((s) => s.notifyOnBooking)
  const notifyOnAvailability = usePrefsStore((s) => s.notifyOnAvailability)
  const setNotifyOnBooking = usePrefsStore((s) => s.setNotifyOnBooking)
  const setNotifyOnAvailability = usePrefsStore(
    (s) => s.setNotifyOnAvailability,
  )
```

And remove `notifyOnBooking,`, `notifyOnAvailability,`, `setNotifyOnBooking,`, `setNotifyOnAvailability,` from the returned object.

- [ ] **Step 4: Update ProfilePage index — drop notify props**

In `frontend/src/pages/ProfilePage/index.tsx`, remove `notifyOnBooking,`, `notifyOnAvailability,`, `setNotifyOnBooking,`, `setNotifyOnAvailability,` from the `useProfilePage()` destructure (lines 20-28), and remove these four props from the `<PreferencesCard … />` call (lines 97-101):

```tsx
        notifyOnBooking={notifyOnBooking}
        notifyOnAvailability={notifyOnAvailability}
        onNotifyOnBookingChange={setNotifyOnBooking}
        onNotifyOnAvailabilityChange={setNotifyOnAvailability}
```

- [ ] **Step 5: Update prefsStore — drop notify fields**

In `frontend/src/store/prefsStore.ts`:
- Remove `notifyOnBooking: boolean` and `notifyOnAvailability: boolean` from `interface UserPrefs`.
- Remove `setNotifyOnBooking` and `setNotifyOnAvailability` from `interface PrefsStore`.
- Remove `notifyOnBooking: true,` and `notifyOnAvailability: false,` from `DEFAULTS`.
- Remove the two corresponding lines in `loadPrefs()` (the `notifyOnBooking:` and `notifyOnAvailability:` reads).
- Remove the `setNotifyOnBooking` and `setNotifyOnAvailability` setter blocks in the store body.

- [ ] **Step 6: Update i18n — drop old keys, add reminders block**

In `frontend/src/i18n/locales/en.ts`, inside `profile:`, remove `notifyOnBooking`, `notifyOnBookingDesc`, `notifyOnAvailability`, `notifyOnAvailabilityDesc`, and add:

```ts
    reminders: {
      reservation_today: {
        label: 'Morning reminder',
        desc: 'Get a reminder when you have a reservation today',
      },
    },
```

In `frontend/src/i18n/locales/sl.ts`, inside `profile:`, remove the same four keys and add:

```ts
    reminders: {
      reservation_today: {
        label: 'Jutranji opomnik',
        desc: 'Opomnik, ko imaš danes rezervacijo',
      },
    },
```

- [ ] **Step 7: Verify build + lint**

Run: `cd frontend && bun run build && bun run lint:all`
Expected: PASS — no unused-var / type errors (confirms every reference to the removed switches is gone).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/ProfilePage frontend/src/store/prefsStore.ts frontend/src/i18n/locales/en.ts frontend/src/i18n/locales/sl.ts
git commit -m "feat(reminders): server-backed reminders in Settings, drop dead localStorage switches"
```

---

## Task 11: Full verification

- [ ] **Step 1: Backend — build, lint, tests**

Run: `cd backend && bun run build && bun run lint && bun run test`
Expected: PASS — all suites green.

- [ ] **Step 2: Frontend — build + lint:all**

Run: `cd frontend && bun run build && bun run lint:all`
Expected: PASS.

- [ ] **Step 3: Manual smoke (staging / local with DB)**

- Boot the backend; confirm log `"[reminders] scheduler started …"`.
- With `REMINDER_MORNING_TIME` set to a minute or two ahead and an active booking for today (created earlier), confirm one `notifications` row of type `reservation_today` is inserted and (if the webhook is configured) a DM arrives, exactly once across several ticks.
- In Settings → Preferences, confirm the "Morning reminder" switch reflects state and toggling it persists (reload keeps the value).
- In the bot, `reminders` lists state; `reminders off all` then `reminders` shows 🔕.

- [ ] **Step 4: Final confirmation**

Confirm no regressions in the existing notifications bell and bot `status` flow.

---

## Self-review notes

- **Spec coverage:** morning ticker (Tasks 3-4), default-on opt-out store (Task 1) + API (Task 5) + bot (Task 6) + UI (Tasks 8-10), catalog (Task 2), env (Task 7), copy/i18n (Tasks 3, 10). Ending-soon intentionally absent (deferred). Three regression guards baked into Task 3 (advisory lock + release in `finally`, `NODE_ENV==='test'` no-op, `.catch()` on scheduled call) and asserted in tests.
- **Test harness reality:** backend tests mock the pool, so scheduler SQL correctness (tz/dedup/opt-out) is asserted by shape + verified manually in Task 11 Step 3, not by a live query.
- **Rebased onto `critical-audit-fixes`:** migration is **026** (025 is `025_booking_date.sql`); the morning query keys "today" off the authoritative `booking_date` column, not `expires_at::date`. Confirm `booking_date` exists (`bun run build` + a glance at `025_booking_date.sql`) before relying on it.
- **Type consistency:** `runReminderTick`, `startReminderScheduler`, `REMINDER_TYPES`, `isReminderType`, `getNotificationPrefs`, `setNotificationPref`, `useNotificationPrefs`, `useSetNotificationPref`, `NotificationPrefs`, `ReminderTypeDef` used consistently across backend/frontend tasks.

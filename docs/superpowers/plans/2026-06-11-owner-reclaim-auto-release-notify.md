# Owner-reclaim Auto-release + Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an owner reclaims a spot in-app (sets day-status to `occupied`) that a non-owner has actively reserved, automatically release that reservation, persist a notification, push a proactive RocketChat DM to the bumped user, and surface unread notices in a web bell + the bot's `status` reply.

**Architecture:** All detection is synchronous inside `PUT /api/owners/me/spots/:spotId/day-status`. A new `notifications` table is the durable record. Delivery is three layers: proactive DM via a new outbound webhook lib (`lib/rocketchatNotify.ts`), a web bell backed by new `/api/notifications` endpoints, and a bot fallback inside the `status` command that prepends + marks-read any unread, un-pushed notices. Spec: `docs/superpowers/specs/2026-06-11-owner-reclaim-auto-release-notify-design.md`.

**Tech Stack:** Backend — Express, PostgreSQL (`pg`), Vitest + Supertest, Bun. Frontend — React, React Query, Zustand, Tailwind, lucide-react, Mantine notifications, Bun.

---

## Deviations from the spec (read first)

1. **Owner heads-up = post-action toast, not a pre-action confirm dialog.** The owner-parking "Occupy" button only renders when the spot shows `free` (`SpotCard.tsx:130-150`), so a *pre*-action confirm on an already-reserved spot may be unreachable. We instead surface the released reservation in the existing success toast. Task 8 includes a note to add a confirm dialog *if* implementation finds the occupy action is reachable on a reserved (future-dated) spot.
2. **Bot fallback lives in the `status`/`me` command only**, not every reply — this is the natural "what do I have" command and keeps blast radius off every other bot command. `callArray` already returns `[]` on any error, so existing bot tests stay green.
3. **Toast uses the existing Mantine `notifications.show()`** already used in `useOwnerParkingActions.ts` — matching surrounding code, not introducing a new toast system.

---

## File Structure

**Backend (create):**
- `backend/migrations/024_notifications.sql` — `notifications` table.
- `backend/src/lib/rocketchatNotify.ts` — outbound DM via incoming webhook (env-only secret).
- `backend/src/routes/notifications.ts` — `GET /`, `PATCH /:id/read`, `PATCH /read-all`.
- `backend/src/__tests__/rocketchatNotify.test.ts`
- `backend/src/__tests__/notifications.routes.test.ts`

**Backend (modify):**
- `backend/src/routes/owners.ts:176-233` — `occupied` branch becomes a transaction: upsert override + release conflicting non-owner bookings + insert notifications + post-commit DM.
- `backend/src/routes/integrations.ts` — `status`/`me` command prepends unread, un-pushed notices.
- `backend/src/app.ts` — register the notifications router.
- `backend/src/__tests__/owners.routes.test.ts` — new day-status tests.
- `backend/.env.example` — document `ROCKETCHAT_INCOMING_WEBHOOK_URL`.

**Frontend (create):**
- `frontend/src/hooks/useNotifications.ts` — query + mutation hooks.
- `frontend/src/components/Layout/NotificationBell.tsx` — bell + Dialog list.

**Frontend (modify):**
- `frontend/src/api/index.ts` — 3 notification API functions.
- `frontend/src/types/index.ts` — `AppNotification` interface.
- `frontend/src/components/Layout/DesktopSidebar.tsx:50-68` — mount the bell.
- `frontend/src/pages/OwnerParkingPage/useOwnerParkingActions.ts:35-96` — surface `released[]` in the toast.

**Docs:**
- `docs/BUSINESS_RULES.md` — record the new rule (via doc-update skill).

---

## Task 1: Notifications table migration

**Files:**
- Create: `backend/migrations/024_notifications.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 024_notifications.sql
-- Durable per-user notifications. user_id matches bookings.user_id
-- (== preferred_username == RocketChat handle, same SSO).
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at    TIMESTAMPTZ,
  pushed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at);
```

- [ ] **Step 2: Verify the backend still builds and migrate parses**

Run: `cd backend && bun run build`
Expected: PASS (no TypeScript errors; the runner picks up `024_*.sql` on next startup — `src/db/migrate.ts` auto-reads the dir).

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/024_notifications.sql
git commit -m "feat(db): add notifications table"
```

---

## Task 2: Outbound RocketChat DM lib

**Files:**
- Create: `backend/src/lib/rocketchatNotify.ts`
- Test: `backend/src/__tests__/rocketchatNotify.test.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/__tests__/rocketchatNotify.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pushChatMessage } from "../lib/rocketchatNotify.js";

const URL = "https://rc.example/hooks/abc/def";

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL = URL;
});
afterEach(() => {
  delete process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL;
});

describe("pushChatMessage", () => {
  it("POSTs a DM to @handle and returns true on ok", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const ok = await pushChatMessage("jsernec", "hello");

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ channel: "@jsernec", text: "hello" }),
      }),
    );
  });

  it("returns false (no fetch) when the webhook env is unset", async () => {
    delete process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const ok = await pushChatMessage("jsernec", "hi");
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false when handle is empty", async () => {
    const ok = await pushChatMessage("", "hi");
    expect(ok).toBe(false);
  });

  it("returns false and swallows a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    const ok = await pushChatMessage("jsernec", "hi");
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && bun run test -- rocketchatNotify`
Expected: FAIL — `Cannot find module '../lib/rocketchatNotify.js'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/lib/rocketchatNotify.ts
// Outbound notifications to RocketChat via an Incoming Webhook.
// The webhook URL is a secret: env only, never logged, never sent to the client.
const WEBHOOK_ENV = "ROCKETCHAT_INCOMING_WEBHOOK_URL";

/**
 * Posts a direct message to @handle. Best-effort: returns true only on an OK
 * response. Never throws — a delivery failure must not break the caller.
 */
export async function pushChatMessage(
  handle: string,
  text: string,
): Promise<boolean> {
  const url = process.env[WEBHOOK_ENV];
  if (!url || !handle) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: `@${handle}`, text }),
    });
    return res.ok;
  } catch (err) {
    console.error(
      "[rocketchatNotify] push failed:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && bun run test -- rocketchatNotify`
Expected: PASS (4 tests).

- [ ] **Step 5: Document the env var**

In `backend/.env.example`, add directly under the existing `ROCKETCHAT_WEBHOOK_TOKEN=` line (line 18):

```bash
# Outbound RocketChat Incoming Webhook URL — used to DM users when their
# reservation is released. Secret; backend only, never exposed to the frontend.
ROCKETCHAT_INCOMING_WEBHOOK_URL=
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/rocketchatNotify.ts backend/src/__tests__/rocketchatNotify.test.ts backend/.env.example
git commit -m "feat(notify): outbound RocketChat DM helper"
```

---

## Task 3: Auto-release on owner reclaim (day-status occupied)

**Files:**
- Modify: `backend/src/routes/owners.ts:176-233`
- Test: `backend/src/__tests__/owners.routes.test.ts`

Context — current `occupied` path (`owners.ts:221-229`) is a single `pool.query` upsert. We replace **only the `occupied` branch** with a transaction; the `null` (clear) and `free` branches are untouched.

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/__tests__/owners.routes.test.ts`. The auth mock already sets `req.user = { userId: 'test-user', username: 'admin', displayName: undefined, role: 'admin' }`; these tests pass `displayName` through the existing mock, so reference `req.user!.displayName` defensively in code (it may be undefined in tests — that's fine, it lands in `cancelled_by`).

```typescript
import { afterEach } from "vitest";

afterEach(() => {
  delete process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL;
});

describe("PUT /api/owners/me/spots/:spotId/day-status — occupied auto-release", () => {
  const SPOT = { id: "spot-1", label: "Z-17", number: 17 };

  function txClient(querySeq: Array<unknown>) {
    const q = vi.fn();
    for (const r of querySeq) q.mockResolvedValueOnce(r);
    return { query: q, release: vi.fn() };
  }

  it("releases a conflicting non-owner booking and creates a notification", async () => {
    // webhook unset → post-commit push is a no-op (no fetch, no extra query)
    const mockConnect = pool.connect as ReturnType<typeof vi.fn>;

    // 1. ownership check (pool.query)
    mockQuery.mockResolvedValueOnce({ rows: [SPOT] });
    // 2. transaction client
    const client = txClient([
      {}, // BEGIN
      { rows: [{ id: "ovr-1", status: "occupied" }] }, // INSERT override
      { rows: [{ id: "bk-1", user_id: "bostjan", reserved_by: "Boštjan Kovač" }] }, // SELECT conflicts
      {}, // UPDATE bookings cancel
      { rows: [] }, // SELECT other active
      {}, // UPDATE spots free
      { rows: [{ id: "notif-1" }] }, // INSERT notification
      {}, // COMMIT
    ]);
    mockConnect.mockResolvedValueOnce(client);

    const res = await request(app)
      .put("/api/owners/me/spots/spot-1/day-status")
      .send({ date: "2026-06-12", status: "occupied" });

    expect(res.status).toBe(200);
    expect(res.body.released).toEqual([
      { booking_id: "bk-1", reserved_by: "Boštjan Kovač" },
    ]);
    // cancel happened
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE bookings SET status = 'cancelled'"),
      expect.arrayContaining(["bk-1"]),
    );
    // notification inserted
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO notifications"),
      expect.arrayContaining(["bostjan"]),
    );
  });

  it("does NOT cancel the owner's own booking (booked_by_owner)", async () => {
    const mockConnect = pool.connect as ReturnType<typeof vi.fn>;
    mockQuery.mockResolvedValueOnce({ rows: [SPOT] }); // ownership
    const client = txClient([
      {}, // BEGIN
      { rows: [{ id: "ovr-1", status: "occupied" }] }, // INSERT override
      { rows: [] }, // SELECT conflicts (filtered booked_by_owner=false → none)
      {}, // COMMIT
    ]);
    mockConnect.mockResolvedValueOnce(client);

    const res = await request(app)
      .put("/api/owners/me/spots/spot-1/day-status")
      .send({ date: "2026-06-12", status: "occupied" });

    expect(res.status).toBe(200);
    expect(res.body.released).toEqual([]);
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE bookings SET status = 'cancelled'"),
      expect.anything(),
    );
  });

  it("rejects when caller does not own the spot", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ownership check → none
    const res = await request(app)
      .put("/api/owners/me/spots/spot-1/day-status")
      .send({ date: "2026-06-12", status: "occupied" });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && bun run test -- owners.routes`
Expected: FAIL — current handler does no transaction / has no `released` in the response.

- [ ] **Step 3: Implement the transactional occupied branch**

In `backend/src/routes/owners.ts`:

(a) Add imports at the top (near the existing `import { pool } from ...`):

```typescript
import { pushChatMessage } from '../lib/rocketchatNotify.js';
```

(b) Extend the ownership-check query (`owners.ts:188-199`) to also return the spot label/number — change its `SELECT s.id` to:

```typescript
    const check = await pool.query(
      `SELECT s.id, s.label, s.number FROM spots s
       JOIN owners o ON s.owner_id = o.id
       WHERE s.id = $1 AND (
         $2 = ANY(string_to_array(o.user_id, ','))
         OR LOWER($3) IN (
           SELECT TRIM(LOWER(n))
           FROM unnest(string_to_array(o.name, '/')) AS t(n)
         )
       )`,
      [spotId, req.user!.username, req.user!.displayName],
    );
    if (check.rows.length === 0) {
      res.status(403).json({ error: "Not your spot" });
      return;
    }
    const spot = check.rows[0] as { id: string; label: string | null; number: number };
```

(c) Keep the `null` (clear) branch exactly as-is (`owners.ts:205-214`).

(d) Keep the validation (`owners.ts:216-219`) as-is.

(e) Replace the final upsert (`owners.ts:221-229`) with a branch on status. The `free` branch keeps today's simple upsert; the `occupied` branch runs the transaction:

```typescript
    if (status === "free") {
      const result = await pool.query(
        `INSERT INTO spot_day_status (spot_id, date, status, set_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (spot_id, date) DO UPDATE SET status = $3, set_by = $4
         RETURNING *`,
        [spotId, date, status, req.user!.displayName],
      );
      broadcast();
      res.json(result.rows[0]);
      return;
    }

    // status === "occupied": reclaim. Release any conflicting non-owner active
    // booking on this spot+date, record a notification, then DM after commit.
    const spotLabel = spot.label ?? `#${spot.number}`;
    const released: {
      booking_id: string;
      reserved_by: string | null;
      user_id: string;
      notif_id: string;
      body: string;
    }[] = [];

    const client = await pool.connect();
    let overrideRow: unknown;
    try {
      await client.query("BEGIN");

      const upsert = await client.query(
        `INSERT INTO spot_day_status (spot_id, date, status, set_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (spot_id, date) DO UPDATE SET status = $3, set_by = $4
         RETURNING *`,
        [spotId, date, status, req.user!.displayName],
      );
      overrideRow = upsert.rows[0];

      const conflicts = await client.query(
        `SELECT b.id, b.user_id, b.reserved_by
         FROM bookings b
         WHERE b.spot_id = $1 AND b.status = 'active'
           AND b.expires_at::date = $2::date
           AND b.booked_by_owner = false
         FOR UPDATE`,
        [spotId, date],
      );

      for (const c of conflicts.rows as {
        id: string;
        user_id: string;
        reserved_by: string | null;
      }[]) {
        await client.query(
          `UPDATE bookings SET status = 'cancelled', ended_at = now(), cancelled_by = $2 WHERE id = $1`,
          [c.id, req.user!.displayName],
        );
        const other = await client.query(
          `SELECT id FROM bookings WHERE spot_id = $1 AND status = 'active' AND id != $2 LIMIT 1`,
          [spotId, c.id],
        );
        if (other.rows.length === 0) {
          await client.query(`UPDATE spots SET status = 'free' WHERE id = $1`, [
            spotId,
          ]);
        }
        const body = `Your reservation for ${spotLabel} on ${date} was released because the owner reclaimed the spot.`;
        const notif = await client.query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, 'reservation_released', $2, $3, $4)
           RETURNING id`,
          [
            c.user_id,
            "Reservation released",
            body,
            JSON.stringify({ spot_id: spotId, date, booking_id: c.id }),
          ],
        );
        released.push({
          booking_id: c.id,
          reserved_by: c.reserved_by,
          user_id: c.user_id,
          notif_id: notif.rows[0].id as string,
          body,
        });
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    broadcast();

    // Proactive DM (best-effort, post-commit). Mark pushed_at on success so the
    // bot fallback won't re-show it.
    for (const r of released) {
      const ok = await pushChatMessage(r.user_id, `⚠️ ${r.body}`);
      if (ok) {
        await pool.query(
          `UPDATE notifications SET pushed_at = now() WHERE id = $1`,
          [r.notif_id],
        );
      }
    }

    res.json({
      ...(overrideRow as object),
      released: released.map((r) => ({
        booking_id: r.booking_id,
        reserved_by: r.reserved_by,
      })),
    });
    return;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && bun run test -- owners.routes`
Expected: PASS (new + existing owners tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/owners.ts backend/src/__tests__/owners.routes.test.ts
git commit -m "feat(owners): auto-release non-owner bookings when owner reclaims a spot"
```

---

## Task 4: Notifications REST endpoints

**Files:**
- Create: `backend/src/routes/notifications.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/__tests__/notifications.routes.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/__tests__/notifications.routes.test.ts
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

vi.mock("../db/pool.js", () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}));

vi.mock("../middleware/auth.js", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "jsernec", username: "jsernec", role: "user" };
    next();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionalAuth: (req: any, _res: any, next: any) => next(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireNonGuest: (_req: any, _res: any, next: any) => next(),
}));

const { pool } = await import("../db/pool.js");
const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => vi.resetAllMocks());
const app = createApp();

describe("GET /api/notifications", () => {
  it("returns the caller's notifications, unread first", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "n1", body: "x", read_at: null }],
    });
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = $1"),
      ["jsernec"],
    );
  });

  it("filters to undelivered when ?undelivered=1", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await request(app).get("/api/notifications?undelivered=1");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("pushed_at IS NULL"),
      ["jsernec"],
    );
  });
});

describe("PATCH /api/notifications/:id/read", () => {
  it("marks one read, scoped to the caller", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).patch("/api/notifications/n1/read");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET read_at = now()"),
      ["n1", "jsernec"],
    );
  });
});

describe("PATCH /api/notifications/read-all", () => {
  it("marks all the caller's unread read", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });
    const res = await request(app).patch("/api/notifications/read-all");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && bun run test -- notifications.routes`
Expected: FAIL — route not mounted (404s).

- [ ] **Step 3: Implement the router**

```typescript
// backend/src/routes/notifications.ts
import { Router } from "express";

import { pool } from "../db/pool.js";
import { requireAuth, requireNonGuest } from "../middleware/auth.js";

const router = Router();

// GET /api/notifications  (?undelivered=1 → only unread AND never proactively pushed)
router.get("/", requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    const undelivered = req.query.undelivered === "1";
    const where = undelivered
      ? "WHERE user_id = $1 AND read_at IS NULL AND pushed_at IS NULL"
      : "WHERE user_id = $1";
    const result = await pool.query(
      `SELECT id, type, title, body, data, created_at, read_at, pushed_at
       FROM notifications
       ${where}
       ORDER BY (read_at IS NULL) DESC, created_at DESC
       LIMIT 50`,
      [req.user!.userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
      [req.params.id, req.user!.userId],
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
      [req.user!.userId],
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
```

Note: register `/read-all` is matched before `/:id/read`? Express matches in declaration order; `/:id/read` would not match `/read-all` (different shape: `read-all` has no `/read` suffix), so order is safe.

- [ ] **Step 4: Register the router in `backend/src/app.ts`**

Add the import alongside the others (after line 13):

```typescript
import notificationsRouter from './routes/notifications.js';
```

Add the mount alongside the others (after line 46):

```typescript
  app.use('/api/notifications', notificationsRouter);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && bun run test -- notifications.routes`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/notifications.ts backend/src/app.ts backend/src/__tests__/notifications.routes.test.ts
git commit -m "feat(notify): notifications REST endpoints"
```

---

## Task 5: Bot `status` fallback — prepend unread notices

**Files:**
- Modify: `backend/src/routes/integrations.ts` (the `case "status"`/`case "me"` block, ~line 1336)
- Test: `backend/src/__tests__/integrations.routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the loopback describe block in `backend/src/__tests__/integrations.routes.test.ts` (the block near line 1088 that runs against the live test API). This asserts a seeded notification is prepended when the user runs `status`.

```typescript
it("status prepends an unread, un-pushed notification then marks it read", async () => {
  process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
  // Seed one undelivered notification for the bot user via direct SQL helper
  // used elsewhere in this suite (see seed helpers at top of loopback block).
  await seedNotification({
    user_id: "jsernec",
    body: "Your reservation for Z-17 on 2026-06-12 was released because the owner reclaimed the spot.",
  });

  const res = await request(app).post("/api/integrations/rocketchat").send({
    token: WEBHOOK_TOKEN,
    user_name: "jsernec",
    text: "status",
  });

  expect(res.status).toBe(200);
  expect(res.body.text).toContain("⚠️");
  expect(res.body.text).toContain("was released because the owner reclaimed");

  // it was marked read → a second status does not repeat it
  const res2 = await request(app).post("/api/integrations/rocketchat").send({
    token: WEBHOOK_TOKEN,
    user_name: "jsernec",
    text: "status",
  });
  expect(res2.body.text).not.toContain("⚠️");
});
```

If the loopback block has no `seedNotification` helper, add one next to the existing seed helpers in that block:

```typescript
async function seedNotification(n: { user_id: string; body: string }) {
  await testPool.query(
    `INSERT INTO notifications (user_id, type, title, body)
     VALUES ($1, 'reservation_released', 'Reservation released', $2)`,
    [n.user_id, n.body],
  );
}
```

(Use whatever the block already calls its live pool — match the existing seed helpers' pool handle.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && bun run test -- integrations.routes`
Expected: FAIL — `status` reply has no `⚠️` prefix yet.

- [ ] **Step 3: Implement the prepend in the `status` case**

In `backend/src/routes/integrations.ts`, inside `case "status":` (and shared `case "me":`), replace the final `reply(formatStatus(enriched, owned));` with:

```typescript
        // Fallback delivery: prepend any unread notice that was never pushed
        // (proactive DM failed or the handle couldn't be resolved), then mark read.
        const notices = await callArray<{ id: string; body: string }>(
          "GET",
          "/api/notifications?undelivered=1",
          { token },
        );
        let prefix = "";
        if (notices.length > 0) {
          prefix = notices.map((n) => `⚠️ ${n.body}`).join("\n") + "\n\n";
          await Promise.all(
            notices.map((n) =>
              call("PATCH", `/api/notifications/${n.id}/read`, { token }),
            ),
          );
        }
        reply(prefix + formatStatus(enriched, owned));
        return;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && bun run test -- integrations.routes`
Expected: PASS (new test + all existing bot tests — unaffected since `callArray` returns `[]` when there are no undelivered notices).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/integrations.ts backend/src/__tests__/integrations.routes.test.ts
git commit -m "feat(bot): status prepends unread reservation-released notices"
```

---

## Task 6: Frontend API + types + hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/index.ts`
- Create: `frontend/src/hooks/useNotifications.ts`

- [ ] **Step 1: Add the type**

In `frontend/src/types/index.ts` add:

```typescript
export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  created_at: string
  read_at: string | null
  pushed_at: string | null
}
```

- [ ] **Step 2: Add the API functions**

In `frontend/src/api/index.ts`, add to the exported api object (mirror the `setSpotDayStatus` pattern at line 87, and import `AppNotification` from `../types`):

```typescript
  listNotifications: () => request<AppNotification[]>('/api/notifications'),
  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/read-all', {
      method: 'PATCH',
    }),
```

- [ ] **Step 3: Create the hooks**

```typescript
// frontend/src/hooks/useNotifications.ts
import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '../api'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../store/authStore'

export function useNotifications() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['notifications'],
    queryFn: api.listNotifications,
    enabled: !!token,
    refetchInterval: 60_000,
    retry: false,
  })
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
```

(Confirm exact import paths/casing against `useOwnerParking.ts` — it imports `api`, `queryClient`, and `useAuthStore` from these same locations.)

- [ ] **Step 4: Verify build/lint**

Run: `cd frontend && bun run fix`
Expected: no lint/format errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/index.ts frontend/src/hooks/useNotifications.ts
git commit -m "feat(notify): frontend notifications api + hooks"
```

---

## Task 7: Notification bell + panel

**Files:**
- Create: `frontend/src/components/Layout/NotificationBell.tsx`
- Modify: `frontend/src/components/Layout/DesktopSidebar.tsx:50-68`

- [ ] **Step 1: Create the bell component**

Uses the verified `Dialog` primitive (`components/ui/dialog.tsx`) and lucide `Bell`. Unread count drives a badge.

```tsx
// frontend/src/components/Layout/NotificationBell.tsx
import { Bell } from 'lucide-react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from '../../hooks/useNotifications'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const unread = notifications.filter((n) => n.read_at === null).length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unread > 0) markAll.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        title="Notifications"
        aria-label="Notifications"
        className="text-muted-foreground/70 hover:text-muted-foreground relative ml-1 cursor-pointer rounded-full p-1 transition-colors"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="bg-destructive absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notifications.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="border-border rounded-lg border p-3 text-sm"
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-muted-foreground">{n.body}</p>
                <p className="text-muted-foreground/60 mt-1 text-xs">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Mount the bell in the sidebar header**

In `frontend/src/components/Layout/DesktopSidebar.tsx`, import it and place it just before the existing Info `<button>` in the logo row (around line 60). Import:

```tsx
import { NotificationBell } from './NotificationBell'
```

Insert immediately before the `<button ... onClick={onAboutOpen}>` element so the row reads `… ParkFlow  [Bell] [Info]`:

```tsx
            <NotificationBell />
```

Adjust the existing Info button's `ml-auto` so the bell, not Info, carries the `ml-auto` (move `ml-auto` onto `<NotificationBell />`'s wrapper or the bell button's className, and drop it from the Info button) — keep both icons right-aligned together.

- [ ] **Step 3: Verify build/lint**

Run: `cd frontend && bun run fix`
Expected: no errors. Manually confirm the bell renders and the badge shows when a notification exists (verified end-to-end in Task 9).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout/NotificationBell.tsx frontend/src/components/Layout/DesktopSidebar.tsx
git commit -m "feat(notify): notification bell + panel in sidebar"
```

- [ ] **Step 5 (follow-up note, not blocking):** Surface the bell on mobile too — drop `<NotificationBell />` into `MobileBottomNav.tsx:30-59` (e.g. in the "More" menu or as a nav item). Left as a small follow-up since mobile nav structure differs; the desktop mount delivers the feature.

---

## Task 8: Owner heads-up toast

**Files:**
- Modify: `frontend/src/pages/OwnerParkingPage/useOwnerParkingActions.ts:35-96`

The `setSpotDayStatus` API already returns the body; extend its typing to include `released` and branch the success toast.

- [ ] **Step 1: Widen the API return type**

In `frontend/src/api/index.ts`, change `setSpotDayStatus`'s generic to include `released`:

```typescript
  setSpotDayStatus: (
    spotId: string,
    date: string,
    status: 'free' | 'occupied' | null,
  ) =>
    request<{
      released?: { booking_id: string; reserved_by: string | null }[]
    } & Record<string, unknown>>(
      `/api/owners/me/spots/${spotId}/day-status`,
      { method: 'PUT', body: JSON.stringify({ date, status }) },
    ),
```

- [ ] **Step 2: Surface `released` in the success toast**

In `frontend/src/pages/OwnerParkingPage/useOwnerParkingActions.ts`, where the occupy success toast fires (around line 54-61, the `notifications.show({...})` after a successful `occupied` mutation), use the mutation result. If `useSetSpotDayStatus().mutate` is used with `onSuccess`, switch to `mutateAsync` (or read the result in `onSuccess`'s first arg) and branch:

```typescript
const result = await setDayStatus.mutateAsync({
  spotId: spot.id,
  date: selectedDate,
  status: 'occupied',
})
const released = result.released ?? []
notifications.show({
  message:
    released.length > 0
      ? `Reclaimed ${spot.label ?? `#${spot.number}`} — released ${
          released[0].reserved_by ?? 'a user'
        }'s reservation${released.length > 1 ? ` (+${released.length - 1} more)` : ''}.`
      : t('ownerParking.toastSpotOccupied', {
          label: spot.label ?? `#${spot.number}`,
          date: formatDate(selectedDate, i18n.language),
        }),
  color: released.length > 0 ? 'orange' : 'green',
})
```

(Match the existing variable names in the file — `setDayStatus`, `spot`, `selectedDate`, `t`, `i18n`, `formatDate`. If the file currently uses `.mutate` with a separate `onSuccess`, convert that single call site to `await .mutateAsync` inside the existing async handler.)

- [ ] **Step 3: Verify build/lint**

Run: `cd frontend && bun run fix`
Expected: no errors.

- [ ] **Step 4 (note):** If, during this task, you find the "Occupy" action *is* reachable on a spot that already shows a non-owner active booking (`active_booking_id` set, `active_booking_booked_by_owner` false), add a confirm `Dialog` before the `mutateAsync` call: *"This spot is reserved by {reserved_by} — reclaiming releases their reservation. Continue?"* Reuse the `SpotDeleteDialog.tsx` pattern. If it is not reachable (button only shows on `free`), the toast above is sufficient — note that in the commit message.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/index.ts frontend/src/pages/OwnerParkingPage/useOwnerParkingActions.ts
git commit -m "feat(owners): toast names the released reservation on reclaim"
```

---

## Task 9: Full verification + docs

**Files:**
- Modify: `docs/BUSINESS_RULES.md`

- [ ] **Step 1: Run the full backend suite**

Run: `cd backend && bun run build && bun run lint && bun test`
Expected: build clean, lint clean, all tests PASS.

- [ ] **Step 2: Run frontend checks**

Run: `cd frontend && bun run fix`
Expected: no lint/format errors.

- [ ] **Step 3: Manual end-to-end smoke (real app)**

Use the `/run` skill (or `bun run dev` in each of `backend`/`frontend`). With `ROCKETCHAT_INCOMING_WEBHOOK_URL` set in `backend/.env`:
1. As a non-owner, reserve a spot that an owner owns (owner currently absent).
2. As the owner, set that spot's day-status to `occupied` for the same date.
3. Confirm: the booking is cancelled, the owner sees the "released …" toast, the bumped user sees the bell badge + panel entry, and (if the RC webhook permits `@user` DM override) the user receives a DM. If the DM is rejected by the RC config, confirm the bot `status` command prepends the `⚠️` notice instead.

Record the observed result. ⚠️ The `@user` DM-override permission is the one unverified external dependency (per spec) — confirm it here.

- [ ] **Step 4: Update business rules**

Invoke the `doc-update` skill to add to `docs/BUSINESS_RULES.md`: *"When an owner marks an owned spot occupied (reclaims) for a date that a non-owner has actively reserved, the reservation is automatically cancelled, the user is notified (in-app + proactive RocketChat DM, with a bot-status fallback), and the owner sees which reservation was released. Co-owners' own bookings are never auto-cancelled. Detection is in-app only (the day-status occupied action); timesheet-driven conflicts are not covered."*

- [ ] **Step 5: Commit**

```bash
git add docs/BUSINESS_RULES.md
git commit -m "docs: business rule for owner-reclaim auto-release + notifications"
```

---

## Self-Review

**Spec coverage:**
- Auto-release on in-app reclaim → Task 3. ✓
- Notifications table → Task 1. ✓
- Proactive DM (env-only secret) → Task 2 + Task 3 post-commit push. ✓
- In-app bell + endpoints → Task 4 + Task 6 + Task 7. ✓
- Bot fallback (unread + un-pushed, marks read, no double-notify) → Task 5. ✓
- Owner heads-up → Task 8 (toast; confirm-dialog noted, gated on reachability — deviation flagged up top). ✓
- Co-owner own-booking guard (`booked_by_owner = false`) → Task 3. ✓
- English copy → all bodies/titles are English. ✓
- Out-of-scope items not implemented (timesheet, self-booking path, identity fix, reconcile) → confirmed absent. ✓

**Type consistency:** `pushChatMessage(handle, text)` (Task 2) is called identically in Task 3. `released: { booking_id, reserved_by }[]` shape is identical in Task 3 response, Task 8 API type, and the day-status test. `AppNotification` fields (Task 6) match the `notifications` columns (Task 1) and the GET select (Task 4). Bot `?undelivered=1` (Task 5) matches the GET filter (Task 4).

**Placeholder scan:** No TBD/TODO; every code step has complete code. Two intentional "verify against the file" notes (Task 6 import paths, Task 8 variable names) point at exact files/lines, not vague hand-waving.

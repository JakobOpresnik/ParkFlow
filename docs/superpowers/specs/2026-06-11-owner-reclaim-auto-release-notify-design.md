# Owner-reclaim auto-release + notifications — Design

**Date:** 2026-06-11
**Status:** Approved (pending spec review)
**Author:** Jan Sernec (with Claude)

## Problem

A user can reserve a spot while its owner is absent. If the owner later reclaims
the spot (marks it occupied for that day), nothing reconciles the two states:

- The user's `bookings` row stays `active`.
- The owner-occupied signal is set independently.
- The card shows a contradictory "Occupied — in use by the owner" **and**
  "Reserved by <user>".
- Nobody is notified. The bumped user only finds out if they happen to re-open
  the app; the owner doesn't know a reservation existed.

The conflict is **transient, not permanent**: bookings are single-day
(`expires_at`) and the day-status override is date-scoped, and
`expireStaleBookings()` (runs on every `GET /bookings/my` and `POST /bookings`,
`backend/src/routes/bookings.ts:67,99`) flips the booking to `expired` and frees
the spot at end of day. So the problem is not a stuck row — it is that the bumped
reservation lingers **silently `active` (and double-displays) until end-of-day
expiry, with nobody notified**. This feature releases it *immediately* and tells
the user, instead of waiting for silent expiry.

Reported by Boštjan Kovač (spots Z-17 and Z-11), 2026-06-04. Those specific
reservations were single-day and have long since expired — there is nothing to
retroactively clean up.

There is also a compounding, separately-tracked identity bug (web bookings keyed
by Authentik `sub` vs bot keyed by `preferred_username`) that let the same user
silently hold two bookings and made the bot report "nothing reserved". That bug
is **out of scope** here — see `project_bot_owner_link_mismatch` memory.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Conflict policy | Owner reclaim wins → user's reservation auto-released + notified |
| Detection scope | In-app reclaim only (synchronous), v1 |
| Notify channel | Persistent in-app notifications + proactive bot push + bot-on-next-msg fallback |
| Push timing | Proactive (un-prompted) the moment the spot is reclaimed |
| Owner heads-up | Yes — confirm dialog + toast showing the released reservation |
| Copy language | English |

### Out of scope (deliberate)

- Timesheet/presence-driven conflicts (no event; would need a cron/lazy scan).
- Owner reclaiming by *booking* their own spot (today returns 409).
- The two-active-bookings identity-key fix — already fixed and shipped
  (`auth.ts:107`, commit `4539c18`, live in v1.3.10/v1.3.11). Nothing left to do.
- A one-off reconcile of "existing" conflicts — **not needed**: the conflict is
  transient and ages out via `expireStaleBookings()` each day, so there is no
  persistently stuck row to repair (the reported Z-17/Z-11 reservations expired a
  week ago).

## Behavior

When an owner sets a spot's day-status to `occupied` for a date that has an
**active booking held by someone who is not a co-owner**, in one transaction:

1. Cancel the booking: `status='cancelled'`, `ended_at=now()`,
   `cancelled_by=<owner display name>` (reuse the cancel pattern at
   `backend/src/routes/bookings.ts:453`).
2. Free the spot if no other active booking remains for it.
3. Insert a `notifications` row for the bumped user.
4. Return the released booking(s) to the owner.

After the transaction commits (so a delivery failure can never roll back the
release), fire a proactive RocketChat DM to the bumped user.

Guards / unchanged paths:

- A co-owner's *own* booking is never cancelled — `isUserCoOwner`
  (`backend/src/routes/bookings.ts:19`).
- `status='free'`, `status=null`, and the no-conflicting-booking case keep
  exactly today's behavior.
- Multiple active non-owner bookings on the spot/date → all released.

## Data model

New migration — `notifications`:

```
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     TEXT NOT NULL          -- recipient = preferred_username / RC handle;
                                    -- matches bookings.user_id
type        TEXT NOT NULL          -- 'reservation_released'
title       TEXT NOT NULL
body        TEXT NOT NULL
data        JSONB                  -- { spot_id, spot_label, date, owner_name, booking_id }
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
read_at     TIMESTAMPTZ            -- set when seen in web popover OR delivered via bot
pushed_at   TIMESTAMPTZ            -- set when proactive DM succeeds
```

Index: `(user_id, read_at)` for the unread-first list query.

## API

### Modified — `PUT /api/owners/me/spots/:spotId/day-status`

`backend/src/routes/owners.ts:176`

- Wrap the upsert in a transaction (currently plain `pool.query`).
- On `status='occupied'`: find conflicting non-owner active bookings
  (`WHERE spot_id=$1 AND status='active' AND expires_at::date=$2::date`, excluding
  co-owner bookings), cancel each, free the spot if needed, insert notification
  rows.
- Response gains `released: [{ booking_id, reserved_by }]` (empty array when none).
- Fire proactive DMs after commit.

### New — notifications

- `GET /api/notifications` — `requireAuth`, current user's rows, unread first.
- `PATCH /api/notifications/:id/read` — mark one read (owner-scoped).
- `PATCH /api/notifications/read-all` — mark all read (optional convenience).

## Notification delivery (3 layers)

1. **Proactive DM** — new `backend/src/lib/rocketchatNotify.ts`:
   `pushChatMessage({ handle, text })` POSTs
   `{ channel: '@<handle>', text }` to
   `process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL`.
   - Secret: env only, never logged, never sent to the frontend.
   - try/catch, never throws to the caller, returns success boolean → sets
     `pushed_at`.
   - If the env var is unset or the handle can't be resolved, it no-ops.
   - Target handle = `bookings.user_id` (== `preferred_username` == RC handle,
     same SSO).
2. **In-app bell** — header bell + popover, unread badge, opening marks read.
   Shows all `read_at IS NULL` (durable record even when the DM succeeded).
3. **Bot fallback** — the RocketChat integration handler
   (`backend/src/routes/integrations.ts`) prepends, to its next reply, any
   notifications that are `read_at IS NULL AND pushed_at IS NULL` (i.e. the
   proactive push failed or the handle was unresolved), then marks them read.
   This prevents double-notifying a user who already got the DM.

## Frontend

- **Reclaim confirm dialog** — when the targeted spot is currently reserved, the
  owner day-status action first shows:
  *"This spot is reserved by {name} — reclaiming releases their reservation.
  Continue?"* On success, a toast: *"Released {name}'s reservation."*
- **Notification bell + popover** — adapt the Jakob notification popover concept
  using shadcn/ui (no Mantine), wired to `GET /api/notifications` and
  `PATCH .../read` via a React Query hook in the existing `hooks/` + `api/`
  structure.

## Copy (English)

- Notification title: `Reservation released`
- Notification / DM body:
  `Your reservation for {spot_label} on {date} was released because the owner
  reclaimed the spot.`
- Bot prepend prefix: `⚠️ {body}`

## Edge cases

- Booking under a stale identity key: auto-release still works (matched by
  `spot_id + date`, not user); the in-app row is still written; the DM no-ops if
  the handle can't resolve; the bot fallback covers it on next interaction.
- `ROCKETCHAT_INCOMING_WEBHOOK_URL` unset → push skipped; in-app + bot fallback
  still function.
- DM channel-override (`@user`) not permitted by the RC integration config →
  verify against the live integration; fallback is posting to a channel that
  @-mentions the user. (Confirm during implementation.)

## Testing (TDD)

Backend (tests first):

- `occupied` with a conflicting non-owner active booking → booking cancelled,
  spot freed (or kept `reserved` when another active booking remains),
  notification row created, `released` populated in the response.
- `occupied` with the owner's own/co-owner booking present → untouched.
- `occupied` with no booking, and `free` / `null` → unchanged behavior.
- `GET /api/notifications` ordering + scoping; `PATCH .../read` scoping.
- `rocketchatNotify` with mocked `fetch`: success sets `pushed_at`; failure is
  logged, does not throw, does not roll back the release.
- Bot prepend: an unread + unpushed notification is prepended to the reply and
  marked read; an already-pushed one is not prepended.

Frontend:

- Notification bell renders unread count + popover list; opening marks read.
- Reclaim confirm dialog appears only when the spot is reserved; toast on success.

Run: `bun run build`, `bun run lint`, `bun test` (backend); `bun run fix`
(frontend).

## Docs

This repo has no `BUSINESS_RULES.md` / versioned doc system, so the rule is
recorded here (the design doc of record) rather than via the `doc-update` skill.

---

## Amendment (2026-06-12): re-targeted to **notify-on-cancel**

During implementation we discovered the original hook (owner sets day-status →
`occupied`) is **not** how owners actually reclaim a spot in the app:

- `computeDayStatus` returns `reserved` whenever an active booking exists, so the
  owner-parking "Occupy" button (which only renders on `free`) is **unreachable**
  once a non-owner has booked.
- "Occupy" never set day-status anyway — it created an owner self-booking
  (`POST /api/bookings`, deliberately, for co-owner map attribution + intervals).
- The **real, reachable** in-app reclaim is the **"Cancel reservation"** button
  on a `reserved` spot, which cancels the squatter's booking via
  `PATCH /api/bookings/:id/cancel` (a spot owner is already allowed to cancel a
  non-owner booking). The release already happens — only the **notification** was
  missing.

**Final implemented behavior:** when a booking is cancelled by someone other than
its owner (spot owner reclaiming, or an admin) via `PATCH /api/bookings/:id/cancel`,
the handler writes a `notifications` row for the bumped user inside the cancel
transaction and fires a best-effort proactive RocketChat DM after commit; the
response gains `{ notified: boolean }`. The owner's cancel toast confirms the user
was notified. All notification infrastructure (table, DM helper, `/api/notifications`
endpoints, web bell, bot-`status` fallback) is unchanged and reused.

The day-status auto-release (original Task 3) and the owner-occupy repoint
(original Task 8) were **reverted**. `POST /api/bookings` co-owner self-book and
timesheet-driven conflicts remain out of scope.

**Business rule (recorded):** A spot owner (or admin) cancelling a non-owner's
reservation auto-notifies the bumped user via in-app notification + proactive
RocketChat DM, with a bot-`status` fallback. Co-owners' own bookings can't be
cancelled by another co-owner. Users cancelling their own booking are not notified.

**Verified (2026-06-12):** the outbound incoming webhook accepts `channel:"@<handle>"`
and returns `{success:true}` — proactive `@user` DMs are deliverable. Notification
copy is English.

import { pool } from '../db/pool.js'
import { pushChatMessage } from './rocketchatNotify.js'

// Constant advisory-lock keys — guard against overlapping ticks / multiple
// app instances running a batch at the same time. One key per batch so the
// morning and owner ticks never block each other.
const LOCK_KEY = 4730247
const OWNER_LOCK_KEY = 4730248

const TZ = process.env.REMINDER_TZ ?? 'Europe/Ljubljana'
const MORNING_TIME = process.env.REMINDER_MORNING_TIME ?? '07:30'
// Afternoon nudge to every spot owner — "free your spot if you won't need it".
const OWNER_TIME = process.env.REMINDER_OWNER_TIME ?? '15:00'

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
    AND $1::timestamptz >= (date_trunc('day', $1::timestamptz AT TIME ZONE $2) + $3::interval) AT TIME ZONE $2
    AND b.booking_date = ($1::timestamptz AT TIME ZONE $2)::date
    AND b.booked_at < (date_trunc('day', $1::timestamptz AT TIME ZONE $2) + $3::interval) AT TIME ZONE $2
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.type = 'reservation_today' AND n.data->>'booking_id' = b.id::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM notification_prefs p
      WHERE p.user_id = b.user_id
        AND p.reminder_type = 'reservation_today'
        AND p.enabled = false
    )
`

interface OwnerRow {
  user_id: string
}

// Every linked parking-spot owner (one row per SSO username, owners.user_id
// holds a comma-separated co-owner list — split + de-duplicated, mirroring
// GET /api/owners/user-ids). Same DST-safe gate/dedup/opt-out shape as
// MORNING_SQL. Params: $1 = now (ISO), $2 = tz, $3 = HH:MM, $4 = local date.
// The gate fires the batch only once the afternoon time has passed locally;
// the dedup is one send per owner per local day (notifications.data->>'date').
const OWNER_SQL = `
  WITH owner_users AS (
    SELECT DISTINCT TRIM(uid) AS user_id
    FROM owners o,
         unnest(string_to_array(o.user_id, ',')) AS uid
    WHERE o.user_id IS NOT NULL
      AND TRIM(uid) <> ''
  )
  SELECT ou.user_id
  FROM owner_users ou
  WHERE $1::timestamptz >= (date_trunc('day', $1::timestamptz AT TIME ZONE $2) + $3::interval) AT TIME ZONE $2
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.type = 'owner_release_spot'
        AND n.user_id = ou.user_id
        AND n.data->>'date' = $4
    )
    AND NOT EXISTS (
      SELECT 1 FROM notification_prefs p
      WHERE p.user_id = ou.user_id
        AND p.reminder_type = 'owner_release_spot'
        AND p.enabled = false
    )
  ORDER BY ou.user_id
`

export async function runReminderTick(
  now: Date = new Date(),
  opts: { dryRun?: boolean } = {},
): Promise<{ count: number; dryRun: boolean }> {
  const dryRun = opts.dryRun ?? false
  const client = await pool.connect()
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [
      LOCK_KEY,
    ])
    if (!lock.rows[0]?.ok) {
      console.log('[reminders] another tick holds the lock; skipping')
      return { count: 0, dryRun }
    }
    try {
      const { rows } = await client.query<MorningRow>(MORNING_SQL, [
        now.toISOString(),
        TZ,
        MORNING_TIME,
      ])
      if (dryRun) {
        console.log(
          '[reminders] DRY RUN — would notify ' +
            rows.length +
            ': ' +
            rows.map((r) => r.user_id).join(', '),
        )
        return { count: rows.length, dryRun }
      }
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
                floor: r.floor,
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
      return { count: rows.length, dryRun }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY])
    }
  } finally {
    client.release()
  }
}

// Afternoon batch: DM every parking-spot owner a nudge to free their spot when
// they won't need it. Same structure as runReminderTick (advisory lock, dry
// run, best-effort DM, pushed_at on success) — only the audience, message, and
// dedup key differ.
export async function runOwnerReminderTick(
  now: Date = new Date(),
  opts: { dryRun?: boolean } = {},
): Promise<{ count: number; dryRun: boolean }> {
  const dryRun = opts.dryRun ?? false
  // Local Slovenian calendar date (YYYY-MM-DD) — the dedup key AND the value
  // stored in the notification's data.date. en-CA renders as ISO yyyy-mm-dd.
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const client = await pool.connect()
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [
      OWNER_LOCK_KEY,
    ])
    if (!lock.rows[0]?.ok) {
      console.log('[reminders] another owner tick holds the lock; skipping')
      return { count: 0, dryRun }
    }
    try {
      const { rows } = await client.query<OwnerRow>(OWNER_SQL, [
        now.toISOString(),
        TZ,
        OWNER_TIME,
        today,
      ])
      if (dryRun) {
        console.log(
          '[reminders] DRY RUN — would remind ' +
            rows.length +
            ' owner(s): ' +
            rows.map((r) => r.user_id).join(', '),
        )
        return { count: rows.length, dryRun }
      }
      const title = 'Free your parking spot?'
      const body =
        'If you won’t be needing your parking spot at some point in the following week, please mark it as available so another colleague can use it.'
      for (const r of rows) {
        try {
          const ins = await client.query<{ id: string }>(
            `INSERT INTO notifications (user_id, type, title, body, data)
             VALUES ($1, 'owner_release_spot', $2, $3, $4::jsonb)
             RETURNING id`,
            [r.user_id, title, body, JSON.stringify({ date: today })],
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
          console.error('[reminders] failed for owner', r.user_id, err)
        }
      }
      if (rows.length > 0) {
        console.log(`[reminders] sent ${rows.length} owner reminder(s)`)
      }
      return { count: rows.length, dryRun }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [OWNER_LOCK_KEY])
    }
  } finally {
    client.release()
  }
}


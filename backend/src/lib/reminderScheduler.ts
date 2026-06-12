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


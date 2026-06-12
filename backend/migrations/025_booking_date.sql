-- 025_booking_date.sql
-- Attribute each booking to a single LOCAL (Europe/Ljubljana) calendar day.
--
-- Day-keyed logic (conflict detection, same-day auto-cancel, per-day map
-- display) previously derived a booking's day from the UTC date of expires_at
-- (expires_at::date). For a late/long web booking whose expiry crosses UTC
-- midnight that resolves to the WRONG day, so the conflict check missed it and
-- two users could hold the same spot for the same day. booking_date is the
-- authoritative day; a partial unique index then makes a double-booking
-- impossible at the database level.

BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_date DATE;

-- Backfill from the local day of starts_at (the intended day) falling back to
-- expires_at for older rows that never stored a start.
UPDATE bookings
SET booking_date =
  (COALESCE(starts_at, expires_at) AT TIME ZONE 'Europe/Ljubljana')::date
WHERE booking_date IS NULL;

-- Resolve any pre-existing duplicate active bookings created by the old
-- UTC-date bug BEFORE enforcing uniqueness — otherwise the unique index below
-- cannot be created. First booker wins (matches the conflict-check semantics:
-- a second booking attempt gets a 409). The losers are marked cancelled with a
-- visible cancelled_by, so the affected user sees "Cancelled by ParkFlow" in
-- their booking history instead of a silent, unexplained expiry.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY spot_id, booking_date
           ORDER BY booked_at ASC
         ) AS rn
  FROM bookings
  WHERE status = 'active'
)
UPDATE bookings
SET status = 'cancelled', ended_at = now(), cancelled_by = 'ParkFlow'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- At most one active booking per spot per day (mirrors the spotted-report index
-- in 023). NULL booking_date rows are excluded by the predicate anyway, and all
-- active rows have it set after the backfill above.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_spot_day
  ON bookings (spot_id, booking_date)
  WHERE status = 'active';

COMMIT;

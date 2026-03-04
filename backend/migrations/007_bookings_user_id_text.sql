-- Migration: change bookings.user_id from UUID (referencing app_users) to TEXT
-- Required because we switched from internal auth to OAuth (Authentik),
-- where the user identifier (sub claim) is a 64-char hex string, not a UUID.

BEGIN;

-- Drop the FK constraint and change column type
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

ALTER TABLE bookings
  ALTER COLUMN user_id TYPE TEXT;

COMMIT;

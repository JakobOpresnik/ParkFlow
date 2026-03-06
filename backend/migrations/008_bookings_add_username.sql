-- Add username column to bookings so we can display who reserved a spot
-- without a round-trip to the identity provider

BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reserved_by TEXT;

COMMIT;

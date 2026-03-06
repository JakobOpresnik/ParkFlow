-- Add starts_at to bookings so we store the full reservation interval
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

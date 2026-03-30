-- 019_booking_owner_flag.sql
-- Tracks whether a booking was made by an owner (or co-owner) of the spot.
-- Used to prevent co-owners from cancelling each other's reservations.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booked_by_owner BOOLEAN NOT NULL DEFAULT false;

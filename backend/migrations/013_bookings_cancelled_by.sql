-- Track who cancelled a booking (owner name or 'self')
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

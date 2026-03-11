-- Add spot type classification (standard, ev, handicap, compact)
ALTER TABLE spots ADD COLUMN type TEXT DEFAULT 'standard'
  CHECK (type IN ('standard', 'ev', 'handicap', 'compact'));

-- Seed the two Tesla EV charging spots in Klet -1
UPDATE spots SET type = 'ev'
  WHERE number IN (5, 6)
    AND lot_id = '10000000-0000-0000-0000-000000000002';

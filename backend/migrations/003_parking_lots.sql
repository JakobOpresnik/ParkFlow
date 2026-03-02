-- ParkFlow multi-lot support
-- Run: psql $DATABASE_URL -f backend/migrations/003_parking_lots.sql

BEGIN;

CREATE TABLE IF NOT EXISTS parking_lots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  image_filename TEXT NOT NULL DEFAULT 'parking-map.png',
  image_width    INTEGER NOT NULL DEFAULT 1200,
  image_height   INTEGER NOT NULL DEFAULT 700,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Seed 3 default lots with deterministic UUIDs
INSERT INTO parking_lots (id, name, sort_order, image_filename) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Zunaj',           0, 'parking-map-outside.png'),
  ('10000000-0000-0000-0000-000000000002', '1. nadstropje',   1, 'klet_1.svg'),
  ('10000000-0000-0000-0000-000000000003', '2. nadstropje',   2, 'klet_2.svg')
ON CONFLICT (id) DO NOTHING;

-- Add lot_id to spots
ALTER TABLE spots ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES parking_lots(id) ON DELETE SET NULL;

-- Assign ALL existing spots to the first lot (Zunaj)
UPDATE spots SET lot_id = '10000000-0000-0000-0000-000000000001' WHERE lot_id IS NULL;

-- Migrate coordinates from spot-coordinates.json into spots.coordinates
-- (default placeholder 2×5 grid, 1200×700 image)
UPDATE spots SET coordinates = '{"points": "30,60 210,60 210,240 30,240"}'     WHERE number = 1  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "240,60 420,60 420,240 240,240"}'   WHERE number = 2  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "450,60 630,60 630,240 450,240"}'   WHERE number = 3  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "660,60 840,60 840,240 660,240"}'   WHERE number = 4  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "870,60 1050,60 1050,240 870,240"}' WHERE number = 5  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "30,360 210,360 210,540 30,540"}'   WHERE number = 6  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "240,360 420,360 420,540 240,540"}' WHERE number = 7  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "450,360 630,360 630,540 450,540"}' WHERE number = 8  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "660,360 840,360 840,540 660,540"}' WHERE number = 9  AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;
UPDATE spots SET coordinates = '{"points": "870,360 1050,360 1050,540 870,540"}' WHERE number = 10 AND lot_id = '10000000-0000-0000-0000-000000000001' AND coordinates IS NULL;

-- Replace global UNIQUE on number with per-lot UNIQUE (number, lot_id)
ALTER TABLE spots DROP CONSTRAINT IF EXISTS spots_number_key;
ALTER TABLE spots ADD CONSTRAINT spots_number_lot_unique UNIQUE (number, lot_id);

COMMIT;

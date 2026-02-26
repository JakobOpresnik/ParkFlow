-- ParkFlow floor map image mapping
-- Run: psql $DATABASE_URL -f backend/migrations/005_floor_map_images.sql

BEGIN;

-- Ensure columns exist (safe for older DBs)
ALTER TABLE parking_lots
  ADD COLUMN IF NOT EXISTS image_filename TEXT NOT NULL DEFAULT 'parking-map.png';

ALTER TABLE parking_lots
  ADD COLUMN IF NOT EXISTS image_width INTEGER NOT NULL DEFAULT 1200;

ALTER TABLE parking_lots
  ADD COLUMN IF NOT EXISTS image_height INTEGER NOT NULL DEFAULT 700;

-- Canonical mapping for current floor-plan assets in frontend/public
-- klet_1.svg and klet_2.svg use a 792x612 canvas.

-- Name-based mapping (preferred)
UPDATE parking_lots
SET image_filename = 'klet_1.svg',
    image_width = 792,
    image_height = 612
WHERE lower(name) IN ('1. nadstropje', 'klet 1', 'klet_1', 'floor 1');

UPDATE parking_lots
SET image_filename = 'klet_2.svg',
    image_width = 792,
    image_height = 612
WHERE lower(name) IN ('2. nadstropje', 'klet 2', 'klet_2', 'floor 2');
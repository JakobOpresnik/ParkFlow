-- ParkFlow initial schema
-- Run: psql $DATABASE_URL -f backend/migrations/001_initial.sql

BEGIN;

CREATE TABLE IF NOT EXISTS owners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  vehicle_plate TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number      INTEGER UNIQUE NOT NULL,
  label       TEXT,
  floor       TEXT DEFAULT 'P1',
  status      TEXT DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
  owner_id    UUID REFERENCES owners(id) ON DELETE SET NULL,
  coordinates JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Seed data ─────────────────────────────────────────────────────────────────

INSERT INTO owners (id, name, email, phone, vehicle_plate, notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ana Kovač',    'ana.kovac@example.com',    '041 111 222', 'LJ 12-345', NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Blaž Novak',   'blaz.novak@example.com',   '040 333 444', 'LJ AB-678', 'Direktor'),
  ('a1000000-0000-0000-0000-000000000003', 'Cvetka Zorec', 'cvetka.zorec@example.com', '031 555 666', 'KR 99-001', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO spots (number, label, floor, status, owner_id) VALUES
  (1,  'A1',  'P1', 'occupied', 'a1000000-0000-0000-0000-000000000001'),
  (2,  'A2',  'P1', 'occupied', 'a1000000-0000-0000-0000-000000000002'),
  (3,  'A3',  'P1', 'reserved', 'a1000000-0000-0000-0000-000000000003'),
  (4,  'A4',  'P1', 'free',     NULL),
  (5,  'A5',  'P1', 'free',     NULL),
  (6,  'B1',  'P1', 'free',     NULL),
  (7,  'B2',  'P1', 'free',     NULL),
  (8,  'B3',  'P1', 'free',     NULL),
  (9,  'B4',  'P1', 'free',     NULL),
  (10, 'B5',  'P1', 'free',     NULL)
ON CONFLICT (number) DO NOTHING;

COMMIT;

-- ParkFlow: real parking data sourced from parkirisca_lastniki.csv
-- Run: psql $DATABASE_URL -f backend/migrations/005_real_parking_data.sql
--
-- Spot numbers match the physical parking card / badge numbers from the CSV.
-- Spots marked PROST / X / PROSTO are inserted as status='free', owner_id=NULL.
-- Spot 'C' (Jernej Borlinić, Klet -1) has no integer number → stored as 999,
--   label='C' to preserve the original identifier.
-- Klet -2 / Reduxi has no assigned number → stored as 998, label='?'.

BEGIN;

-- ── 1. Update lot names to match actual building levels ───────────────────────

UPDATE parking_lots SET
  name        = 'Zunanje parkirišče',
  description = 'Zunanja parkirna mesta',
  sort_order  = 0
WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE parking_lots SET
  name        = 'Klet -1',
  description = 'Podzemna garaža, nivo -1',
  sort_order  = 1
WHERE id = '10000000-0000-0000-0000-000000000002';

UPDATE parking_lots SET
  name        = 'Klet -2',
  description = 'Podzemna garaža, nivo -2',
  sort_order  = 2
WHERE id = '10000000-0000-0000-0000-000000000003';

-- ── 2. Clear placeholder seed data ───────────────────────────────────────────

DELETE FROM spots
WHERE lot_id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

DELETE FROM owners
WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003'
);

-- ── 3. Insert real owners (deterministic UUIDs for idempotency) ───────────────

INSERT INTO owners (id, name) VALUES
  -- Zunanje parkirišče
  ('b0000000-0000-0000-0000-000000000001', 'kontejner - prenova'),
  ('b0000000-0000-0000-0000-000000000002', 'ACEX - kdor prej pride, prej melje'),

  -- Klet -1
  ('b0000000-0000-0000-0000-000000000010', 'Urška Krivc'),
  ('b0000000-0000-0000-0000-000000000011', 'Mitja Gornik'),
  ('b0000000-0000-0000-0000-000000000012', 'Petra Jakovac'),
  ('b0000000-0000-0000-0000-000000000013', 'Tesla S'),
  ('b0000000-0000-0000-0000-000000000014', 'Tesla X'),
  ('b0000000-0000-0000-0000-000000000015', 'Borut Mrak'),
  ('b0000000-0000-0000-0000-000000000016', 'oddano v najem: MIK'),
  ('b0000000-0000-0000-0000-000000000017', 'Marko Stijepić'),
  ('b0000000-0000-0000-0000-000000000018', 'Bernard Sovdat'),
  ('b0000000-0000-0000-0000-000000000019', 'Iztok Kavkler / Jan Grošelj'),
  ('b0000000-0000-0000-0000-000000000020', 'Primož Lukšič'),
  ('b0000000-0000-0000-0000-000000000021', 'Tilen Šarlah'),
  ('b0000000-0000-0000-0000-000000000022', 'Tadeja Gornik'),
  ('b0000000-0000-0000-0000-000000000023', 'Marko Boben'),
  ('b0000000-0000-0000-0000-000000000024', 'Boris Horvat'),
  ('b0000000-0000-0000-0000-000000000025', 'Barbara Kepic'),
  ('b0000000-0000-0000-0000-000000000026', 'Alen Orbanić'),
  ('b0000000-0000-0000-0000-000000000027', 'ARHEA'),
  ('b0000000-0000-0000-0000-000000000028', 'Katarina Rakar'),
  ('b0000000-0000-0000-0000-000000000029', 'Miha Burgar'),
  ('b0000000-0000-0000-0000-000000000030', 'REDUXI - Tomaž Buh'),
  ('b0000000-0000-0000-0000-000000000031', 'REDUXI - Primož Bečan'),
  ('b0000000-0000-0000-0000-000000000032', 'Jernej Borlinić'),

  -- Klet -2
  ('b0000000-0000-0000-0000-000000000040', 'Evgenija Burger'),
  ('b0000000-0000-0000-0000-000000000041', 'Tilen Marc / Demijan Lesjak / Timotej Vesel'),
  ('b0000000-0000-0000-0000-000000000042', 'Boštjan Kovač / Aljaž Konečnik'),
  ('b0000000-0000-0000-0000-000000000043', 'Reduxi')
ON CONFLICT (id) DO NOTHING;

-- ── 4. Insert spots ───────────────────────────────────────────────────────────
-- number  = actual parking spot / card number from the CSV (integer)
-- label   = display string shown on the map (prefixed by level)
-- status  = 'free' for PROST / X / PROSTO entries (owner_id = NULL)

-- Zunanje parkirišče (lot 1)
INSERT INTO spots (number, label, floor, status, owner_id, lot_id) VALUES
  (0,  'Z-0',  'Zunanje', 'occupied', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  (3,  'Z-3',  'Zunanje', 'free', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  (4,  'Z-4',  'Zunanje', 'free', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  (5,  'Z-5',  'Zunanje', 'free', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  (9,  'Z-9',  'Zunanje', 'free', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  (11, 'Z-11', 'Zunanje', 'free', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (number, lot_id) DO UPDATE SET
  label    = EXCLUDED.label,
  floor    = EXCLUDED.floor,
  status   = EXCLUDED.status,
  owner_id = EXCLUDED.owner_id;

-- Klet -1 (lot 2)
INSERT INTO spots (number, label, floor, status, owner_id, lot_id) VALUES
  (2,   'K1-2',  'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002'),
  (3,   'K1-3',  'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002'),
  (4,   'K1-4',  'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002'),
  (5,   'K1-5',  'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002'),
  (6,   'K1-6',  'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000002'),
  (8,   'K1-8',  'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000002'),
  (9,   'K1-9',  'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002'),
  (10,  'K1-10', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000002'),
  (11,  'K1-11', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000002'),
  (18,  'K1-18', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000002'),
  (19,  'K1-19', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000002'),
  (20,  'K1-20', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002'),
  (23,  'K1-23', 'Klet -1', 'free',     NULL,                                   '10000000-0000-0000-0000-000000000002'),
  (24,  'K1-24', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000002'),
  (25,  'K1-25', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000002'),
  (26,  'K1-26', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000002'),
  (27,  'K1-27', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000002'),
  (28,  'K1-28', 'Klet -1', 'free',     NULL,                                   '10000000-0000-0000-0000-000000000002'),
  (29,  'K1-29', 'Klet -1', 'free',     NULL,                                   '10000000-0000-0000-0000-000000000002'),
  (32,  'K1-32', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000002'),
  (33,  'K1-33', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000002'),
  (34,  'K1-34', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000002'),
  (35,  'K1-35', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000002'),
  (36,  'K1-36', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000029', '10000000-0000-0000-0000-000000000002'),
  (38,  'K1-38', 'Klet -1', 'free',     NULL,                                   '10000000-0000-0000-0000-000000000002'),
  (46,  'K1-46', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000002'),
  (47,  'K1-47', 'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000002'),
  -- spot 'C': non-numeric identifier stored as number=999, label='C'
  (999, 'C',     'Klet -1', 'occupied', 'b0000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (number, lot_id) DO UPDATE SET
  label    = EXCLUDED.label,
  floor    = EXCLUDED.floor,
  status   = EXCLUDED.status,
  owner_id = EXCLUDED.owner_id;

-- Klet -2 (lot 3)
INSERT INTO spots (number, label, floor, status, owner_id, lot_id) VALUES
  (50,  'K2-50', 'Klet -2', 'occupied', 'b0000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000003'),
  (56,  'K2-56', 'Klet -2', 'occupied', 'b0000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000003'),
  (95,  'K2-95', 'Klet -2', 'occupied', 'b0000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000003'),
  -- Reduxi: no spot number in CSV → stored as number=999, label='?'
  (999, '?',     'Klet -2', 'occupied', 'b0000000-0000-0000-0000-000000000043', '10000000-0000-0000-0000-000000000003')
ON CONFLICT (number, lot_id) DO UPDATE SET
  label    = EXCLUDED.label,
  floor    = EXCLUDED.floor,
  status   = EXCLUDED.status,
  owner_id = EXCLUDED.owner_id;

COMMIT;

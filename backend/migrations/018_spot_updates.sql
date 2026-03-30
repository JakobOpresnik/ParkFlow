-- 018_spot_updates.sql
-- Applies parking spot owner reassignments, renumbering, deletions, and new spots
-- to existing databases. Fresh databases pick these up via 005 + 015 directly.
--
-- Changes:
--   Klet -1: 1VP51–54 owners rotated (Urška/Tesla S/Mitja/Petra shuffled)
--   Klet -1: spots #8 and #9 owner swap (Borut Mrak ↔ oddano v najem: MIK)
--   Klet -1: spot #12 (old #8) renumbered back to #8, label=K1-8, new position
--   Klet -1: spot #27 deleted
--   Klet -1: spot #28 owner → Barbara Kepic
--   Klet -2: new spot K2-101 added

DO $$
DECLARE
  lot_0 UUID := (SELECT id FROM parking_lots WHERE name = 'Klet -1');
  lot_1 UUID := (SELECT id FROM parking_lots WHERE name = 'Klet -2');
BEGIN
  -- ── 1VP spot owner reassignments ─────────────────────────────────────────
  --   1VP51 (spot #5): Tesla S       → Urška Krivc
  --   1VP52 (spot #4): Petra Jakovac → Mitja Gornik
  --   1VP53 (spot #3): Mitja Gornik  → Petra Jakovac
  --   1VP54 (spot #2): Urška Krivc   → Tesla S
  UPDATE spots SET owner_id = 'b0000000-0000-0000-0000-000000000010', status = 'occupied'
    WHERE lot_id = lot_0 AND number = 5;  -- 1VP51 → Urška Krivc

  UPDATE spots SET owner_id = 'b0000000-0000-0000-0000-000000000011', status = 'occupied'
    WHERE lot_id = lot_0 AND number = 4;  -- 1VP52 → Mitja Gornik

  UPDATE spots SET owner_id = 'b0000000-0000-0000-0000-000000000012', status = 'occupied'
    WHERE lot_id = lot_0 AND number = 3;  -- 1VP53 → Petra Jakovac

  UPDATE spots SET owner_id = 'b0000000-0000-0000-0000-000000000013', status = 'occupied'
    WHERE lot_id = lot_0 AND number = 2;  -- 1VP54 → Tesla S

  -- ── Spot #8 / #12 rename + owner swap ────────────────────────────────────
  -- Old DB has this as #12 (renumbered by 015). 015 restores it to #8 on the
  -- same deploy, so match both numbers to be safe.
  UPDATE spots
    SET number   = 8,
        label    = 'K1-8',
        owner_id = 'b0000000-0000-0000-0000-000000000016',
        status   = 'occupied',
        coordinates = '{"x": 0.17583333333333334, "y": 0.41571428571428577, "width": 0.04833333333333333, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND (number = 12 OR number = 8);

  -- ── Spot #9 owner: oddano v najem: MIK → Borut Mrak ─────────────────────
  UPDATE spots SET owner_id = 'b0000000-0000-0000-0000-000000000015', status = 'occupied'
    WHERE lot_id = lot_0 AND number = 9;

  -- ── Delete spot #27 (Barbara Kepic moves to #28) ─────────────────────────
  DELETE FROM spots WHERE lot_id = lot_0 AND number = 27;

  -- ── Spot #28 owner → Barbara Kepic ───────────────────────────────────────
  UPDATE spots
    SET owner_id = 'b0000000-0000-0000-0000-000000000025',
        status   = 'occupied'
    WHERE lot_id = lot_0 AND number = 28;

  -- ── New spot K2-101 in Klet -2 ────────────────────────────────────────────
  INSERT INTO spots (number, label, floor, status, owner_id, lot_id, coordinates)
  VALUES (
    101, 'K2-101', 'Klet -2', 'free', NULL, lot_1,
    '{"x": 0.665, "y": 0.8628571428571428, "width": 0.04833333333333333, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
  )
  ON CONFLICT (number, lot_id) DO UPDATE SET
    label       = EXCLUDED.label,
    coordinates = EXCLUDED.coordinates;
END $$;

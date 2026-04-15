-- 020_spot_changes.sql
-- Delete spot #95 from Klet -2 (permanently removed).
-- Add spot #17 (Z-17) to Zunanje parkirišče.

DELETE FROM spots
WHERE lot_id = (SELECT id FROM parking_lots WHERE name = 'Klet -2')
  AND number = 95;

INSERT INTO spots (number, label, floor, status, owner_id, lot_id)
VALUES (
  17, 'Z-17', 'Zunanje', 'free', NULL,
  (SELECT id FROM parking_lots WHERE name = 'Zunanje parkirišče')
)
ON CONFLICT (number, lot_id) DO UPDATE SET
  label  = EXCLUDED.label,
  floor  = EXCLUDED.floor,
  status = EXCLUDED.status;

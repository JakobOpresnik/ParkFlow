-- 016_rename_klet_lots.sql
-- Rename basement parking lots from "Klet 1/2" to "Klet -1/-2"
-- to reflect that they are below-ground floors.

UPDATE parking_lots SET name = 'Klet -1' WHERE name = 'Klet 1';
UPDATE parking_lots SET name = 'Klet -2' WHERE name = 'Klet 2';

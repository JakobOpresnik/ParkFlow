-- Remove all SVG map coordinates from spots so they can be re-placed on the map.
-- Spot records, owner assignments, statuses, and all other data are untouched.

UPDATE spots SET coordinates = NULL;

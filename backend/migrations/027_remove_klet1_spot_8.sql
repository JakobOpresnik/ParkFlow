-- 027_remove_klet1_spot_8.sql
-- Permanently remove Klet -1 spot #8 (label K1-8, "oddano v najem: MIK").
--
-- The spot was deleted in the running app via the admin panel, but #8 is part
-- of the canonical seed in 005_real_parking_data.sql, so it reappears whenever
-- the database is rebuilt from migrations (fresh volume) or restored from a
-- dump that predates the deletion. Encoding the removal as its own migration
-- makes the deletion reproducible on every fresh bootstrap.
--
-- Runs after 015, which normalizes this spot to number = 8 (older DBs may have
-- had it as #12). Resolves the lot by name like 015 does. Idempotent: deleting
-- an absent row is a no-op. Cascades to the spot's bookings, day-status,
-- spotted reports and audit rows (FKs ON DELETE CASCADE) — matching the admin
-- DELETE /api/spots/:id behaviour.

DELETE FROM spots
WHERE number = 8
  AND lot_id = (SELECT id FROM parking_lots WHERE name = 'Klet -1');

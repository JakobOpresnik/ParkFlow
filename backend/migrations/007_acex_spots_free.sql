-- ParkFlow: ACEX "first come, first serve" spots should default to free
-- Owner 'ACEX - kdor prej pride, prej melje' represents spots available to anyone.

BEGIN;

UPDATE spots
SET status = 'free'
WHERE owner_id = 'b0000000-0000-0000-0000-000000000002';

COMMIT;

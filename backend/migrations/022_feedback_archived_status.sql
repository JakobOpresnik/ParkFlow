-- Add 'archived' to the allowed feedback status values.
BEGIN;

ALTER TABLE feature_requests DROP CONSTRAINT IF EXISTS feature_requests_status_check;

ALTER TABLE feature_requests
  ADD CONSTRAINT feature_requests_status_check
  CHECK (status IN ('open', 'in_progress', 'done', 'dismissed', 'archived'));

COMMIT;

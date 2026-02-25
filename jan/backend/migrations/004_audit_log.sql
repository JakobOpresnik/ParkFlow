-- ParkFlow audit log
-- Run: psql $DATABASE_URL -f backend/migrations/004_audit_log.sql

BEGIN;

CREATE TABLE IF NOT EXISTS spot_changes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id     UUID REFERENCES spots(id) ON DELETE CASCADE,
  changed_by  TEXT DEFAULT 'system',
  change_type TEXT NOT NULL, -- 'owner_assigned' | 'owner_unassigned' | 'status_changed'
  old_value   TEXT,
  new_value   TEXT,
  changed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spot_changes_spot_id_idx ON spot_changes(spot_id);
CREATE INDEX IF NOT EXISTS spot_changes_changed_at_idx ON spot_changes(changed_at DESC);

COMMIT;

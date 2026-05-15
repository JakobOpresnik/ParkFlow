-- 023_spot_spotted_reports.sql
-- User-reported "this spot is taken" flags.
-- A free spot with an active, non-expired report is displayed as 'spotted' in the API.

CREATE TABLE IF NOT EXISTS spot_spotted_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id      UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  reported_by  TEXT NOT NULL,
  reported_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  cleared_by   TEXT,
  cleared_at   TIMESTAMPTZ
);

-- At most one active (not cleared, not expired-at-write) report per spot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_spot_spotted_one_active
  ON spot_spotted_reports (spot_id)
  WHERE cleared_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_spot_spotted_expires
  ON spot_spotted_reports (expires_at)
  WHERE cleared_at IS NULL;

-- Per-day owner overrides for spot availability (tied to timesheet as base)
CREATE TABLE IF NOT EXISTS spot_day_status (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id    UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('free', 'occupied')),
  set_by     TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(spot_id, date)
);

CREATE INDEX IF NOT EXISTS idx_spot_day_status_spot_date
  ON spot_day_status (spot_id, date);

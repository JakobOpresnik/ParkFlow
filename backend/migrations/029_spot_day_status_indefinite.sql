-- date = NULL means "until the owner flips it back" (one indefinite row per spot)
ALTER TABLE spot_day_status ALTER COLUMN date DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS spot_day_status_one_indefinite
  ON spot_day_status (spot_id) WHERE date IS NULL;

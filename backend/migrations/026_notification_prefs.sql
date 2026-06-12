-- 026_notification_prefs.sql
-- Per-user opt-out for scheduled reminder types. Absence of a row = enabled
-- (default-on). user_id matches bookings.user_id / notifications.user_id
-- (== preferred_username == RocketChat handle, same SSO).
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id       TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reminder_type)
);

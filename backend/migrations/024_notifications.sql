-- 024_notifications.sql
-- Durable per-user notifications. user_id matches bookings.user_id
-- (== preferred_username == RocketChat handle, same SSO).
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at    TIMESTAMPTZ,
  pushed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at);

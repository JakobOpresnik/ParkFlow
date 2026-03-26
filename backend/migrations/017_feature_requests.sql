CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'improvement')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

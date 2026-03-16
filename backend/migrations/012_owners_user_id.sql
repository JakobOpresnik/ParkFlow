-- Link owners to SSO users so they can view their parking spots
ALTER TABLE owners ADD COLUMN IF NOT EXISTS user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners (user_id) WHERE user_id IS NOT NULL;

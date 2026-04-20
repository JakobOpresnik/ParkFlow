-- 021_owner_user_ids.sql
-- Link parking spot owners to their SSO user accounts.

UPDATE owners SET user_id = 'nfrumen'
  WHERE id = 'b0000000-0000-0000-0000-000000000033';  -- Nejc Frumen → K1-11

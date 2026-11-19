ALTER TABLE users
  ADD COLUMN avatar_url text,
  ADD COLUMN avatar_public_id text,
  ADD CONSTRAINT users_avatar_pair CHECK ((avatar_url IS NULL) = (avatar_public_id IS NULL));

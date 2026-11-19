ALTER TABLE users
  ADD COLUMN profile_public boolean NOT NULL DEFAULT false,
  ADD COLUMN profile_sharing boolean NOT NULL DEFAULT false,
  ADD COLUMN public_statistics boolean NOT NULL DEFAULT false,
  ADD COLUMN public_cefr boolean NOT NULL DEFAULT false;

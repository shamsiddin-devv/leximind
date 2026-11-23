ALTER TABLE users
  ADD COLUMN public_bio boolean NOT NULL DEFAULT false,
  ADD COLUMN public_social_links boolean NOT NULL DEFAULT false;

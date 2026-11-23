ALTER TABLE users ADD COLUMN social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

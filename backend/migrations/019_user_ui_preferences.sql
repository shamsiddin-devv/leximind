CREATE TABLE user_ui_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  appearance jsonb CHECK (jsonb_typeof(appearance) = 'object'),
  notifications jsonb CHECK (jsonb_typeof(notifications) = 'object'),
  banner_public_id text CHECK (banner_public_id LIKE 'LexiMind/banners/%'),
  CHECK (banner_public_id IS NULL OR appearance IS NOT NULL)
);

CREATE FUNCTION queue_deleted_profile_banner() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO avatar_cleanup_jobs (public_id)
  VALUES (OLD.banner_public_id)
  ON CONFLICT (public_id) DO NOTHING;
  RETURN OLD;
END;
$$;

CREATE TRIGGER user_ui_preferences_cleanup
AFTER DELETE ON user_ui_preferences
FOR EACH ROW
WHEN (OLD.banner_public_id IS NOT NULL)
EXECUTE FUNCTION queue_deleted_profile_banner();

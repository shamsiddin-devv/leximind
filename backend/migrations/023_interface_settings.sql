ALTER TABLE user_ui_preferences
  ADD COLUMN interface_settings jsonb
  CHECK (jsonb_typeof(interface_settings) = 'object');

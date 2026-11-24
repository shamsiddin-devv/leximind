ALTER TABLE user_notifications
  DROP CONSTRAINT user_notifications_type_check,
  ADD CONSTRAINT user_notifications_type_check CHECK (type IN (
    'friend_request', 'friend_accepted', 'review', 'daily', 'streak',
    'achievements', 'progress', 'weekly', 'news'
  ));

CREATE TABLE notification_announcements (
  slug varchar(80) PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title varchar(100) NOT NULL CHECK (btrim(title) <> ''),
  body varchar(500) NOT NULL CHECK (btrim(body) <> ''),
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_ui_preferences_news_opt_in_idx
  ON user_ui_preferences(user_id) WHERE notifications @> '{"news":true}';

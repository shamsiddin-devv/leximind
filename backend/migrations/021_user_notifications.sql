CREATE TABLE user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'friend_request', 'friend_accepted', 'review', 'daily', 'streak',
    'achievements', 'progress', 'weekly'
  )),
  dedupe_key text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK ((actor_id IS NOT NULL) = (type IN ('friend_request', 'friend_accepted'))),
  UNIQUE (user_id, type, dedupe_key)
);

CREATE INDEX user_notifications_owner_created_idx ON user_notifications(user_id, created_at DESC, id DESC);
CREATE INDEX user_notifications_owner_unread_idx ON user_notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX user_notifications_actor_idx ON user_notifications(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX user_notifications_created_idx ON user_notifications(created_at, id);

CREATE TABLE notification_schedules (
  user_id uuid PRIMARY KEY REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
  next_check_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_schedules_due_idx ON notification_schedules(next_check_at, user_id);

INSERT INTO notification_schedules (user_id)
SELECT user_id FROM learner_profiles;

CREATE FUNCTION schedule_learner_notifications() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notification_schedules (user_id) VALUES (NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER learner_notification_schedule
AFTER INSERT ON learner_profiles
FOR EACH ROW EXECUTE FUNCTION schedule_learner_notifications();

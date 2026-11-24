CREATE TABLE notification_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (length(endpoint) BETWEEN 20 AND 2048),
  p256dh varchar(87) NOT NULL,
  auth_secret varchar(22) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_push_owner_idx ON notification_push_subscriptions(user_id);
CREATE INDEX notification_push_session_idx ON notification_push_subscriptions(session_id);

CREATE TABLE notification_delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES user_notifications(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES notification_push_subscriptions(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push', 'email')),
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_id uuid,
  completed_at timestamptz,
  outcome text CHECK (outcome IN ('delivered', 'skipped', 'failed')),
  CHECK ((channel = 'push') = (subscription_id IS NOT NULL)),
  CHECK ((completed_at IS NULL) = (outcome IS NULL)),
  UNIQUE NULLS NOT DISTINCT (notification_id, channel, subscription_id)
);

CREATE INDEX notification_delivery_due_idx ON notification_delivery_jobs(available_at, id) WHERE completed_at IS NULL;
CREATE INDEX notification_delivery_subscription_idx ON notification_delivery_jobs(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX notification_delivery_expiry_idx ON notification_delivery_jobs(expires_at, id);

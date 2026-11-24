CREATE TABLE friendships (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL UNIQUE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pair_low uuid GENERATED ALWAYS AS (least(requester_id, recipient_id)) STORED,
  pair_high uuid GENERATED ALWAYS AS (greatest(requester_id, recipient_id)) STORED,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'closed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK (requester_id <> recipient_id),
  CHECK ((closed_at IS NOT NULL) = (status = 'closed')),
  UNIQUE (pair_low, pair_high)
);

CREATE INDEX friendships_requester_requested_idx ON friendships(requester_id, requested_at DESC, request_id);
CREATE INDEX friendships_recipient_requested_idx ON friendships(recipient_id, requested_at DESC, request_id);

CREATE TABLE friendship_rewards (
  request_id uuid PRIMARY KEY,
  friendship_id uuid UNIQUE REFERENCES friendships(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points smallint NOT NULL CHECK (points IN (0, 50)),
  awarded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX friendship_rewards_user_date_idx ON friendship_rewards(user_id, awarded_at);

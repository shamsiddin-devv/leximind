ALTER TABLE users ADD COLUMN referral_code uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;

CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  reward_xp smallint NOT NULL CHECK (reward_xp > 0),
  registered_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  CHECK (referrer_id <> referred_user_id),
  CHECK (rewarded_at IS NULL OR rewarded_at >= registered_at)
);

CREATE INDEX referrals_referrer_registered_idx ON referrals(referrer_id, registered_at DESC, id DESC);

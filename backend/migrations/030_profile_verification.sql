ALTER TABLE users
  ADD COLUMN administrative_region varchar(100),
  ADD COLUMN street_address varchar(160),
  ADD COLUMN address_details varchar(250),
  ADD COLUMN phone_verified_at timestamptz,
  ADD CONSTRAINT users_verified_phone_requires_number
    CHECK (phone_verified_at IS NULL OR phone_number IS NOT NULL AND phone_number ~ '^[+]998[0-9]{9}$');

CREATE TABLE phone_verification_challenges (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone_number varchar(13) NOT NULL CHECK (phone_number ~ '^[+]998[0-9]{9}$'),
  start_hash char(64) NOT NULL UNIQUE,
  chat_id bigint,
  start_update_id bigint,
  contact_update_id bigint,
  failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX phone_verification_challenges_chat_idx
  ON phone_verification_challenges(chat_id, start_update_id DESC) WHERE chat_id IS NOT NULL;
CREATE INDEX phone_verification_challenges_expiry_idx ON phone_verification_challenges(expires_at);

ALTER TABLE account_actions
  ADD COLUMN otp_hash char(64),
  ADD COLUMN otp_expires_at timestamptz,
  ADD COLUMN otp_attempts smallint NOT NULL DEFAULT 0,
  ADD CONSTRAINT account_actions_otp_state CHECK (
    (otp_hash IS NULL) = (otp_expires_at IS NULL)
    AND otp_attempts BETWEEN 0 AND 5
    AND (otp_hash IS NULL OR otp_hash ~ '^[0-9a-f]{64}$')
    AND (otp_expires_at IS NULL OR otp_expires_at <= expires_at)
  );

CREATE UNIQUE INDEX account_actions_one_code
  ON account_actions(user_id, kind) WHERE otp_hash IS NOT NULL;

ALTER TABLE account_actions
  ALTER COLUMN user_id DROP NOT NULL,
  DROP CONSTRAINT account_actions_kind_check,
  ADD CONSTRAINT account_actions_kind_check CHECK (
    (kind IN ('verify_email', 'reset_password') AND user_id IS NOT NULL)
    OR (kind = 'register' AND user_id IS NULL AND otp_hash IS NOT NULL)
  );

CREATE UNIQUE INDEX account_actions_one_registration
  ON account_actions(email) WHERE kind = 'register';

ALTER TABLE auth_sessions
  ADD COLUMN access_expires_at timestamptz,
  ADD COLUMN refresh_token_hash char(64) UNIQUE,
  ADD CONSTRAINT auth_session_refresh_fields CHECK (
    (access_expires_at IS NULL AND refresh_token_hash IS NULL)
    OR (access_expires_at IS NOT NULL AND refresh_token_hash IS NOT NULL AND access_expires_at <= expires_at)
  );

CREATE TABLE used_session_refresh_tokens (
  token_hash char(64) PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE
);

CREATE INDEX used_session_refresh_tokens_session ON used_session_refresh_tokens(session_id);

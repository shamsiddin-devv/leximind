CREATE TABLE avatar_cleanup_jobs (
  public_id text PRIMARY KEY,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_id uuid
);

CREATE INDEX avatar_cleanup_jobs_due_idx ON avatar_cleanup_jobs(next_attempt_at, public_id);

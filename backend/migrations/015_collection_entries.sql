CREATE TABLE collection_entries (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  kind varchar(8) NOT NULL CHECK (kind IN ('word', 'phrase', 'sentence')),
  text varchar(255) NOT NULL,
  translation varchar(255) NOT NULL,
  example varchar(500) NOT NULL DEFAULT '',
  topic varchar(80) NOT NULL DEFAULT '',
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (deleted_at IS NOT NULL OR (btrim(text) <> '' AND btrim(translation) <> '')),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX collection_entries_user_date ON collection_entries(user_id, created_at DESC, id) WHERE deleted_at IS NULL;

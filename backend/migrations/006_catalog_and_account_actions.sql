CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TYPE game_type ADD VALUE 'sentence_dictation';
ALTER TABLE challenges DROP CONSTRAINT challenges_kind_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_kind_check CHECK
  (kind IN ('assessment','word_span','sequence_memory','meaning_match','visual_grid','word_rush',
    'type_word','finish_sentence','build_sentence','word_dictation','mistake_words','sentence_dictation'));
ALTER TABLE words ADD COLUMN topic varchar(60);
ALTER TABLE word_senses ADD COLUMN example_audio_url text;
CREATE INDEX words_text_trgm ON words USING gin (text gin_trgm_ops);
CREATE INDEX words_level_id ON words(cefr_level, id);
CREATE INDEX words_topic_level_id ON words(topic, cefr_level, id);

ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
CREATE TABLE account_actions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  kind text NOT NULL CHECK (kind IN ('verify_email', 'reset_password')),
  expires_at timestamptz NOT NULL,
  encrypted_token text,
  deliver_after timestamptz NOT NULL DEFAULT now(),
  delivery_attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX account_actions_user_kind ON account_actions(user_id, kind);
CREATE INDEX account_actions_expiry ON account_actions(expires_at);
CREATE INDEX account_actions_delivery ON account_actions(deliver_after) WHERE encrypted_token IS NOT NULL;

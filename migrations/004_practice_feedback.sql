ALTER TYPE game_type ADD VALUE 'type_word';
ALTER TYPE game_type ADD VALUE 'finish_sentence';
ALTER TYPE game_type ADD VALUE 'build_sentence';
ALTER TYPE game_type ADD VALUE 'word_dictation';
ALTER TYPE game_type ADD VALUE 'mistake_words';

ALTER TABLE challenges DROP CONSTRAINT challenges_kind_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_kind_check CHECK
  (kind IN ('assessment','word_span','sequence_memory','meaning_match','visual_grid','word_rush',
    'type_word','finish_sentence','build_sentence','word_dictation','mistake_words'));
ALTER TABLE challenges ADD COLUMN attempts jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(attempts) = 'array');
ALTER TABLE learner_profiles ADD COLUMN feedback_audio_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE game_mistakes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  misses integer NOT NULL CHECK (misses > 0),
  last_missed_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, word_id)
);
CREATE INDEX game_mistakes_recent ON game_mistakes(user_id, last_missed_at DESC, word_id);
CREATE INDEX game_mistakes_word ON game_mistakes(word_id);

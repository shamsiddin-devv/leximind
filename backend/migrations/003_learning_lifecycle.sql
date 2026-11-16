ALTER TABLE cards ADD COLUMN paused_at timestamptz;
CREATE INDEX cards_active_due ON cards(user_id, due, id) WHERE paused_at IS NULL;
CREATE INDEX session_tasks_card ON session_tasks(card_id);

ALTER TABLE sessions DROP CONSTRAINT sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('in_progress', 'completed', 'cancelled'));

ALTER TABLE cards DROP CONSTRAINT cards_word_id_words_id_fkey;
ALTER TABLE cards ADD CONSTRAINT cards_word_id_words_id_fkey
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE RESTRICT;

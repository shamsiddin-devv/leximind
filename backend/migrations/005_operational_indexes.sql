CREATE INDEX cards_word_fk_idx ON cards(word_id);
CREATE INDEX challenges_completed_history_idx
  ON challenges(user_id, (kind = 'assessment'), completed_at DESC, id)
  WHERE completed_at IS NOT NULL;
CREATE INDEX challenges_unfinished_expiry_idx
  ON challenges(expires_at)
  WHERE completed_at IS NULL;

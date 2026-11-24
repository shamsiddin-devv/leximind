SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX cards_collection_owner_date_idx
  ON cards(user_id, created_at DESC, id);

CREATE INDEX sessions_completed_owner_date_idx
  ON sessions(user_id, ended_at)
  WHERE status = 'completed';

CREATE INDEX challenges_completed_game_owner_date_idx
  ON challenges(user_id, completed_at)
  WHERE completed_at IS NOT NULL AND kind <> 'assessment' AND result IS NOT NULL;

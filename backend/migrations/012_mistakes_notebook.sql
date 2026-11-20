CREATE TABLE mistake_notebook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES challenges(id) ON DELETE SET NULL,
  question_index integer NOT NULL CHECK (question_index BETWEEN 0 AND 29),
  kind text NOT NULL,
  question jsonb NOT NULL,
  expected_answer varchar(255) NOT NULL,
  submitted_answer varchar(255),
  reason text CHECK (reason IN ('skipped', 'typo', 'word_order', 'incomplete', 'incorrect')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (challenge_id, question_index)
);

CREATE INDEX mistake_notebook_owner_date ON mistake_notebook_entries(user_id, occurred_at DESC, id);

INSERT INTO mistake_notebook_entries(user_id, challenge_id, question_index, kind, question, expected_answer, reason, occurred_at)
SELECT c.user_id, c.id, f.position::integer - 1, c.kind,
       c.payload->'questions'->(f.position::integer - 1), c.answers->>(f.position::integer - 1), f.feedback->>'mistake',
       coalesce(c.completed_at, c.created_at)
FROM challenges c
CROSS JOIN LATERAL jsonb_array_elements(coalesce(c.result->'feedback', c.attempts))
  WITH ORDINALITY AS f(feedback, position)
WHERE c.kind IN ('meaning_match', 'word_rush', 'type_word', 'mistake_words',
                 'finish_sentence', 'build_sentence', 'word_dictation', 'sentence_dictation')
  AND f.position BETWEEN 1 AND 30
  AND f.feedback->>'correct' = 'false'
  AND c.payload->'questions'->(f.position::integer - 1)->>'prompt' IS NOT NULL
  AND char_length(c.answers->>(f.position::integer - 1)) BETWEEN 1 AND 255;

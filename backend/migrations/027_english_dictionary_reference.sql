CREATE TABLE english_dictionary_reference (
  headword text PRIMARY KEY CHECK (btrim(headword) <> ''),
  senses jsonb NOT NULL CHECK (jsonb_typeof(senses) = 'array' AND jsonb_array_length(senses) > 0)
);

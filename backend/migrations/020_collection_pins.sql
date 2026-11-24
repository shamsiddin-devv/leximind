SET LOCAL lock_timeout = '2s';

ALTER TABLE cards ADD COLUMN collection_pinned boolean;
ALTER TABLE collection_entries ADD COLUMN collection_pinned boolean;

ALTER TABLE learner_profiles
  ADD COLUMN study_level cefr_level,
  ADD COLUMN daily_study_minutes integer NOT NULL DEFAULT 15
    CHECK (daily_study_minutes BETWEEN 5 AND 180),
  ADD COLUMN review_mode varchar(8) NOT NULL DEFAULT 'spaced'
    CHECK (review_mode IN ('spaced', 'random')),
  ADD COLUMN study_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN study_reminder_time varchar(5) NOT NULL DEFAULT '19:00'
    CHECK (study_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD COLUMN autoplay_pronunciation boolean NOT NULL DEFAULT false;

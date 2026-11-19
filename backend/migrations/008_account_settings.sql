ALTER TABLE users
  ADD COLUMN bio varchar(280),
  ADD COLUMN location varchar(100),
  ADD COLUMN gender varchar(20),
  ADD COLUMN phone_number varchar(16),
  ADD CONSTRAINT users_gender_check CHECK (gender IN ('female', 'male', 'other', 'undisclosed')),
  ADD CONSTRAINT users_phone_number_check CHECK (phone_number ~ '^[+][1-9][0-9]{7,14}$');

ALTER TABLE auth_sessions ADD COLUMN user_agent varchar(512);

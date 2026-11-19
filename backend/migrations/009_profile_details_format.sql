ALTER TABLE users
  ADD COLUMN country_code varchar(2),
  ADD COLUMN city varchar(100),
  ADD COLUMN bio_format text,
  ADD CONSTRAINT users_country_code_check CHECK (country_code ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT users_city_country_check CHECK (city IS NULL OR country_code IS NOT NULL),
  ADD CONSTRAINT users_bio_format_size_check CHECK (char_length(bio_format) <= 24576);

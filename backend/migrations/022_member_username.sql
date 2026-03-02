-- Migration 022: Member numeric ID + username for login
-- Adds member_no (BIGSERIAL sequence), username (login name), widens avatar_url to TEXT.
-- Existing members get username = lower(first_name || last_name), de-duped with numeric suffix.

-- 1. Add member_no as auto-incrementing sequence (auto-fills existing rows)
ALTER TABLE member ADD COLUMN IF NOT EXISTS member_no BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_no ON member(member_no);

-- 2. Add username column (nullable initially for population step)
ALTER TABLE member ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- 3. Populate username = lower(firstName + lastName), with _N suffix for duplicates
DO $$
DECLARE
  rec RECORD;
  base_u TEXT;
  candidate TEXT;
  counter INT;
BEGIN
  FOR rec IN SELECT id, first_name, last_name FROM member WHERE username IS NULL ORDER BY id LOOP
    base_u := LOWER(REGEXP_REPLACE(rec.first_name || rec.last_name, '[^a-zA-Z0-9]', '', 'g'));
    IF base_u = '' THEN base_u := rec.id; END IF;
    candidate := base_u;
    counter := 2;
    WHILE EXISTS (SELECT 1 FROM member WHERE LOWER(username) = candidate) LOOP
      candidate := base_u || counter;
      counter := counter + 1;
    END LOOP;
    UPDATE member SET username = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- 4. Enforce NOT NULL and unique case-insensitive constraint
ALTER TABLE member ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_username ON member(LOWER(username));

-- 5. Widen avatar_url from VARCHAR(500) to TEXT to support base64 data URLs
ALTER TABLE member ALTER COLUMN avatar_url TYPE TEXT;

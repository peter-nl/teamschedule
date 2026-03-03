-- Migration 023: Person/Member split
-- Separates global identity (person) from org-membership (member)
-- person.id reuses existing member UUIDs so ctx.user.id = member.id is preserved

-- 1. Create person table
CREATE TABLE IF NOT EXISTS person (
  id            TEXT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  email         VARCHAR(255),
  first_name    VARCHAR(100) NOT NULL DEFAULT '',
  last_name     VARCHAR(100) NOT NULL DEFAULT '',
  particles     VARCHAR(100),
  phone         VARCHAR(50),
  date_of_birth DATE,
  avatar_url    TEXT,
  role          VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Populate person from member (person.id = member.id so JWTs stay valid)
INSERT INTO person (id, username, password_hash, email,
  first_name, last_name, particles, phone, date_of_birth, avatar_url, role)
SELECT id, username, password_hash, email,
  first_name, last_name, particles, phone, date_of_birth, avatar_url,
  CASE WHEN role = 'sysadmin' THEN 'sysadmin' ELSE 'user' END
FROM member
ON CONFLICT (id) DO NOTHING;

-- 3. Add person_id FK to member
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member' AND column_name = 'person_id'
  ) THEN
    ALTER TABLE member ADD COLUMN person_id TEXT REFERENCES person(id) ON DELETE CASCADE;
    UPDATE member SET person_id = id;
    ALTER TABLE member ALTER COLUMN person_id SET NOT NULL;
    CREATE INDEX idx_member_person_id ON member(person_id);
  END IF;
END $$;

-- 4. Drop identity columns from member (idempotent with IF EXISTS)
ALTER TABLE member
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS particles,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS role;

-- 5. Update password_reset_token: rename member_id -> person_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_token' AND column_name = 'member_id'
  ) THEN
    ALTER TABLE password_reset_token RENAME COLUMN member_id TO person_id;
  END IF;
END $$;
DO $$ BEGIN
  ALTER TABLE password_reset_token DROP CONSTRAINT IF EXISTS password_reset_token_member_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'password_reset_token_person_id_fkey'
  ) THEN
    ALTER TABLE password_reset_token
      ADD CONSTRAINT password_reset_token_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Global unique indexes on person
DROP INDEX IF EXISTS idx_member_username;
DROP INDEX IF EXISTS idx_member_email_per_org;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_person_username') THEN
    CREATE UNIQUE INDEX idx_person_username ON person(LOWER(username));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_person_email') THEN
    CREATE UNIQUE INDEX idx_person_email ON person(LOWER(email))
      WHERE email IS NOT NULL AND email <> '';
  END IF;
END $$;

-- Update member table schema
-- 1. Drop foreign key constraints from team_member
ALTER TABLE team_member DROP CONSTRAINT team_member_member_id_fkey;

-- 2. Change member.id from SERIAL to VARCHAR and remove tn column
ALTER TABLE member DROP CONSTRAINT member_pkey;
ALTER TABLE member DROP COLUMN tn;
ALTER TABLE member ALTER COLUMN id TYPE VARCHAR(10);
ALTER TABLE member ADD PRIMARY KEY (id);
ALTER TABLE member ADD COLUMN IF NOT EXISTS particles VARCHAR(50);

-- 3. Update team_member to use VARCHAR for member_id
ALTER TABLE team_member ALTER COLUMN member_id TYPE VARCHAR(10);

-- 4. Re-add foreign key constraint
ALTER TABLE team_member ADD CONSTRAINT team_member_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE;

-- 5. Add index on member id for better query performance
CREATE INDEX IF NOT EXISTS idx_member_id ON member(id);

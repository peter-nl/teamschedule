-- Migration 024: Widen member.id from VARCHAR(10) to TEXT
-- Required because createMember now generates UUID member IDs (36 chars).
-- Existing short IDs (e.g. 'sysadmin', 'pbo124') continue to work unchanged.

-- 1. Drop sequence default temporarily so we can alter the type
ALTER TABLE member ALTER COLUMN id DROP DEFAULT;

-- 2. Widen id column to TEXT
ALTER TABLE member ALTER COLUMN id TYPE TEXT;

-- 3. Restore the sequence default
ALTER TABLE member ALTER COLUMN id SET DEFAULT nextval('worker_id_seq'::regclass);

-- 4. Also widen member_holiday.member_id, member_role.member_id, member_schedule.member_id
--    (FK columns that reference member.id)
ALTER TABLE member_holiday ALTER COLUMN member_id TYPE TEXT;
ALTER TABLE member_role ALTER COLUMN member_id TYPE TEXT;
ALTER TABLE member_schedule ALTER COLUMN member_id TYPE TEXT;
ALTER TABLE team_member ALTER COLUMN member_id TYPE TEXT;

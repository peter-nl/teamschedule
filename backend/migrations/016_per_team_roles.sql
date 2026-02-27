-- Migration 016: Per-team roles and schedule_disabled
-- Replaces flat global roles (orgadmin, teamadmin, member) with:
--   - member_role table for per-team admin roles
--   - schedule_disabled flag on member table
-- member.role simplified to 'sysadmin' | 'user'

-- 1. Add schedule_disabled to member
ALTER TABLE member ADD COLUMN IF NOT EXISTS schedule_disabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Create member_role table
CREATE TABLE IF NOT EXISTS member_role (
  id              SERIAL PRIMARY KEY,
  member_id       VARCHAR(10) NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('orgadmin', 'teamadmin')),
  organisation_id INTEGER     NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
  team_id         INTEGER     REFERENCES team(id) ON DELETE CASCADE
);

-- One orgadmin entry per member per org (team_id must be NULL for orgadmin)
CREATE UNIQUE INDEX IF NOT EXISTS member_role_orgadmin_unique
  ON member_role(member_id, organisation_id) WHERE role = 'orgadmin';

-- One teamadmin entry per member per team
CREATE UNIQUE INDEX IF NOT EXISTS member_role_teamadmin_unique
  ON member_role(member_id, team_id) WHERE role = 'teamadmin';

-- 3. Migrate existing orgadmin roles → member_role
INSERT INTO member_role (member_id, role, organisation_id, team_id)
SELECT id, 'orgadmin', organisation_id, NULL
FROM member
WHERE role = 'orgadmin' AND organisation_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Migrate existing teamadmin → orgadmin in member_role
--    (they currently managed all teams, so orgadmin is the closest equivalent)
INSERT INTO member_role (member_id, role, organisation_id, team_id)
SELECT id, 'orgadmin', organisation_id, NULL
FROM member
WHERE role = 'teamadmin' AND organisation_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Simplify member.role: all non-sysadmin roles become 'user'
UPDATE member SET role = 'user' WHERE role IN ('orgadmin', 'teamadmin', 'member');

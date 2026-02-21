-- Migration 015: Add organisations, org_setting, and expand roles
-- Existing data is assigned to a new "Demo" organisation.
-- Roles: 'user' → 'member', 'manager' → 'orgadmin'
-- A sysadmin member is created (default password: Admin1234!)

-- 1. Create organisation table
CREATE TABLE IF NOT EXISTS organisation (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed the Demo organisation
INSERT INTO organisation (name) VALUES ('Demo');

-- 3. Add organisation_id to team, assign all existing teams to Demo
ALTER TABLE team ADD COLUMN IF NOT EXISTS organisation_id INTEGER REFERENCES organisation(id);
UPDATE team SET organisation_id = (SELECT id FROM organisation WHERE name = 'Demo');
ALTER TABLE team ALTER COLUMN organisation_id SET NOT NULL;

-- 4. Add organisation_id to member (nullable — sysadmin has no org)
ALTER TABLE member ADD COLUMN IF NOT EXISTS organisation_id INTEGER REFERENCES organisation(id);
UPDATE member SET organisation_id = (SELECT id FROM organisation WHERE name = 'Demo');

-- 5. Add organisation_id to holiday_type, assign all existing types to Demo
ALTER TABLE holiday_type ADD COLUMN IF NOT EXISTS organisation_id INTEGER REFERENCES organisation(id);
UPDATE holiday_type SET organisation_id = (SELECT id FROM organisation WHERE name = 'Demo');
ALTER TABLE holiday_type ALTER COLUMN organisation_id SET NOT NULL;

-- 6. Create org_setting table (per-org key-value store)
CREATE TABLE IF NOT EXISTS org_setting (
  organisation_id INTEGER NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
  key             VARCHAR(100) NOT NULL,
  value           TEXT,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organisation_id, key)
);

-- 7. Migrate org-specific settings from app_setting → org_setting (Demo org)
INSERT INTO org_setting (organisation_id, key, value, updated_at)
SELECT
  (SELECT id FROM organisation WHERE name = 'Demo'),
  key,
  value,
  updated_at
FROM app_setting
WHERE key NOT IN ('smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from')
ON CONFLICT (organisation_id, key) DO NOTHING;

-- 8. Remove migrated keys from app_setting (SMTP keys stay)
DELETE FROM app_setting
WHERE key NOT IN ('smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from');

-- 9. Update member roles: 'user' → 'member', 'manager' → 'orgadmin'
UPDATE member SET role = 'member'  WHERE role = 'user';
UPDATE member SET role = 'orgadmin' WHERE role = 'manager';

-- 10. Insert sysadmin (no organisation, default password: Admin1234!)
INSERT INTO member (id, first_name, last_name, role, organisation_id, password_hash)
VALUES (
  'sysadmin',
  'System',
  'Admin',
  'sysadmin',
  NULL,
  '$2b$10$ZwrKM7fy0pLaYBOEohLMoeZsoz1iqDuiAw4wifoKqcOyhkq/87jw2'
)
ON CONFLICT (id) DO NOTHING;

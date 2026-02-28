-- Migration 017: Fix holiday_type name uniqueness to be per-organisation
-- The original UNIQUE constraint on name alone prevented multiple orgs from
-- having holiday types with the same name (e.g. both wanting a "Vacation" type).

-- Drop the global unique constraint created in migration 006
ALTER TABLE holiday_type DROP CONSTRAINT IF EXISTS holiday_type_name_key;

-- Add a per-organisation unique index (allows same name in different orgs)
CREATE UNIQUE INDEX IF NOT EXISTS holiday_type_name_org_unique
  ON holiday_type(name, organisation_id);

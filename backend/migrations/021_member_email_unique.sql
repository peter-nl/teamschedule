-- Migration 021: Unique email per organisation
-- The same email address may be used across different organisations,
-- but must be unique within one organisation. NULL emails are excluded.

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_email_per_org
  ON member (LOWER(email), organisation_id)
  WHERE email IS NOT NULL AND email <> '';

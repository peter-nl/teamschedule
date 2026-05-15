-- Migration 026: Remove username, use email as login identifier
-- For sysadmin (no email), set email = 'sysadmin' so they can still log in
UPDATE person SET email = 'sysadmin'
  WHERE role = 'sysadmin';

DROP INDEX IF EXISTS idx_person_username;

ALTER TABLE person DROP COLUMN IF EXISTS username;

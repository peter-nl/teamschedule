-- Add email address field to member table
ALTER TABLE member ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add email address field to worker table
ALTER TABLE worker ADD COLUMN IF NOT EXISTS email VARCHAR(255);

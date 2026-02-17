-- Add role field to member table
-- Valid values: 'user' or 'manager'
ALTER TABLE member ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Set pbo124 as manager
UPDATE member SET role = 'manager' WHERE id = 'pbo124';

-- Add role field to worker table
-- Valid values: 'user' or 'manager'
ALTER TABLE worker ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Set pbo124 as manager
UPDATE worker SET role = 'manager' WHERE id = 'pbo124';

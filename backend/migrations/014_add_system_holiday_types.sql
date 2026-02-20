-- Add is_system flag to holiday_type to mark built-in non-deletable types
ALTER TABLE holiday_type ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Seed the "No contract" system type
INSERT INTO holiday_type (name, color_light, color_dark, sort_order, is_system)
VALUES ('Geen contract', '#9e9e9e', '#616161', 1000, true)
ON CONFLICT (name) DO UPDATE SET is_system = true;

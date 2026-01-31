-- Create holiday_type table
CREATE TABLE IF NOT EXISTS holiday_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color_light VARCHAR(7) NOT NULL DEFAULT '#c8e6c9',
  color_dark VARCHAR(7) NOT NULL DEFAULT '#2e7d32',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default "Vakantie" type
INSERT INTO holiday_type (name, color_light, color_dark, sort_order)
VALUES ('Vakantie', '#c8e6c9', '#2e7d32', 0)
ON CONFLICT (name) DO NOTHING;

-- Add holiday_type_id to worker_holiday
ALTER TABLE worker_holiday
  ADD COLUMN IF NOT EXISTS holiday_type_id INTEGER REFERENCES holiday_type(id) ON DELETE SET NULL;

-- Backfill existing holidays with the "Vakantie" type
UPDATE worker_holiday
  SET holiday_type_id = (SELECT id FROM holiday_type WHERE name = 'Vakantie')
  WHERE holiday_type_id IS NULL;

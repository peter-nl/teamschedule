-- Add day_part column to worker_holiday table
-- Values: 'full' (default), 'morning', 'afternoon'
ALTER TABLE worker_holiday
  ADD COLUMN IF NOT EXISTS day_part VARCHAR(10) NOT NULL DEFAULT 'full';

-- Validate day_part values
ALTER TABLE worker_holiday
  ADD CONSTRAINT chk_day_part CHECK (day_part IN ('full', 'morning', 'afternoon'));

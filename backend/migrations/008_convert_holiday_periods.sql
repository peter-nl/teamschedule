-- Convert member_holiday from per-day to period-based storage

-- 1. Drop existing constraints
ALTER TABLE member_holiday DROP CONSTRAINT IF EXISTS member_holiday_member_id_date_key;
ALTER TABLE member_holiday DROP CONSTRAINT IF EXISTS chk_day_part;

-- 2. Rename 'date' to 'start_date'
ALTER TABLE member_holiday RENAME COLUMN date TO start_date;

-- 3. Add 'end_date', backfill from start_date
ALTER TABLE member_holiday ADD COLUMN IF NOT EXISTS end_date DATE;
UPDATE member_holiday SET end_date = start_date;
ALTER TABLE member_holiday ALTER COLUMN end_date SET NOT NULL;

-- 4. Rename 'day_part' to 'start_day_part'
ALTER TABLE member_holiday RENAME COLUMN day_part TO start_day_part;

-- 5. Add 'end_day_part', backfill from start_day_part
ALTER TABLE member_holiday ADD COLUMN IF NOT EXISTS end_day_part VARCHAR(10) NOT NULL DEFAULT 'full';
UPDATE member_holiday SET end_day_part = start_day_part;

-- 6. Add check constraints
ALTER TABLE member_holiday
  ADD CONSTRAINT chk_start_day_part CHECK (start_day_part IN ('full', 'morning', 'afternoon'));
ALTER TABLE member_holiday
  ADD CONSTRAINT chk_end_day_part CHECK (end_day_part IN ('full', 'morning', 'afternoon'));
ALTER TABLE member_holiday
  ADD CONSTRAINT chk_date_range CHECK (end_date >= start_date);

-- 7. Drop old indexes and create new ones
DROP INDEX IF EXISTS idx_member_holiday_date;
DROP INDEX IF EXISTS idx_member_holiday_member_date;
CREATE INDEX IF NOT EXISTS idx_member_holiday_start_date ON member_holiday(start_date);
CREATE INDEX IF NOT EXISTS idx_member_holiday_end_date ON member_holiday(end_date);
CREATE INDEX IF NOT EXISTS idx_member_holiday_member_dates ON member_holiday(member_id, start_date, end_date);

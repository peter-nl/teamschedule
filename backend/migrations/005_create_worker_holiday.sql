-- Create member_holiday table for personal/vacation days
CREATE TABLE IF NOT EXISTS member_holiday (
  id SERIAL PRIMARY KEY,
  member_id VARCHAR(10) NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, date)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_member_holiday_member_id ON member_holiday(member_id);
CREATE INDEX IF NOT EXISTS idx_member_holiday_date ON member_holiday(date);
CREATE INDEX IF NOT EXISTS idx_member_holiday_member_date ON member_holiday(member_id, date);

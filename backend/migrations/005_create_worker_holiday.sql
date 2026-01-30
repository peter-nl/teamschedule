-- Create worker_holiday table for personal/vacation days
CREATE TABLE IF NOT EXISTS worker_holiday (
  id SERIAL PRIMARY KEY,
  worker_id VARCHAR(10) NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(worker_id, date)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_worker_holiday_worker_id ON worker_holiday(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_holiday_date ON worker_holiday(date);
CREATE INDEX IF NOT EXISTS idx_worker_holiday_worker_date ON worker_holiday(worker_id, date);

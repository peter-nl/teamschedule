-- Migration 013: Create member_schedule table for individual work schedules
-- Each member can have a bi-weekly rotating schedule (week1/week2 alternating)

CREATE TABLE IF NOT EXISTS member_schedule (
  member_id VARCHAR(10) PRIMARY KEY REFERENCES member(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  week1 JSONB NOT NULL,
  week2 JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

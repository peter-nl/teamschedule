-- Migration to rename worker-related tables and columns to member
-- This migration is for existing deployed databases

-- 1. Rename tables
ALTER TABLE IF EXISTS worker RENAME TO member;
ALTER TABLE IF EXISTS team_worker RENAME TO team_member;
ALTER TABLE IF EXISTS worker_holiday RENAME TO member_holiday;

-- 2. Rename columns in team_member table
ALTER TABLE IF EXISTS team_member RENAME COLUMN worker_id TO member_id;

-- 3. Rename columns in member_holiday table
ALTER TABLE IF EXISTS member_holiday RENAME COLUMN worker_id TO member_id;

-- 4. Rename column in password_reset_token table
ALTER TABLE IF EXISTS password_reset_token RENAME COLUMN worker_id TO member_id;

-- 5. Rename indexes
ALTER INDEX IF EXISTS idx_worker_tn RENAME TO idx_member_tn;
ALTER INDEX IF EXISTS idx_worker_id RENAME TO idx_member_id;
ALTER INDEX IF EXISTS idx_team_worker_team_id RENAME TO idx_team_member_team_id;
ALTER INDEX IF EXISTS idx_team_worker_worker_id RENAME TO idx_team_member_member_id;
ALTER INDEX IF EXISTS idx_worker_holiday_worker_id RENAME TO idx_member_holiday_member_id;
ALTER INDEX IF EXISTS idx_worker_holiday_date RENAME TO idx_member_holiday_date;
ALTER INDEX IF EXISTS idx_worker_holiday_worker_date RENAME TO idx_member_holiday_member_date;
ALTER INDEX IF EXISTS idx_worker_holiday_start_date RENAME TO idx_member_holiday_start_date;
ALTER INDEX IF EXISTS idx_worker_holiday_end_date RENAME TO idx_member_holiday_end_date;
ALTER INDEX IF EXISTS idx_worker_holiday_worker_dates RENAME TO idx_member_holiday_member_dates;

-- 6. Rename constraints (use original names - before any column renames)
ALTER TABLE IF EXISTS team_member RENAME CONSTRAINT team_worker_pkey TO team_member_pkey;
ALTER TABLE IF EXISTS team_member RENAME CONSTRAINT team_worker_team_id_fkey TO team_member_team_id_fkey;
ALTER TABLE IF EXISTS team_member RENAME CONSTRAINT team_worker_worker_id_fkey TO team_member_member_id_fkey;
ALTER TABLE IF EXISTS team_member RENAME CONSTRAINT team_worker_team_id_worker_id_key TO team_member_team_id_member_id_key;

ALTER TABLE IF EXISTS member RENAME CONSTRAINT worker_pkey TO member_pkey;

ALTER TABLE IF EXISTS member_holiday RENAME CONSTRAINT worker_holiday_pkey TO member_holiday_pkey;
ALTER TABLE IF EXISTS member_holiday RENAME CONSTRAINT worker_holiday_worker_id_fkey TO member_holiday_member_id_fkey;

ALTER TABLE IF EXISTS password_reset_token RENAME CONSTRAINT password_reset_token_worker_id_fkey TO password_reset_token_member_id_fkey;

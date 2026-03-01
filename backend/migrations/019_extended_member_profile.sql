-- Migration 019: Extended member profile fields
-- Adds phone, date_of_birth, and avatar_url to the member table.
-- All columns are nullable; existing members are unaffected.

ALTER TABLE member
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

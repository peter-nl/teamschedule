-- Add demo organisation support
ALTER TABLE organisation
  ADD COLUMN IF NOT EXISTS is_demo         BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_email      VARCHAR(255);

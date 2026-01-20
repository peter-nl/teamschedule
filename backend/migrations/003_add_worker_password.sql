-- Add password field to worker table for authentication
ALTER TABLE worker ADD COLUMN password_hash VARCHAR(255);

-- Set default password 'abc123' for all existing workers
-- This is a pre-computed bcrypt hash (10 rounds) of 'abc123'
UPDATE worker SET password_hash = '$2b$10$rQZ8kHKX.V8KQPHbLrQx1.YQYqGc4F0vF8VhKz6G0HxXhBnKBpNnG';

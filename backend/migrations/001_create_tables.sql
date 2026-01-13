-- Create team table
CREATE TABLE IF NOT EXISTS team (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Create worker table
CREATE TABLE IF NOT EXISTS worker (
  id SERIAL PRIMARY KEY,
  tn VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL
);

-- Create team_worker junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS team_worker (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  UNIQUE(team_id, worker_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_worker_team_id ON team_worker(team_id);
CREATE INDEX IF NOT EXISTS idx_team_worker_worker_id ON team_worker(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_tn ON worker(tn);

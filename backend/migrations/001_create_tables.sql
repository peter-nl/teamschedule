-- Create team table
CREATE TABLE IF NOT EXISTS team (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Create member table
CREATE TABLE IF NOT EXISTS member (
  id SERIAL PRIMARY KEY,
  tn VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL
);

-- Create team_member junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS team_member (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  UNIQUE(team_id, member_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_member_team_id ON team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_member_id ON team_member(member_id);
CREATE INDEX IF NOT EXISTS idx_member_tn ON member(tn);

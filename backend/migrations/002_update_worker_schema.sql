-- Update worker table schema
-- 1. Drop foreign key constraints from team_worker
ALTER TABLE team_worker DROP CONSTRAINT team_worker_worker_id_fkey;

-- 2. Change worker.id from SERIAL to VARCHAR and remove tn column
ALTER TABLE worker DROP CONSTRAINT worker_pkey;
ALTER TABLE worker DROP COLUMN tn;
ALTER TABLE worker ALTER COLUMN id TYPE VARCHAR(10);
ALTER TABLE worker ADD PRIMARY KEY (id);
ALTER TABLE worker ADD COLUMN particles VARCHAR(50);

-- 3. Update team_worker to use VARCHAR for worker_id
ALTER TABLE team_worker ALTER COLUMN worker_id TYPE VARCHAR(10);

-- 4. Re-add foreign key constraint
ALTER TABLE team_worker ADD CONSTRAINT team_worker_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES worker(id) ON DELETE CASCADE;

-- 5. Add index on worker id for better query performance
CREATE INDEX IF NOT EXISTS idx_worker_id ON worker(id);

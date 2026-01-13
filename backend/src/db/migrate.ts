import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function runMigrations(pool: Pool): Promise<void> {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if migration has already been run
      const result = await pool.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${file}`);

        // Read and execute migration
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        );

        await pool.query(migrationSQL);

        // Record migration as executed
        await pool.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );

        console.log(`✓ Migration ${file} completed`);
      } else {
        console.log(`⊘ Migration ${file} already executed`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

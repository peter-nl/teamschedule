import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';

dotenv.config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection and run migrations
pool.connect(async (err, _client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL database');
    release();

    // Run migrations
    try {
      await runMigrations(pool);
    } catch (error) {
      console.error('Failed to run migrations:', error);
    }
  }
});

// GraphQL type definitions
const typeDefs = `#graphql
  type Team {
    id: ID!
    name: String!
    workers: [Worker!]!
  }

  type Worker {
    id: ID!
    firstName: String!
    lastName: String!
    particles: String
    teams: [Team!]!
  }

  type Query {
    hello: String
    testDatabase: String
    teams: [Team!]!
    team(id: ID!): Team
    workers: [Worker!]!
    worker(id: ID!): Worker
  }

  type Mutation {
    ping: String
    createTeam(name: String!): Team!
    createWorker(id: String!, firstName: String!, lastName: String!, particles: String): Worker!
    addWorkerToTeam(teamId: ID!, workerId: ID!): Team!
    removeWorkerFromTeam(teamId: ID!, workerId: ID!): Team!
    deleteTeam(id: ID!): Boolean!
    deleteWorker(id: ID!): Boolean!
  }
`;

// GraphQL resolvers
const resolvers = {
  Query: {
    hello: () => 'Hello from Teamschedule Apollo Server!',
    testDatabase: async () => {
      try {
        const result = await pool.query('SELECT NOW()');
        return `Database connected! Current time: ${result.rows[0].now}`;
      } catch (error) {
        return `Database error: ${error}`;
      }
    },
    teams: async () => {
      const result = await pool.query('SELECT * FROM team ORDER BY name');
      return result.rows;
    },
    team: async (_: any, { id }: { id: number }) => {
      const result = await pool.query('SELECT * FROM team WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    workers: async () => {
      const result = await pool.query('SELECT * FROM worker ORDER BY last_name, first_name');
      return result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
      }));
    },
    worker: async (_: any, { id }: { id: string }) => {
      const result = await pool.query('SELECT * FROM worker WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
      };
    },
  },
  Mutation: {
    ping: () => 'pong',
    createTeam: async (_: any, { name }: { name: string }) => {
      const result = await pool.query(
        'INSERT INTO team (name) VALUES ($1) RETURNING *',
        [name]
      );
      return result.rows[0];
    },
    createWorker: async (_: any, { id, firstName, lastName, particles }: { id: string; firstName: string; lastName: string; particles?: string }) => {
      const result = await pool.query(
        'INSERT INTO worker (id, first_name, last_name, particles) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, firstName, lastName, particles || null]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
      };
    },
    addWorkerToTeam: async (_: any, { teamId, workerId }: { teamId: number; workerId: number }) => {
      await pool.query(
        'INSERT INTO team_worker (team_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [teamId, workerId]
      );
      const result = await pool.query('SELECT * FROM team WHERE id = $1', [teamId]);
      return result.rows[0];
    },
    removeWorkerFromTeam: async (_: any, { teamId, workerId }: { teamId: number; workerId: number }) => {
      await pool.query(
        'DELETE FROM team_worker WHERE team_id = $1 AND worker_id = $2',
        [teamId, workerId]
      );
      const result = await pool.query('SELECT * FROM team WHERE id = $1', [teamId]);
      return result.rows[0];
    },
    deleteTeam: async (_: any, { id }: { id: number }) => {
      const result = await pool.query('DELETE FROM team WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },
    deleteWorker: async (_: any, { id }: { id: number }) => {
      const result = await pool.query('DELETE FROM worker WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },
  },
  Team: {
    workers: async (parent: any) => {
      const result = await pool.query(
        `SELECT w.* FROM worker w
         INNER JOIN team_worker tw ON w.id = tw.worker_id
         WHERE tw.team_id = $1
         ORDER BY w.last_name, w.first_name`,
        [parent.id]
      );
      return result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
      }));
    },
  },
  Worker: {
    teams: async (parent: any) => {
      const result = await pool.query(
        `SELECT t.* FROM team t
         INNER JOIN team_worker tw ON t.id = tw.team_id
         WHERE tw.worker_id = $1
         ORDER BY t.name`,
        [parent.id]
      );
      return result.rows;
    },
  },
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start the server
const startServer = async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4000 },
  });

  console.log(`🚀 Apollo Server ready at: ${url}`);
  console.log(`📊 GraphQL Playground available at: ${url}`);
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

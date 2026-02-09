import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
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
    email: String
    role: String!
    teams: [Team!]!
  }

  type HolidayType {
    id: ID!
    name: String!
    colorLight: String!
    colorDark: String!
    sortOrder: Int!
  }

  type WorkerHoliday {
    id: ID!
    workerId: String!
    startDate: String!
    endDate: String!
    startDayPart: String!
    endDayPart: String!
    description: String
    holidayType: HolidayType
  }

  input WorkerHolidayInput {
    startDate: String!
    endDate: String!
    startDayPart: String!
    endDayPart: String!
    description: String
    holidayTypeId: ID
  }

  type AuthPayload {
    success: Boolean!
    message: String
    worker: Worker
  }

  type Query {
    hello: String
    testDatabase: String
    teams: [Team!]!
    team(id: ID!): Team
    workers: [Worker!]!
    worker(id: ID!): Worker
    holidayTypes: [HolidayType!]!
    workerHolidays(workerId: String!): [WorkerHoliday!]!
    allWorkerHolidays(startDate: String!, endDate: String!): [WorkerHoliday!]!
  }

  type Mutation {
    ping: String
    createTeam(name: String!): Team!
    updateTeam(id: ID!, name: String!): Team
    createWorker(id: String!, firstName: String!, lastName: String!, particles: String, email: String, password: String!): Worker!
    addWorkerToTeam(teamId: ID!, workerId: ID!): Team!
    removeWorkerFromTeam(teamId: ID!, workerId: ID!): Team!
    deleteTeam(id: ID!): Boolean!
    deleteWorker(id: ID!): Boolean!
    login(workerId: String!, password: String!): AuthPayload!
    updateWorkerProfile(id: String!, firstName: String!, lastName: String!, particles: String, email: String): Worker
    changePassword(workerId: String!, currentPassword: String!, newPassword: String!): AuthPayload!
    resetPassword(workerId: String!, newPassword: String!, requesterId: String!): AuthPayload!
    updateWorkerRole(workerId: String!, role: String!, requesterId: String!): Worker
    addWorkerHoliday(workerId: String!, holiday: WorkerHolidayInput!): WorkerHoliday!
    removeWorkerHoliday(id: ID!): Boolean!
    updateWorkerHoliday(id: ID!, holiday: WorkerHolidayInput!): WorkerHoliday!
    createHolidayType(name: String!, colorLight: String!, colorDark: String!): HolidayType!
    updateHolidayType(id: ID!, name: String, colorLight: String, colorDark: String, sortOrder: Int): HolidayType!
    deleteHolidayType(id: ID!): Boolean!
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
        email: row.email,
        role: row.role,
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
        email: row.email,
        role: row.role,
      };
    },
    holidayTypes: async () => {
      const result = await pool.query('SELECT * FROM holiday_type ORDER BY sort_order, name');
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        colorLight: row.color_light,
        colorDark: row.color_dark,
        sortOrder: row.sort_order,
      }));
    },
    workerHolidays: async (_: any, { workerId }: { workerId: string }) => {
      const result = await pool.query(
        `SELECT wh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order
         FROM worker_holiday wh
         LEFT JOIN holiday_type ht ON wh.holiday_type_id = ht.id
         WHERE wh.worker_id = $1 ORDER BY wh.start_date`,
        [workerId]
      );
      return result.rows.map(row => ({
        id: row.id,
        workerId: row.worker_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order,
        } : null,
      }));
    },
    allWorkerHolidays: async (_: any, { startDate, endDate }: { startDate: string; endDate: string }) => {
      const result = await pool.query(
        `SELECT wh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order
         FROM worker_holiday wh
         LEFT JOIN holiday_type ht ON wh.holiday_type_id = ht.id
         WHERE wh.start_date <= $2 AND wh.end_date >= $1
         ORDER BY wh.start_date`,
        [startDate, endDate]
      );
      return result.rows.map(row => ({
        id: row.id,
        workerId: row.worker_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order,
        } : null,
      }));
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
    updateTeam: async (_: any, { id, name }: { id: number; name: string }) => {
      const result = await pool.query(
        'UPDATE team SET name = $1 WHERE id = $2 RETURNING *',
        [name, id]
      );
      return result.rows[0] || null;
    },
    createWorker: async (_: any, { id, firstName, lastName, particles, email, password }: { id: string; firstName: string; lastName: string; particles?: string; email?: string; password: string }) => {
      // Hash the password with bcrypt (10 salt rounds)
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        'INSERT INTO worker (id, first_name, last_name, particles, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [id, firstName, lastName, particles || null, email || null, hashedPassword]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
        email: row.email,
        role: row.role,
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
    login: async (_: any, { workerId, password }: { workerId: string; password: string }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM worker WHERE id = $1',
          [workerId]
        );

        if (result.rows.length === 0) {
          return { success: false, message: 'Worker not found', worker: null };
        }

        const row = result.rows[0];

        // Verify password using bcrypt
        const passwordValid = await bcrypt.compare(password, row.password_hash);
        if (!passwordValid) {
          return { success: false, message: 'Invalid password', worker: null };
        }

        return {
          success: true,
          message: 'Login successful',
          worker: {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            particles: row.particles,
            role: row.role,
          }
        };
      } catch (error) {
        return { success: false, message: 'Login failed', worker: null };
      }
    },
    updateWorkerProfile: async (_: any, { id, firstName, lastName, particles, email }: { id: string; firstName: string; lastName: string; particles?: string; email?: string }) => {
      const result = await pool.query(
        'UPDATE worker SET first_name = $2, last_name = $3, particles = $4, email = $5 WHERE id = $1 RETURNING *',
        [id, firstName, lastName, particles || null, email || null]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
        email: row.email,
        role: row.role,
      };
    },
    changePassword: async (_: any, { workerId, currentPassword, newPassword }: { workerId: string; currentPassword: string; newPassword: string }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM worker WHERE id = $1',
          [workerId]
        );

        if (result.rows.length === 0) {
          return { success: false, message: 'Worker not found', worker: null };
        }

        const row = result.rows[0];

        // Verify current password using bcrypt
        const passwordValid = await bcrypt.compare(currentPassword, row.password_hash);
        if (!passwordValid) {
          return { success: false, message: 'Current password is incorrect', worker: null };
        }

        // Hash the new password with bcrypt (10 salt rounds)
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
          'UPDATE worker SET password_hash = $2 WHERE id = $1',
          [workerId, hashedPassword]
        );

        return {
          success: true,
          message: 'Password changed successfully',
          worker: {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            particles: row.particles,
            role: row.role,
          }
        };
      } catch (error) {
        return { success: false, message: 'Failed to change password', worker: null };
      }
    },
    resetPassword: async (_: any, { workerId, newPassword, requesterId }: { workerId: string; newPassword: string; requesterId: string }) => {
      try {
        // Check if requester is a manager
        const requesterResult = await pool.query('SELECT role FROM worker WHERE id = $1', [requesterId]);
        if (requesterResult.rows.length === 0) {
          return { success: false, message: 'Requester not found', worker: null };
        }
        if (requesterResult.rows[0].role !== 'manager') {
          return { success: false, message: 'Only managers can reset passwords', worker: null };
        }

        // Prevent managers from resetting their own password via this mutation
        if (workerId === requesterId) {
          return { success: false, message: 'Cannot reset your own password. Use change password instead.', worker: null };
        }

        // Verify target worker exists
        const workerResult = await pool.query('SELECT * FROM worker WHERE id = $1', [workerId]);
        if (workerResult.rows.length === 0) {
          return { success: false, message: 'Worker not found', worker: null };
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE worker SET password_hash = $2 WHERE id = $1', [workerId, hashedPassword]);

        const row = workerResult.rows[0];
        return {
          success: true,
          message: 'Password reset successfully',
          worker: {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            particles: row.particles,
            role: row.role,
          }
        };
      } catch (error) {
        return { success: false, message: 'Failed to reset password', worker: null };
      }
    },
    addWorkerHoliday: async (_: any, { workerId, holiday }: { workerId: string; holiday: { startDate: string; endDate: string; startDayPart: string; endDayPart: string; description?: string; holidayTypeId?: string } }) => {
      const insertResult = await pool.query(
        `INSERT INTO worker_holiday (worker_id, start_date, end_date, start_day_part, end_day_part, description, holiday_type_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [workerId, holiday.startDate, holiday.endDate, holiday.startDayPart, holiday.endDayPart, holiday.description || null, holiday.holidayTypeId || null]
      );
      const insertedId = insertResult.rows[0].id;
      const result = await pool.query(
        `SELECT wh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order
         FROM worker_holiday wh
         LEFT JOIN holiday_type ht ON wh.holiday_type_id = ht.id
         WHERE wh.id = $1`,
        [insertedId]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        workerId: row.worker_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order,
        } : null,
      };
    },
    removeWorkerHoliday: async (_: any, { id }: { id: string }) => {
      const result = await pool.query(
        'DELETE FROM worker_holiday WHERE id = $1',
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    },
    updateWorkerHoliday: async (_: any, { id, holiday }: { id: string; holiday: { startDate: string; endDate: string; startDayPart: string; endDayPart: string; description?: string; holidayTypeId?: string } }) => {
      await pool.query(
        `UPDATE worker_holiday
         SET start_date = $2, end_date = $3, start_day_part = $4, end_day_part = $5, description = $6, holiday_type_id = $7
         WHERE id = $1`,
        [id, holiday.startDate, holiday.endDate, holiday.startDayPart, holiday.endDayPart, holiday.description || null, holiday.holidayTypeId || null]
      );
      const result = await pool.query(
        `SELECT wh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order
         FROM worker_holiday wh
         LEFT JOIN holiday_type ht ON wh.holiday_type_id = ht.id
         WHERE wh.id = $1`,
        [id]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        workerId: row.worker_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order,
        } : null,
      };
    },
    createHolidayType: async (_: any, { name, colorLight, colorDark }: { name: string; colorLight: string; colorDark: string }) => {
      const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM holiday_type');
      const sortOrder = maxOrder.rows[0].next_order;
      const result = await pool.query(
        'INSERT INTO holiday_type (name, color_light, color_dark, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, colorLight, colorDark, sortOrder]
      );
      const row = result.rows[0];
      return { id: row.id, name: row.name, colorLight: row.color_light, colorDark: row.color_dark, sortOrder: row.sort_order };
    },
    updateHolidayType: async (_: any, { id, name, colorLight, colorDark, sortOrder }: { id: number; name?: string; colorLight?: string; colorDark?: string; sortOrder?: number }) => {
      const current = await pool.query('SELECT * FROM holiday_type WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new Error('Holiday type not found');
      const cur = current.rows[0];
      const result = await pool.query(
        'UPDATE holiday_type SET name = $2, color_light = $3, color_dark = $4, sort_order = $5 WHERE id = $1 RETURNING *',
        [id, name ?? cur.name, colorLight ?? cur.color_light, colorDark ?? cur.color_dark, sortOrder ?? cur.sort_order]
      );
      const row = result.rows[0];
      return { id: row.id, name: row.name, colorLight: row.color_light, colorDark: row.color_dark, sortOrder: row.sort_order };
    },
    deleteHolidayType: async (_: any, { id }: { id: number }) => {
      const result = await pool.query('DELETE FROM holiday_type WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },
    updateWorkerRole: async (_: any, { workerId, role, requesterId }: { workerId: string; role: string; requesterId: string }) => {
      // Validate role value
      if (role !== 'user' && role !== 'manager') {
        throw new Error('Invalid role. Must be "user" or "manager"');
      }

      // Check if requester is a manager
      const requesterResult = await pool.query('SELECT role FROM worker WHERE id = $1', [requesterId]);
      if (requesterResult.rows.length === 0) {
        throw new Error('Requester not found');
      }
      if (requesterResult.rows[0].role !== 'manager') {
        throw new Error('Only managers can change roles');
      }

      // Update the worker's role
      const result = await pool.query(
        'UPDATE worker SET role = $2 WHERE id = $1 RETURNING *',
        [workerId, role]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
        email: row.email,
        role: row.role,
      };
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
        email: row.email,
        role: row.role,
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

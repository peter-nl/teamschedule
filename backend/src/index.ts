import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Auth context type
interface AuthContext {
  user: { id: string; role: string } | null;
}

function generateToken(member: { id: string; role: string }): string {
  return jwt.sign({ id: member.id, role: member.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

function requireAuth(ctx: AuthContext): { id: string; role: string } {
  if (!ctx.user) throw new Error('Authentication required');
  return ctx.user;
}

function requireManager(ctx: AuthContext): { id: string; role: string } {
  const user = requireAuth(ctx);
  if (user.role !== 'manager') throw new Error('Manager access required');
  return user;
}

// Encryption for SMTP password storage
const ENCRYPTION_KEY = crypto.createHash('sha256').update(JWT_SECRET).digest();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(data: string): string {
  const [ivHex, tagHex, encHex] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

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

// Email helpers
async function getSmtpConfig(): Promise<{ host: string; port: number; secure: boolean; user: string; pass: string; from: string } | null> {
  const result = await pool.query("SELECT key, value FROM app_setting WHERE key LIKE 'smtp_%'");
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) return null;
  return {
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || '587', 10),
    secure: settings.smtp_secure === 'true',
    user: settings.smtp_user,
    pass: decrypt(settings.smtp_pass),
    from: settings.smtp_from || settings.smtp_user,
  };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const config = await getSmtpConfig();
  if (!config) throw new Error('Email service not configured');
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  await transporter.sendMail({ from: config.from, to, subject, html });
}

// GraphQL type definitions
const typeDefs = `#graphql
  type Team {
    id: ID!
    name: String!
    members: [Member!]!
  }

  type Member {
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
    isSystem: Boolean!
  }

  type MemberHoliday {
    id: ID!
    memberId: String!
    startDate: String!
    endDate: String!
    startDayPart: String!
    endDayPart: String!
    description: String
    holidayType: HolidayType
  }

  input MemberHolidayInput {
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
    member: Member
    token: String
  }

  type EmailConfig {
    host: String!
    port: Int!
    secure: Boolean!
    user: String!
    from: String!
    configured: Boolean!
  }

  type SimpleResult {
    success: Boolean!
    message: String
  }

  type Query {
    hello: String
    testDatabase: String
    teams: [Team!]!
    team(id: ID!): Team
    members: [Member!]!
    member(id: ID!): Member
    holidayTypes: [HolidayType!]!
    memberHolidays(memberId: String!): [MemberHoliday!]!
    allMemberHolidays(startDate: String!, endDate: String!): [MemberHoliday!]!
    emailConfig: EmailConfig
    scheduleDateRange: ScheduleDateRange!
    exportMemberHolidays: [MemberHolidayExport!]!
    memberSchedules: [MemberSchedule!]!
    memberSchedule(memberId: String!): MemberSchedule
  }

  type ScheduleDateRange {
    startDate: String!
    endDate: String!
  }

  type MemberHolidayExport {
    memberId: String!
    memberName: String!
    startDate: String!
    endDate: String!
    startDayPart: String!
    endDayPart: String!
    description: String
    holidayTypeName: String
  }

  type DeletedHolidaysResult {
    success: Boolean!
    message: String
    deletedCount: Int!
  }

  type ImportResult {
    success: Boolean!
    message: String
    importedCount: Int!
    skippedCount: Int!
  }

  type Mutation {
    ping: String
    createTeam(name: String!): Team!
    updateTeam(id: ID!, name: String!): Team
    createMember(id: String!, firstName: String!, lastName: String!, particles: String, email: String, password: String!): Member!
    addMemberToTeam(teamId: ID!, memberId: ID!): Team!
    removeMemberFromTeam(teamId: ID!, memberId: ID!): Team!
    deleteTeam(id: ID!): Boolean!
    deleteMember(id: ID!): Boolean!
    login(memberId: String!, password: String!): AuthPayload!
    updateMemberProfile(id: String!, firstName: String!, lastName: String!, particles: String, email: String): Member
    changePassword(memberId: String!, currentPassword: String!, newPassword: String!): AuthPayload!
    resetPassword(memberId: String!, newPassword: String!): AuthPayload!
    updateMemberRole(memberId: String!, role: String!): Member
    addMemberHoliday(memberId: String!, holiday: MemberHolidayInput!): MemberHoliday!
    removeMemberHoliday(id: ID!): Boolean!
    updateMemberHoliday(id: ID!, holiday: MemberHolidayInput!): MemberHoliday!
    createHolidayType(name: String!, colorLight: String!, colorDark: String!): HolidayType!
    updateHolidayType(id: ID!, name: String, colorLight: String, colorDark: String, sortOrder: Int): HolidayType!
    deleteHolidayType(id: ID!): Boolean!
    saveEmailConfig(host: String!, port: Int!, secure: Boolean!, user: String!, password: String!, from: String!): SimpleResult!
    testEmailConfig(testAddress: String!): SimpleResult!
    requestPasswordReset(email: String!): SimpleResult!
    resetPasswordWithToken(token: String!, newPassword: String!): AuthPayload!
    saveScheduleDateRange(startDate: String!, endDate: String!): DeletedHolidaysResult!
    importMemberHolidays(holidays: [MemberHolidayImportInput!]!): ImportResult!
    saveMemberSchedule(memberId: String!, referenceDate: String!, week1: [DayScheduleInput!]!, week2: [DayScheduleInput!]!): MemberSchedule!
    deleteMemberSchedule(memberId: String!): Boolean!
  }

  input MemberHolidayImportInput {
    memberId: String!
    startDate: String!
    endDate: String!
    startDayPart: String!
    endDayPart: String!
    description: String
    holidayTypeName: String
  }

  type DaySchedule {
    morning: Float!
    afternoon: Float!
  }

  type MemberSchedule {
    memberId: String!
    referenceDate: String!
    week1: [DaySchedule!]!
    week2: [DaySchedule!]!
  }

  input DayScheduleInput {
    morning: Float!
    afternoon: Float!
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
    teams: async (_: any, __: any, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query('SELECT * FROM team ORDER BY name');
      return result.rows;
    },
    team: async (_: any, { id }: { id: number }, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query('SELECT * FROM team WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    members: async (_: any, __: any, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query('SELECT * FROM member ORDER BY last_name, first_name');
      return result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        particles: row.particles,
        email: row.email,
        role: row.role,
      }));
    },
    member: async (_: any, { id }: { id: string }, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query('SELECT * FROM member WHERE id = $1', [id]);
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
    holidayTypes: async (_: any, __: any, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query('SELECT * FROM holiday_type ORDER BY sort_order, name');
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        colorLight: row.color_light,
        colorDark: row.color_dark,
        sortOrder: row.sort_order,
        isSystem: row.is_system,
      }));
    },
    memberHolidays: async (_: any, { memberId }: { memberId: string }, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query(
        `SELECT mh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order, ht.is_system as ht_is_system
         FROM member_holiday mh
         LEFT JOIN holiday_type ht ON mh.holiday_type_id = ht.id
         WHERE mh.member_id = $1 ORDER BY mh.start_date`,
        [memberId]
      );
      return result.rows.map(row => ({
        id: row.id,
        memberId: row.member_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order, isSystem: row.ht_is_system,
        } : null,
      }));
    },
    allMemberHolidays: async (_: any, { startDate, endDate }: { startDate: string; endDate: string }, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query(
        `SELECT mh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order, ht.is_system as ht_is_system
         FROM member_holiday mh
         LEFT JOIN holiday_type ht ON mh.holiday_type_id = ht.id
         WHERE mh.start_date <= $2 AND mh.end_date >= $1
         ORDER BY mh.start_date`,
        [startDate, endDate]
      );
      return result.rows.map(row => ({
        id: row.id,
        memberId: row.member_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order, isSystem: row.ht_is_system,
        } : null,
      }));
    },
    scheduleDateRange: async (_: any, __: any, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query("SELECT key, value FROM app_setting WHERE key IN ('schedule_start_date', 'schedule_end_date')");
      const settings: Record<string, string> = {};
      for (const row of result.rows) settings[row.key] = row.value;
      const now = new Date();
      const defaultStart = `${now.getFullYear() - 1}-01-01`;
      const defaultEnd = `${now.getFullYear() + 1}-12-31`;
      return {
        startDate: settings.schedule_start_date || defaultStart,
        endDate: settings.schedule_end_date || defaultEnd,
      };
    },
    exportMemberHolidays: async (_: any, __: any, ctx: AuthContext) => {
      requireManager(ctx);
      const result = await pool.query(
        `SELECT mh.*, m.first_name, m.last_name, m.particles,
                ht.name as ht_name
         FROM member_holiday mh
         JOIN member m ON mh.member_id = m.id
         LEFT JOIN holiday_type ht ON mh.holiday_type_id = ht.id
         ORDER BY m.last_name, m.first_name, mh.start_date`
      );
      return result.rows.map(row => {
        const nameParts = [row.first_name, row.particles, row.last_name].filter(Boolean);
        return {
          memberId: row.member_id,
          memberName: nameParts.join(' '),
          startDate: row.start_date.toISOString().split('T')[0],
          endDate: row.end_date.toISOString().split('T')[0],
          startDayPart: row.start_day_part,
          endDayPart: row.end_day_part,
          description: row.description,
          holidayTypeName: row.ht_name || null,
        };
      });
    },
    emailConfig: async (_: any, __: any, ctx: AuthContext) => {
      requireManager(ctx);
      const result = await pool.query("SELECT key, value FROM app_setting WHERE key LIKE 'smtp_%'");
      const settings: Record<string, string> = {};
      for (const row of result.rows) settings[row.key] = row.value;
      return {
        host: settings.smtp_host || '',
        port: parseInt(settings.smtp_port || '587', 10),
        secure: settings.smtp_secure === 'true',
        user: settings.smtp_user || '',
        from: settings.smtp_from || '',
        configured: !!(settings.smtp_host && settings.smtp_user && settings.smtp_pass),
      };
    },
    memberSchedules: async (_: any, __: any, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query('SELECT * FROM member_schedule');
      return result.rows.map(row => ({
        memberId: row.member_id,
        referenceDate: row.reference_date.toISOString().split('T')[0],
        week1: row.week1,
        week2: row.week2,
      }));
    },
    memberSchedule: async (_: any, { memberId }: { memberId: string }, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query('SELECT * FROM member_schedule WHERE member_id = $1', [memberId]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        memberId: row.member_id,
        referenceDate: row.reference_date.toISOString().split('T')[0],
        week1: row.week1,
        week2: row.week2,
      };
    },
  },
  Mutation: {
    ping: () => 'pong',
    createTeam: async (_: any, { name }: { name: string }, ctx: AuthContext) => {
      requireManager(ctx);
      const result = await pool.query(
        'INSERT INTO team (name) VALUES ($1) RETURNING *',
        [name]
      );
      return result.rows[0];
    },
    updateTeam: async (_: any, { id, name }: { id: number; name: string }, ctx: AuthContext) => {
      requireManager(ctx);
      const result = await pool.query(
        'UPDATE team SET name = $1 WHERE id = $2 RETURNING *',
        [name, id]
      );
      return result.rows[0] || null;
    },
    createMember: async (_: any, { id, firstName, lastName, particles, email, password }: { id: string; firstName: string; lastName: string; particles?: string; email?: string; password: string }, ctx: AuthContext) => {
      requireManager(ctx);
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        'INSERT INTO member (id, first_name, last_name, particles, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
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
    addMemberToTeam: async (_: any, { teamId, memberId }: { teamId: number; memberId: number }, ctx: AuthContext) => {
      requireManager(ctx);
      await pool.query(
        'INSERT INTO team_member (team_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [teamId, memberId]
      );
      const result = await pool.query('SELECT * FROM team WHERE id = $1', [teamId]);
      return result.rows[0];
    },
    removeMemberFromTeam: async (_: any, { teamId, memberId }: { teamId: number; memberId: number }, ctx: AuthContext) => {
      requireManager(ctx);
      await pool.query(
        'DELETE FROM team_member WHERE team_id = $1 AND member_id = $2',
        [teamId, memberId]
      );
      const result = await pool.query('SELECT * FROM team WHERE id = $1', [teamId]);
      return result.rows[0];
    },
    deleteTeam: async (_: any, { id }: { id: number }, ctx: AuthContext) => {
      requireManager(ctx);
      const result = await pool.query('DELETE FROM team WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },
    deleteMember: async (_: any, { id }: { id: number }, ctx: AuthContext) => {
      requireManager(ctx);
      const result = await pool.query('DELETE FROM member WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },
    login: async (_: any, { memberId, password }: { memberId: string; password: string }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM member WHERE id = $1',
          [memberId]
        );

        if (result.rows.length === 0) {
          return { success: false, message: 'Member not found', member: null, token: null };
        }

        const row = result.rows[0];

        const passwordValid = await bcrypt.compare(password, row.password_hash);
        if (!passwordValid) {
          return { success: false, message: 'Invalid password', member: null, token: null };
        }

        const member = {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          particles: row.particles,
          email: row.email,
          role: row.role,
        };

        return {
          success: true,
          message: 'Login successful',
          member,
          token: generateToken(member),
        };
      } catch (error) {
        return { success: false, message: 'Login failed', member: null, token: null };
      }
    },
    updateMemberProfile: async (_: any, { id, firstName, lastName, particles, email }: { id: string; firstName: string; lastName: string; particles?: string; email?: string }, ctx: AuthContext) => {
      const user = requireAuth(ctx);
      // Users can only update their own profile, managers can update anyone
      if (user.id !== id && user.role !== 'manager') {
        throw new Error('You can only update your own profile');
      }

      const result = await pool.query(
        'UPDATE member SET first_name = $2, last_name = $3, particles = $4, email = $5 WHERE id = $1 RETURNING *',
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
    changePassword: async (_: any, { memberId, currentPassword, newPassword }: { memberId: string; currentPassword: string; newPassword: string }, ctx: AuthContext) => {
      const user = requireAuth(ctx);
      // Users can only change their own password
      if (user.id !== memberId) {
        throw new Error('You can only change your own password');
      }

      try {
        const result = await pool.query(
          'SELECT * FROM member WHERE id = $1',
          [memberId]
        );

        if (result.rows.length === 0) {
          return { success: false, message: 'Member not found', member: null, token: null };
        }

        const row = result.rows[0];

        const passwordValid = await bcrypt.compare(currentPassword, row.password_hash);
        if (!passwordValid) {
          return { success: false, message: 'Current password is incorrect', member: null, token: null };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
          'UPDATE member SET password_hash = $2 WHERE id = $1',
          [memberId, hashedPassword]
        );

        return {
          success: true,
          message: 'Password changed successfully',
          member: {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            particles: row.particles,
            email: row.email,
            role: row.role,
          },
          token: null,
        };
      } catch (error) {
        return { success: false, message: 'Failed to change password', member: null, token: null };
      }
    },
    resetPassword: async (_: any, { memberId, newPassword }: { memberId: string; newPassword: string }, ctx: AuthContext) => {
      const manager = requireManager(ctx);

      try {
        // Prevent managers from resetting their own password via this mutation
        if (memberId === manager.id) {
          return { success: false, message: 'Cannot reset your own password. Use change password instead.', member: null, token: null };
        }

        // Verify target member exists
        const memberResult = await pool.query('SELECT * FROM member WHERE id = $1', [memberId]);
        if (memberResult.rows.length === 0) {
          return { success: false, message: 'Member not found', member: null, token: null };
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE member SET password_hash = $2 WHERE id = $1', [memberId, hashedPassword]);

        const row = memberResult.rows[0];
        return {
          success: true,
          message: 'Password reset successfully',
          member: {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            particles: row.particles,
            email: row.email,
            role: row.role,
          },
          token: null,
        };
      } catch (error) {
        return { success: false, message: 'Failed to reset password', member: null, token: null };
      }
    },
    addMemberHoliday: async (_: any, { memberId, holiday }: { memberId: string; holiday: { startDate: string; endDate: string; startDayPart: string; endDayPart: string; description?: string; holidayTypeId?: string } }, ctx: AuthContext) => {
      requireAuth(ctx);
      const insertResult = await pool.query(
        `INSERT INTO member_holiday (member_id, start_date, end_date, start_day_part, end_day_part, description, holiday_type_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [memberId, holiday.startDate, holiday.endDate, holiday.startDayPart, holiday.endDayPart, holiday.description || null, holiday.holidayTypeId || null]
      );
      const insertedId = insertResult.rows[0].id;
      const result = await pool.query(
        `SELECT mh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order, ht.is_system as ht_is_system
         FROM member_holiday mh
         LEFT JOIN holiday_type ht ON mh.holiday_type_id = ht.id
         WHERE mh.id = $1`,
        [insertedId]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        memberId: row.member_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order, isSystem: row.ht_is_system,
        } : null,
      };
    },
    removeMemberHoliday: async (_: any, { id }: { id: string }, ctx: AuthContext) => {
      requireAuth(ctx);
      const result = await pool.query(
        'DELETE FROM member_holiday WHERE id = $1',
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    },
    updateMemberHoliday: async (_: any, { id, holiday }: { id: string; holiday: { startDate: string; endDate: string; startDayPart: string; endDayPart: string; description?: string; holidayTypeId?: string } }, ctx: AuthContext) => {
      requireAuth(ctx);
      await pool.query(
        `UPDATE member_holiday
         SET start_date = $2, end_date = $3, start_day_part = $4, end_day_part = $5, description = $6, holiday_type_id = $7
         WHERE id = $1`,
        [id, holiday.startDate, holiday.endDate, holiday.startDayPart, holiday.endDayPart, holiday.description || null, holiday.holidayTypeId || null]
      );
      const result = await pool.query(
        `SELECT mh.*, ht.id as ht_id, ht.name as ht_name, ht.color_light as ht_color_light,
                ht.color_dark as ht_color_dark, ht.sort_order as ht_sort_order, ht.is_system as ht_is_system
         FROM member_holiday mh
         LEFT JOIN holiday_type ht ON mh.holiday_type_id = ht.id
         WHERE mh.id = $1`,
        [id]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        memberId: row.member_id,
        startDate: row.start_date.toISOString().split('T')[0],
        endDate: row.end_date.toISOString().split('T')[0],
        startDayPart: row.start_day_part,
        endDayPart: row.end_day_part,
        description: row.description,
        holidayType: row.ht_id ? {
          id: row.ht_id, name: row.ht_name, colorLight: row.ht_color_light,
          colorDark: row.ht_color_dark, sortOrder: row.ht_sort_order, isSystem: row.ht_is_system,
        } : null,
      };
    },
    createHolidayType: async (_: any, { name, colorLight, colorDark }: { name: string; colorLight: string; colorDark: string }, ctx: AuthContext) => {
      requireManager(ctx);
      const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM holiday_type WHERE is_system = false');
      const sortOrder = maxOrder.rows[0].next_order;
      const result = await pool.query(
        'INSERT INTO holiday_type (name, color_light, color_dark, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, colorLight, colorDark, sortOrder]
      );
      const row = result.rows[0];
      return { id: row.id, name: row.name, colorLight: row.color_light, colorDark: row.color_dark, sortOrder: row.sort_order, isSystem: row.is_system };
    },
    updateHolidayType: async (_: any, { id, name, colorLight, colorDark, sortOrder }: { id: number; name?: string; colorLight?: string; colorDark?: string; sortOrder?: number }, ctx: AuthContext) => {
      requireManager(ctx);
      const current = await pool.query('SELECT * FROM holiday_type WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new Error('Holiday type not found');
      const cur = current.rows[0];
      if (cur.is_system) throw new Error('Cannot modify a system holiday type');
      const result = await pool.query(
        'UPDATE holiday_type SET name = $2, color_light = $3, color_dark = $4, sort_order = $5 WHERE id = $1 RETURNING *',
        [id, name ?? cur.name, colorLight ?? cur.color_light, colorDark ?? cur.color_dark, sortOrder ?? cur.sort_order]
      );
      const row = result.rows[0];
      return { id: row.id, name: row.name, colorLight: row.color_light, colorDark: row.color_dark, sortOrder: row.sort_order, isSystem: row.is_system };
    },
    deleteHolidayType: async (_: any, { id }: { id: number }, ctx: AuthContext) => {
      requireManager(ctx);
      const check = await pool.query('SELECT is_system FROM holiday_type WHERE id = $1', [id]);
      if (check.rows.length === 0) return false;
      if (check.rows[0].is_system) throw new Error('Cannot delete a system holiday type');
      const result = await pool.query('DELETE FROM holiday_type WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },
    updateMemberRole: async (_: any, { memberId, role }: { memberId: string; role: string }, ctx: AuthContext) => {
      requireManager(ctx);

      if (role !== 'user' && role !== 'manager') {
        throw new Error('Invalid role. Must be "user" or "manager"');
      }

      const result = await pool.query(
        'UPDATE member SET role = $2 WHERE id = $1 RETURNING *',
        [memberId, role]
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
    saveEmailConfig: async (_: any, args: { host: string; port: number; secure: boolean; user: string; password: string; from: string }, ctx: AuthContext) => {
      requireManager(ctx);
      const pairs: [string, string][] = [
        ['smtp_host', args.host],
        ['smtp_port', String(args.port)],
        ['smtp_secure', String(args.secure)],
        ['smtp_user', args.user],
        ['smtp_pass', encrypt(args.password)],
        ['smtp_from', args.from],
      ];
      for (const [key, value] of pairs) {
        await pool.query(
          `INSERT INTO app_setting (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
      return { success: true, message: 'Email configuration saved' };
    },
    testEmailConfig: async (_: any, { testAddress }: { testAddress: string }, ctx: AuthContext) => {
      requireManager(ctx);
      try {
        await sendEmail(testAddress, 'TeamSchedule - Test Email', '<p>This is a test email from TeamSchedule. Your email configuration is working correctly.</p>');
        return { success: true, message: 'Test email sent successfully' };
      } catch (error: any) {
        return { success: false, message: `Failed to send test email: ${error.message}` };
      }
    },
    requestPasswordReset: async (_: any, { email }: { email: string }) => {
      const genericMessage = 'If an account with that email exists, a password reset link has been sent.';
      try {
        const memberResult = await pool.query('SELECT id, first_name, email FROM member WHERE LOWER(email) = LOWER($1)', [email]);
        if (memberResult.rows.length > 0) {
          const member = memberResult.rows[0];
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
          // Invalidate existing unused tokens for this member
          await pool.query('UPDATE password_reset_token SET used = TRUE WHERE member_id = $1 AND used = FALSE', [member.id]);
          await pool.query(
            'INSERT INTO password_reset_token (member_id, token, expires_at) VALUES ($1, $2, $3)',
            [member.id, token, expiresAt]
          );
          const appUrl = process.env.APP_URL || 'http://localhost:4200';
          const resetUrl = `${appUrl}/reset-password?token=${token}`;
          await sendEmail(
            member.email,
            'TeamSchedule - Password Reset',
            `<p>Hi ${member.first_name},</p>
             <p>A password reset was requested for your account. Click the link below to reset your password:</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>`
          );
        }
      } catch (error) {
        console.error('Password reset error:', error);
      }
      return { success: true, message: genericMessage };
    },
    resetPasswordWithToken: async (_: any, { token, newPassword }: { token: string; newPassword: string }) => {
      const tokenResult = await pool.query(
        'SELECT * FROM password_reset_token WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
        [token]
      );
      if (tokenResult.rows.length === 0) {
        return { success: false, message: 'Invalid or expired reset link', member: null, token: null };
      }
      const resetRow = tokenResult.rows[0];
      // Mark token as used
      await pool.query('UPDATE password_reset_token SET used = TRUE WHERE id = $1', [resetRow.id]);
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE member SET password_hash = $1 WHERE id = $2', [hashedPassword, resetRow.member_id]);
      // Fetch member for response
      const memberResult = await pool.query('SELECT * FROM member WHERE id = $1', [resetRow.member_id]);
      const row = memberResult.rows[0];
      const member = { id: row.id, firstName: row.first_name, lastName: row.last_name, particles: row.particles, email: row.email, role: row.role };
      return { success: true, message: 'Password reset successfully', member, token: generateToken(member) };
    },
    saveScheduleDateRange: async (_: any, { startDate, endDate }: { startDate: string; endDate: string }, ctx: AuthContext) => {
      requireManager(ctx);
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }
      if (start >= end) {
        throw new Error('Start date must be before end date');
      }
      // Save the date range
      for (const [key, value] of [['schedule_start_date', startDate], ['schedule_end_date', endDate]]) {
        await pool.query(
          `INSERT INTO app_setting (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
      // Delete member holidays that fall completely outside the new range
      const deleteResult = await pool.query(
        `DELETE FROM member_holiday WHERE start_date > $2 OR end_date < $1`,
        [startDate, endDate]
      );
      const deletedCount = deleteResult.rowCount ?? 0;
      return {
        success: true,
        message: deletedCount > 0
          ? `Date range saved. ${deletedCount} holiday period(s) outside the new range were removed.`
          : 'Date range saved.',
        deletedCount,
      };
    },
    saveMemberSchedule: async (_: any, { memberId, referenceDate, week1, week2 }: { memberId: string; referenceDate: string; week1: Array<{ morning: number; afternoon: number }>; week2: Array<{ morning: number; afternoon: number }> }, ctx: AuthContext) => {
      const user = requireAuth(ctx);
      if (user.id !== memberId && user.role !== 'manager') {
        throw new Error('You can only edit your own schedule');
      }
      const result = await pool.query(
        `INSERT INTO member_schedule (member_id, reference_date, week1, week2, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (member_id) DO UPDATE SET reference_date = $2, week1 = $3, week2 = $4, updated_at = NOW()
         RETURNING *`,
        [memberId, referenceDate, JSON.stringify(week1), JSON.stringify(week2)]
      );
      const row = result.rows[0];
      return {
        memberId: row.member_id,
        referenceDate: row.reference_date.toISOString().split('T')[0],
        week1: row.week1,
        week2: row.week2,
      };
    },
    deleteMemberSchedule: async (_: any, { memberId }: { memberId: string }, ctx: AuthContext) => {
      const user = requireAuth(ctx);
      if (user.id !== memberId && user.role !== 'manager') {
        throw new Error('You can only delete your own schedule');
      }
      const result = await pool.query('DELETE FROM member_schedule WHERE member_id = $1', [memberId]);
      return (result.rowCount ?? 0) > 0;
    },
    importMemberHolidays: async (_: any, { holidays }: { holidays: Array<{ memberId: string; startDate: string; endDate: string; startDayPart: string; endDayPart: string; description?: string; holidayTypeName?: string }> }, ctx: AuthContext) => {
      requireManager(ctx);
      let importedCount = 0;
      let skippedCount = 0;
      // Pre-load holiday types for name lookup
      const typeResult = await pool.query('SELECT id, name FROM holiday_type');
      const typeMap = new Map<string, number>();
      for (const row of typeResult.rows) {
        typeMap.set(row.name.toLowerCase(), row.id);
      }
      // Verify all member IDs exist
      const memberResult = await pool.query('SELECT id FROM member');
      const validMemberIds = new Set(memberResult.rows.map(r => r.id));

      for (const h of holidays) {
        if (!validMemberIds.has(h.memberId)) {
          skippedCount++;
          continue;
        }
        const holidayTypeId = h.holidayTypeName ? typeMap.get(h.holidayTypeName.toLowerCase()) || null : null;
        try {
          await pool.query(
            `INSERT INTO member_holiday (member_id, start_date, end_date, start_day_part, end_day_part, description, holiday_type_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [h.memberId, h.startDate, h.endDate, h.startDayPart, h.endDayPart, h.description || null, holidayTypeId]
          );
          importedCount++;
        } catch (error) {
          skippedCount++;
        }
      }
      return {
        success: true,
        message: `Imported ${importedCount} holiday period(s). ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}`,
        importedCount,
        skippedCount,
      };
    },
  },
  Team: {
    members: async (parent: any) => {
      const result = await pool.query(
        `SELECT m.* FROM member m
         INNER JOIN team_member tm ON m.id = tm.member_id
         WHERE tm.team_id = $1
         ORDER BY m.last_name, m.first_name`,
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
  Member: {
    teams: async (parent: any) => {
      const result = await pool.query(
        `SELECT t.* FROM team t
         INNER JOIN team_member tm ON t.id = tm.team_id
         WHERE tm.member_id = $1
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
    context: async ({ req }): Promise<AuthContext> => {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { id: string; role: string };
          return { user: { id: decoded.id, role: decoded.role } };
        } catch {
          return { user: null };
        }
      }
      return { user: null };
    },
  });

  console.log(`🚀 Apollo Server ready at: ${url}`);
  console.log(`📊 GraphQL Playground available at: ${url}`);
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

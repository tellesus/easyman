// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  owner: text('owner').primaryKey(),
  ciphertext: text('ciphertext').notNull(),
  iv: text('iv').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  action: text('action').notNull(),
  timestamp: text('timestamp').notNull(),
});
export const feedbackSubmissions = sqliteTable('feedback_submissions', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  status: text('status').notNull(),
  issue: integer('issue'),
  createdAt: text('created_at').notNull(),
});
export const identities=sqliteTable('identities',{userId:text('user_id').primaryKey(),publicKey:text('public_key').notNull()});
export const properties=sqliteTable('properties',{id:text('id').primaryKey(),owner:text('owner').notNull(),directory:text('directory').notNull(),revision:integer('revision').notNull().default(0),timezone:text('timezone').notNull().default('America/Chicago'),boundaries:text('boundaries').notNull().default('[]'),keyEpoch:integer('key_epoch').notNull().default(0),createdAt:text('created_at').notNull().default('')});
export const members=sqliteTable('members',{id:text('id').primaryKey(),property:text('property').notNull(),userId:text('user_id').notNull(),email:text('email').notNull(),employeeId:text('employee_id').notNull().default(''),status:text('status').notNull(),grants:text('grants').notNull(),inviteHash:text('invite_hash'),createdAt:text('created_at').notNull()});
export const encryptedResources=sqliteTable('encrypted_resources',{id:text('id').primaryKey(),property:text('property').notNull(),field:text('field').notNull(),subject:text('subject').notNull(),ciphertext:text('ciphertext').notNull(),iv:text('iv').notNull(),wrapped:text('wrapped').notNull(),revision:integer('revision').notNull().default(0),updatedAt:text('updated_at').notNull(),aad:integer('aad').notNull().default(0)});
export const resourceVersions=sqliteTable('resource_versions',{id:text('id').primaryKey(),property:text('property').notNull(),resourceId:text('resource_id').notNull(),data:text('data').notNull(),actor:text('actor').notNull(),timestamp:text('timestamp').notNull()});
export const appSessions=sqliteTable('app_sessions',{id:text('id').primaryKey(),userId:text('user_id').notNull(),property:text('property').notNull(),tokenHash:text('token_hash').notNull(),createdAt:text('created_at').notNull(),lastSeen:text('last_seen').notNull(),expiresAt:text('expires_at').notNull(),revoked:integer('revoked').notNull().default(0),agent:text('agent').notNull()});
export const rateLimits=sqliteTable('rate_limits',{id:text('id').primaryKey(),count:integer('count').notNull(),expiresAt:integer('expires_at').notNull()});
export const writeLeases=sqliteTable('write_leases',{id:text('id').primaryKey(),timestamp:text('timestamp').notNull()});
export const shiftSnapshots=sqliteTable('shift_snapshots',{id:text('id').primaryKey(),property:text('property').notNull(),boundary:text('boundary').notNull(),incoming:text('incoming').notNull(),closing:text('closing').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull()});
export const accountRecovery=sqliteTable('account_recovery',{id:text('id').primaryKey(),property:text('property').notNull(),userId:text('user_id').notNull(),publicKey:text('public_key').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull()});
export const keyOverrides=sqliteTable('key_overrides',{id:text('id').primaryKey(),property:text('property').notNull(),userId:text('user_id').notNull(),cipherHash:text('cipher_hash').notNull(),publicHash:text('public_hash').notNull(),wrapped:text('wrapped').notNull()});

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

CREATE TABLE snapshot_scheduler_job (
  id TEXT PRIMARY KEY NOT NULL,
  invocation_id TEXT NOT NULL DEFAULT '',
  lease_until TEXT NOT NULL DEFAULT '',
  cursor TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT,
  attempted_at TEXT,
  succeeded_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  captured INTEGER NOT NULL DEFAULT 0,
  checked INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE snapshot_scheduler_properties (
  property TEXT PRIMARY KEY NOT NULL,
  attempted_at TEXT NOT NULL,
  succeeded_at TEXT,
  status TEXT NOT NULL,
  captured INTEGER NOT NULL DEFAULT 0,
  error_code TEXT
);

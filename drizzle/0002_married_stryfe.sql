CREATE TABLE `app_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`property` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	`agent` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `encrypted_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`property` text NOT NULL,
	`field` text NOT NULL,
	`subject` text NOT NULL,
	`ciphertext` text NOT NULL,
	`iv` text NOT NULL,
	`wrapped` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `identities` (
	`user_id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`property` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`employee_id` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`grants` text NOT NULL,
	`invite_hash` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`directory` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`timezone` text DEFAULT 'America/Chicago' NOT NULL,
	`boundaries` text DEFAULT '[]' NOT NULL,
	`key_epoch` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resource_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`property` text NOT NULL,
	`resource_id` text NOT NULL,
	`data` text NOT NULL,
	`actor` text NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `write_leases` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text NOT NULL
);

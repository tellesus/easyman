CREATE TABLE `account_recovery` (
	`id` text PRIMARY KEY NOT NULL,
	`property` text NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `key_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`property` text NOT NULL,
	`user_id` text NOT NULL,
	`cipher_hash` text NOT NULL,
	`public_hash` text NOT NULL,
	`wrapped` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `properties` ADD `created_at` text DEFAULT '' NOT NULL;
CREATE TABLE `shift_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`property` text NOT NULL,
	`boundary` text NOT NULL,
	`incoming` text NOT NULL,
	`closing` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);

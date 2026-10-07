CREATE TABLE `feedback_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`status` text NOT NULL,
	`issue` integer,
	`created_at` text NOT NULL
);

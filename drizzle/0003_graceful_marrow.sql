ALTER TABLE `index_samples` ADD `cash_amount_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `index_samples` ADD `cash_amount_decimal_point` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `index_samples` ADD `fees_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `index_samples` ADD `taxes_minor` integer DEFAULT 0 NOT NULL;
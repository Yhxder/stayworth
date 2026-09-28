CREATE TABLE `fx_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`base` text(3) NOT NULL,
	`currency_code` text(3) NOT NULL,
	`rate` real NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`provider_updated_at` text,
	`fetched_at` text NOT NULL,
	CONSTRAINT "fx_rates_base_length" CHECK(length("fx_rates"."base") = 3),
	CONSTRAINT "fx_rates_currency_length" CHECK(length("fx_rates"."currency_code") = 3),
	CONSTRAINT "fx_rates_rate_positive" CHECK("fx_rates"."rate" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fx_rates_unique` ON `fx_rates` (`base`,`currency_code`,`fetched_at`);--> statement-breakpoint
CREATE INDEX `idx_fx_rates_base_fetched` ON `fx_rates` (`base`,`fetched_at`);--> statement-breakpoint
CREATE TABLE `hotel_catalog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hotel_code` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`brand_code` text NOT NULL,
	`brand_slug` text,
	`portfolio_tier` text,
	`city_slug` text NOT NULL,
	`city_name_zh` text NOT NULL,
	`country_code` text(2) NOT NULL,
	`latitude` real,
	`longitude` real,
	`banner_classic_url` text,
	`banner_wide_url` text,
	`banner_square_url` text,
	`description` text,
	`rating` real,
	`review_count` integer,
	`seo_slug` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	CONSTRAINT "hotel_catalog_country_length" CHECK(length("hotel_catalog"."country_code") = 2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hotel_catalog_code` ON `hotel_catalog` (`hotel_code`);--> statement-breakpoint
CREATE INDEX `idx_hotel_catalog_city` ON `hotel_catalog` (`city_slug`);--> statement-breakpoint
CREATE INDEX `idx_hotel_catalog_country` ON `hotel_catalog` (`country_code`);--> statement-breakpoint
CREATE TABLE `index_failures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`city_slug` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `index_runs`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_index_failures_run` ON `index_failures` (`run_id`);--> statement-breakpoint
CREATE TABLE `index_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_key` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`panel_version` text NOT NULL,
	`days_ahead` integer NOT NULL,
	`nights` integer NOT NULL,
	`status` text NOT NULL,
	`cities_ok` integer DEFAULT 0 NOT NULL,
	`cities_failed` integer DEFAULT 0 NOT NULL,
	`samples_kept` integer DEFAULT 0 NOT NULL,
	`samples_dropped` integer DEFAULT 0 NOT NULL,
	`requests_sent` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_index_runs_key` ON `index_runs` (`run_key`);--> statement-breakpoint
CREATE TABLE `index_samples` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`captured_at` text NOT NULL,
	`city_slug` text NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`hotel_code` text NOT NULL,
	`hotel_name` text NOT NULL,
	`brand_code` text NOT NULL,
	`brand_slug` text,
	`portfolio_tier` text,
	`currency_code` text(3) NOT NULL,
	`cash_total_minor` integer NOT NULL,
	`cash_total_decimal_point` integer NOT NULL,
	`points` integer NOT NULL,
	`members_only` integer DEFAULT false NOT NULL,
	`value_per_10k` real NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `index_runs`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "index_samples_points_positive" CHECK("index_samples"."points" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_index_samples_unique` ON `index_samples` (`run_id`,`city_slug`,`hotel_code`);--> statement-breakpoint
CREATE INDEX `idx_index_samples_city_checkin` ON `index_samples` (`city_slug`,`check_in`);
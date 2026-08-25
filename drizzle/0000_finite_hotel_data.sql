CREATE TABLE `cities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`country_code` text(2) NOT NULL,
	`search_terms` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "cities_country_code_length" CHECK(length("cities"."country_code") = 2),
	CONSTRAINT "cities_search_terms_wrapped" CHECK("cities"."search_terms" LIKE '|%|')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cities_slug_unique` ON `cities` (`slug`);--> statement-breakpoint
CREATE TABLE `hotels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`city_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`brand_code` text NOT NULL,
	`brand_name` text NOT NULL,
	`portfolio_tier` text NOT NULL,
	`district` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "hotels_portfolio_tier_valid" CHECK("hotels"."portfolio_tier" IN ('Luxury', 'Premium', 'Select', 'Longer Stays', 'Collections'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hotels_slug_unique` ON `hotels` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_hotels_city_tier_active` ON `hotels` (`city_id`,`portfolio_tier`,`active`);--> statement-breakpoint
CREATE TABLE `price_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hotel_id` integer NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`cash_price_minor` integer NOT NULL,
	`points_required` integer NOT NULL,
	`currency_code` text(3) NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text,
	`updated_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "price_snapshots_date_order" CHECK("price_snapshots"."check_out" > "price_snapshots"."check_in"),
	CONSTRAINT "price_snapshots_cash_nonnegative" CHECK("price_snapshots"."cash_price_minor" >= 0),
	CONSTRAINT "price_snapshots_points_positive" CHECK("price_snapshots"."points_required" > 0),
	CONSTRAINT "price_snapshots_currency_length" CHECK(length("price_snapshots"."currency_code") = 3)
);
--> statement-breakpoint
CREATE INDEX `idx_price_snapshots_hotel_dates_updated` ON `price_snapshots` (`hotel_id`,`check_in`,`check_out`,`updated_at`);
--> statement-breakpoint
INSERT INTO `cities`
  (`id`, `slug`, `name_zh`, `name_en`, `country_code`, `search_terms`, `active`, `created_at`, `updated_at`)
VALUES
  (1, 'hong-kong', '香港', 'Hong Kong', 'HK', '|香港|hong kong|hk|', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z'),
  (2, 'shanghai', '上海', 'Shanghai', 'CN', '|上海|shanghai|sha|', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z');
--> statement-breakpoint
INSERT INTO `hotels`
  (`id`, `city_id`, `slug`, `name_zh`, `name_en`, `brand_code`, `brand_name`, `portfolio_tier`, `district`, `active`, `created_at`, `updated_at`)
VALUES
  (1, 1, 'cyberport', '香港数码港艾美酒店', 'Le Méridien Hong Kong, Cyberport', 'le-meridien', 'Le Méridien', 'Premium', '香港岛 · 数码港', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z'),
  (2, 1, 'jw-hong-kong', '香港 JW 万豪酒店', 'JW Marriott Hotel Hong Kong', 'jw-marriott', 'JW Marriott', 'Luxury', '香港岛 · 金钟', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z'),
  (3, 1, 'sheraton-hong-kong', '香港喜来登酒店', 'Sheraton Hong Kong Hotel & Towers', 'sheraton', 'Sheraton', 'Premium', '九龙 · 尖沙咀', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z'),
  (4, 1, 'courtyard-hong-kong', '香港万怡酒店', 'Courtyard by Marriott Hong Kong', 'courtyard', 'Courtyard by Marriott', 'Select', '香港岛 · 西营盘', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z'),
  (5, 2, 'jw-marriott-shanghai-tomorrow-square', '上海明天广场 JW 万豪酒店', 'JW Marriott Hotel Shanghai at Tomorrow Square', 'jw-marriott', 'JW Marriott', 'Luxury', '上海 · 人民广场', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z'),
  (6, 2, 'shanghai-marriott-marquis-city-centre', '上海雅居乐万豪侯爵酒店', 'Shanghai Marriott Marquis City Centre', 'marriott-hotels', 'Marriott Hotels', 'Premium', '上海 · 人民广场', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z'),
  (7, 2, 'courtyard-shanghai-central', '上海浦西万怡酒店', 'Courtyard by Marriott Shanghai Central', 'courtyard', 'Courtyard by Marriott', 'Select', '上海 · 静安', 1, '2026-08-25T00:00:00Z', '2026-08-25T00:00:00Z');
--> statement-breakpoint
INSERT INTO `price_snapshots`
  (`id`, `hotel_id`, `check_in`, `check_out`, `cash_price_minor`, `points_required`, `currency_code`, `source_name`, `source_url`, `updated_at`, `created_at`)
VALUES
  (1, 1, '2026-08-15', '2026-08-16', 130000, 40000, 'CNY', 'StayWorth prototype fixture', NULL, '2026-07-20T20:00:00+08:00', '2026-08-25T00:00:00Z'),
  (2, 1, '2026-08-15', '2026-08-16', 123500, 37000, 'CNY', '用户提供的真实入住记录', NULL, '2026-07-25T20:35:00+08:00', '2026-08-25T00:00:00Z'),
  (3, 2, '2026-08-15', '2026-08-16', 228000, 52000, 'CNY', 'StayWorth prototype fixture', NULL, '2026-07-25T20:35:00+08:00', '2026-08-25T00:00:00Z'),
  (4, 3, '2026-08-15', '2026-08-16', 168000, 48000, 'CNY', 'StayWorth prototype fixture', NULL, '2026-07-25T20:35:00+08:00', '2026-08-25T00:00:00Z'),
  (5, 4, '2026-08-15', '2026-08-16', 112000, 32000, 'CNY', 'StayWorth prototype fixture', NULL, '2026-07-25T20:35:00+08:00', '2026-08-25T00:00:00Z'),
  (6, 5, '2026-08-15', '2026-08-16', 245000, 48000, 'CNY', 'StayWorth prototype fixture', NULL, '2026-08-24T10:00:00+08:00', '2026-08-25T00:00:00Z'),
  (7, 6, '2026-08-15', '2026-08-16', 158000, 35000, 'CNY', 'StayWorth prototype fixture', NULL, '2026-08-24T10:00:00+08:00', '2026-08-25T00:00:00Z'),
  (8, 7, '2026-08-15', '2026-08-16', 98000, 24000, 'CNY', 'StayWorth prototype fixture', NULL, '2026-08-24T10:00:00+08:00', '2026-08-25T00:00:00Z');
--> statement-breakpoint
PRAGMA optimize;

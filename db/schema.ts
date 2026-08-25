import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const portfolioTiers = [
  "Luxury",
  "Premium",
  "Select",
  "Longer Stays",
  "Collections",
] as const;

export const cities = sqliteTable(
  "cities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    nameZh: text("name_zh").notNull(),
    nameEn: text("name_en").notNull(),
    countryCode: text("country_code", { length: 2 }).notNull(),
    searchTerms: text("search_terms").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_cities_slug_unique").on(table.slug),
    check("cities_country_code_length", sql`length(${table.countryCode}) = 2`),
    check("cities_search_terms_wrapped", sql`${table.searchTerms} LIKE '|%|'`),
  ],
);

export const hotels = sqliteTable(
  "hotels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cityId: integer("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "restrict", onUpdate: "cascade" }),
    slug: text("slug").notNull(),
    nameZh: text("name_zh").notNull(),
    nameEn: text("name_en").notNull(),
    brandCode: text("brand_code").notNull(),
    brandName: text("brand_name").notNull(),
    portfolioTier: text("portfolio_tier", { enum: portfolioTiers }).notNull(),
    district: text("district").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_hotels_slug_unique").on(table.slug),
    index("idx_hotels_city_tier_active").on(
      table.cityId,
      table.portfolioTier,
      table.active,
    ),
    check(
      "hotels_portfolio_tier_valid",
      sql`${table.portfolioTier} IN ('Luxury', 'Premium', 'Select', 'Longer Stays', 'Collections')`,
    ),
  ],
);

export const priceSnapshots = sqliteTable(
  "price_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hotelId: integer("hotel_id")
      .notNull()
      .references(() => hotels.id, { onDelete: "cascade", onUpdate: "cascade" }),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    cashPriceMinor: integer("cash_price_minor").notNull(),
    pointsRequired: integer("points_required").notNull(),
    currencyCode: text("currency_code", { length: 3 }).notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    updatedAt: text("updated_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_price_snapshots_hotel_dates_updated").on(
      table.hotelId,
      table.checkIn,
      table.checkOut,
      table.updatedAt,
    ),
    check("price_snapshots_date_order", sql`${table.checkOut} > ${table.checkIn}`),
    check("price_snapshots_cash_nonnegative", sql`${table.cashPriceMinor} >= 0`),
    check("price_snapshots_points_positive", sql`${table.pointsRequired} > 0`),
    check(
      "price_snapshots_currency_length",
      sql`length(${table.currencyCode}) = 3`,
    ),
  ],
);

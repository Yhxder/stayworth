import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
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

/**
 * 每日汇率快照。
 * 1 base 可兑换 rate 个 currency_code。抓取端每天写入一次，页面用的换算都以此为准。
 */
export const fxRates = sqliteTable(
  "fx_rates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    base: text("base", { length: 3 }).notNull(),
    currencyCode: text("currency_code", { length: 3 }).notNull(),
    rate: real("rate").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    /** 数据源自己声明的更新时间 */
    providerUpdatedAt: text("provider_updated_at"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_fx_rates_unique").on(
      table.base,
      table.currencyCode,
      table.fetchedAt,
    ),
    index("idx_fx_rates_base_fetched").on(table.base, table.fetchedAt),
    check("fx_rates_base_length", sql`length(${table.base}) = 3`),
    check("fx_rates_currency_length", sql`length(${table.currencyCode}) = 3`),
    check("fx_rates_rate_positive", sql`${table.rate} > 0`),
  ],
);

/** StayWorth Index：每轮采样一次运行记录。 */
export const indexRuns = sqliteTable(
  "index_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runKey: text("run_key").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    panelVersion: text("panel_version").notNull(),
    daysAhead: integer("days_ahead").notNull(),
    nights: integer("nights").notNull(),
    status: text("status").notNull(),
    citiesOk: integer("cities_ok").notNull().default(0),
    citiesFailed: integer("cities_failed").notNull().default(0),
    samplesKept: integer("samples_kept").notNull().default(0),
    samplesDropped: integer("samples_dropped").notNull().default(0),
    requestsSent: integer("requests_sent").notNull().default(0),
  },
  (table) => [uniqueIndex("idx_index_runs_key").on(table.runKey)],
);

/** StayWorth Index：清洗后的酒店级样本。 */
export const indexSamples = sqliteTable(
  "index_samples",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runId: integer("run_id")
      .notNull()
      .references(() => indexRuns.id, { onDelete: "cascade", onUpdate: "cascade" }),
    capturedAt: text("captured_at").notNull(),
    citySlug: text("city_slug").notNull(),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    hotelCode: text("hotel_code").notNull(),
    hotelName: text("hotel_name").notNull(),
    brandCode: text("brand_code").notNull(),
    /** 仅展示类城市或跨档品牌可能为空 */
    brandSlug: text("brand_slug"),
    portfolioTier: text("portfolio_tier"),
    currencyCode: text("currency_code", { length: 3 }).notNull(),
    /** 数据源给的小数位，1 表示货币最小单位 */
    cashTotalMinor: integer("cash_total_minor").notNull(),
    cashTotalDecimalPoint: integer("cash_total_decimal_point").notNull(),
    /** 税前金额、服务费、税费，与本地库保持一致，便于以后展示明细 */
    cashAmountMinor: integer("cash_amount_minor").notNull().default(0),
    cashAmountDecimalPoint: integer("cash_amount_decimal_point").notNull().default(2),
    feesMinor: integer("fees_minor").notNull().default(0),
    taxesMinor: integer("taxes_minor").notNull().default(0),
    points: integer("points").notNull(),
    membersOnly: integer("members_only", { mode: "boolean" }).notNull().default(false),
    valuePer10k: real("value_per_10k").notNull(),
  },
  (table) => [
    uniqueIndex("idx_index_samples_unique").on(
      table.runId,
      table.citySlug,
      table.hotelCode,
    ),
    index("idx_index_samples_city_checkin").on(table.citySlug, table.checkIn),
    check("index_samples_points_positive", sql`${table.points} > 0`),
  ],
);

/** StayWorth Index：失败城市记录，用于成功率统计。 */
export const indexFailures = sqliteTable(
  "index_failures",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runId: integer("run_id")
      .notNull()
      .references(() => indexRuns.id, { onDelete: "cascade", onUpdate: "cascade" }),
    citySlug: text("city_slug").notNull(),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_index_failures_run").on(table.runId)],
);

/**
 * 酒店目录：名称、品牌、坐标、banner 等与日期无关的静态信息。
 * 价格由 price_snapshots 或用户输入提供，两者解耦。
 */
export const hotelCatalog = sqliteTable(
  "hotel_catalog",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hotelCode: text("hotel_code").notNull(),
    nameZh: text("name_zh").notNull(),
    nameEn: text("name_en").notNull(),
    brandCode: text("brand_code").notNull(),
    brandSlug: text("brand_slug"),
    portfolioTier: text("portfolio_tier"),
    citySlug: text("city_slug").notNull(),
    cityNameZh: text("city_name_zh").notNull(),
    countryCode: text("country_code", { length: 2 }).notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    /** 三种比例的 banner，均为中国站可访问的绝对地址 */
    bannerClassicUrl: text("banner_classic_url"),
    bannerWideUrl: text("banner_wide_url"),
    bannerSquareUrl: text("banner_square_url"),
    description: text("description"),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    seoSlug: text("seo_slug"),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_hotel_catalog_code").on(table.hotelCode),
    index("idx_hotel_catalog_city").on(table.citySlug),
    index("idx_hotel_catalog_country").on(table.countryCode),
    check("hotel_catalog_country_length", sql`length(${table.countryCode}) = 2`),
  ],
);

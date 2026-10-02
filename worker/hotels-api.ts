import { IMAGE_PROXY_URL } from "../app/lib/image-proxy.ts";
import { marriottBrandRules } from "../app/lib/brand-points.ts";
import { cityPanel } from "../app/data/city-panel.ts";

/** 品牌代号（slug）→ 展示名；目录与采样只存代号，展示名在这里补。 */
const brandNames = new Map(marriottBrandRules.map((brand) => [brand.id, brand.name]));

/**
 * 把用户输入的「城市」解析成采样面板里的城市。
 * 支持 slug（shanghai）、中文名（上海）、英文名（Shanghai），大小写与空格不敏感。
 */
export function resolvePanelCity(city: string) {
  const needle = normalizeSearchText(city);
  if (!needle) return null;
  return (
    cityPanel.find(
      (entry) =>
        normalizeSearchText(entry.slug) === needle ||
        normalizeSearchText(entry.nameZh) === needle ||
        normalizeSearchText(entry.nameEn) === needle,
    ) ?? null
  );
}

const portfolioTiers = new Set([
  "Luxury",
  "Premium",
  "Select",
  "Longer Stays",
  "Collections",
]);

type HotelQuery = {
  city: string;
  checkIn: string;
  checkOut: string;
  tier?: string;
};

type DatabaseResult<T> = {
  results?: T[];
  success?: boolean;
};

type PreparedStatement = {
  bind(...values: unknown[]): PreparedStatement;
  all<T>(): Promise<DatabaseResult<T>>;
};

export type HotelDatabase = {
  prepare(sql: string): PreparedStatement;
};

type HotelSnapshotRow = {
  id: string;
  nameZh: string;
  nameEn: string;
  brandId: string;
  brand: string;
  tier: string;
  city: string;
  citySlug: string;
  countryCode: string;
  district: string;
  cashPriceMinor: number;
  pointsRequired: number;
  currency: string;
  sourceLabel: string;
  sourceUrl: string | null;
  updatedAt: string;
  bannerWideUrl: string | null;
  bannerClassicUrl: string | null;
};

/** 图片走本站代理：浏览器不直连万豪 CDN，缓存与尺寸都由本站控制。 */
export function proxiedImagePath(source: string | null): string | null {
  if (!source) return null;
  return `${IMAGE_PROXY_URL}?src=${encodeURIComponent(source)}`;
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase().replaceAll(/\s+/g, " ");
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function queryHotelSnapshots(
  database: HotelDatabase,
  query: HotelQuery,
) {
  const conditions = [
    "c.active = 1",
    "h.active = 1",
    "instr(c.search_terms, '|' || ? || '|') > 0",
    "ps.check_in = ?",
    "ps.check_out = ?",
  ];
  const bindings: unknown[] = [
    normalizeSearchText(query.city),
    query.checkIn,
    query.checkOut,
  ];

  if (query.tier) {
    conditions.push("h.portfolio_tier = ?");
    bindings.push(query.tier);
  }

  const statement = database.prepare(`
    WITH ranked_snapshots AS (
      SELECT
        h.slug AS "id",
        h.name_zh AS "nameZh",
        h.name_en AS "nameEn",
        h.brand_code AS "brandId",
        h.brand_name AS "brand",
        h.portfolio_tier AS "tier",
        c.name_zh AS "city",
        c.slug AS "citySlug",
        c.country_code AS "countryCode",
        h.district AS "district",
        ps.cash_price_minor AS "cashPriceMinor",
        ps.points_required AS "pointsRequired",
        ps.currency_code AS "currency",
        ps.source_name AS "sourceLabel",
        ps.source_url AS "sourceUrl",
        ps.updated_at AS "updatedAt",
        cat.banner_wide_url AS "bannerWideUrl",
        cat.banner_classic_url AS "bannerClassicUrl",
        ROW_NUMBER() OVER (
          PARTITION BY h.id
          ORDER BY ps.updated_at DESC, ps.id DESC
        ) AS snapshot_rank
      FROM cities c
      INNER JOIN hotels h ON h.city_id = c.id
      INNER JOIN price_snapshots ps ON ps.hotel_id = h.id
        /* 目录与价格解耦：按官方英文名对齐，目录是空的或没匹配上时图片走回退 */
      LEFT JOIN hotel_catalog cat ON LOWER(cat.name_en) = LOWER(h.name_en)
      WHERE ${conditions.join("\n        AND ")}
    )
    SELECT
      "id",
      "nameZh",
      "nameEn",
      "brandId",
      "brand",
      "tier",
      "city",
      "citySlug",
      "countryCode",
      "district",
      "cashPriceMinor",
      "pointsRequired",
      "currency",
      "sourceLabel",
      "sourceUrl",
      "updatedAt",
      "bannerWideUrl",
      "bannerClassicUrl"
    FROM ranked_snapshots
    WHERE snapshot_rank = 1
    ORDER BY "cashPriceMinor" ASC, "id" ASC
  `);
  const result = await statement.bind(...bindings).all<HotelSnapshotRow>();

  return (result.results ?? []).map((row) => {
    const { bannerWideUrl, bannerClassicUrl, ...rest } = row;
    return {
      ...rest,
      cashPrice: row.cashPriceMinor / 100,
      imagePath: proxiedImagePath(bannerWideUrl ?? bannerClassicUrl),
    };
  });
}

type IndexSampleRow = {
  id: string;
  hotelName: string;
  catalogNameZh: string | null;
  catalogNameEn: string | null;
  brandCode: string;
  brandSlug: string | null;
  tier: string;
  currency: string;
  cashTotalMinor: number;
  decimalPoint: number;
  pointsRequired: number;
  capturedAt: string;
  cityNameZh: string | null;
  bannerWideUrl: string | null;
  bannerClassicUrl: string | null;
};

/**
 * 从每日采样（index_samples）取某个城市某个日期窗口的酒店。
 *
 * 这是搜索的主数据源：每天 07:00 采样一次，覆盖 20 个城市，
 * 比手工维护的 price_snapshots 新鲜且覆盖面大得多。
 * 只取**该城市该日期窗口下最新的一批**，避免把不同批次混在一起。
 */
export async function queryIndexSamples(
  database: HotelDatabase,
  query: {
    citySlug: string;
    cityNameZh: string;
    countryCode: string;
    checkIn: string;
    checkOut: string;
    tier?: string;
  },
) {
  const conditions = [
    // 编号参数：城市与日期在 CTE 和外层各用一次，不能用匿名的 ?
    "s.city_slug = ?1",
    "s.check_in = ?2",
    "s.check_out = ?3",
    // 跨档品牌（Series by Marriott 等）没有层级，无法参与层级筛选与展示
    "s.portfolio_tier IS NOT NULL",
    "s.points > 0",
  ];
  const bindings: unknown[] = [query.citySlug, query.checkIn, query.checkOut];
  if (query.tier) {
    conditions.push("s.portfolio_tier = ?4");
    bindings.push(query.tier);
  }

  const statement = database.prepare(`
    WITH target AS (
      SELECT MAX(run_id) AS "runId"
      FROM index_samples
      WHERE city_slug = ?1 AND check_in = ?2 AND check_out = ?3
    )
    SELECT
      s.hotel_code AS "id",
      s.hotel_name AS "hotelName",
      cat.name_zh AS "catalogNameZh",
      cat.name_en AS "catalogNameEn",
      s.brand_code AS "brandCode",
      s.brand_slug AS "brandSlug",
      s.portfolio_tier AS "tier",
      s.currency_code AS "currency",
      s.cash_total_minor AS "cashTotalMinor",
      s.cash_total_decimal_point AS "decimalPoint",
      s.points AS "pointsRequired",
      s.captured_at AS "capturedAt",
      cat.city_name_zh AS "cityNameZh",
      cat.banner_wide_url AS "bannerWideUrl",
      cat.banner_classic_url AS "bannerClassicUrl"
    FROM index_samples s
    JOIN target t ON s.run_id = t."runId"
    LEFT JOIN hotel_catalog cat ON cat.hotel_code = s.hotel_code
    WHERE ${conditions.join("\n      AND ")}
    ORDER BY s.cash_total_minor ASC, s.hotel_code ASC
    LIMIT 120
  `);
  const result = await statement.bind(...bindings).all<IndexSampleRow>();

  return (result.results ?? [])
    // 数据可能不完整（例如被误接到别的表）；缺关键字段就跳过，不要让整个接口 500
    .filter((row) => typeof row.id === "string" && typeof row.brandCode === "string")
    .map((row) => {
    const brandId = row.brandSlug ?? row.brandCode.toLowerCase();
    return {
      id: row.id,
      nameZh: row.catalogNameZh ?? row.hotelName,
      nameEn: row.catalogNameEn ?? row.hotelName,
      brandId,
      brand: brandNames.get(brandId) ?? row.brandCode,
      tier: row.tier,
      city: query.cityNameZh,
      citySlug: query.citySlug,
      countryCode: query.countryCode,
      district: row.cityNameZh ?? "",
      // 采样价是含税含费总额，按数据源给的小数位还原
      cashPrice: row.cashTotalMinor / 10 ** row.decimalPoint,
      pointsRequired: row.pointsRequired,
      currency: row.currency,
      sourceLabel: "StayWorth Index 每日采样",
      sourceUrl: null,
      updatedAt: row.capturedAt,
      imagePath: proxiedImagePath(row.bannerWideUrl ?? row.bannerClassicUrl),
    };
  });
}

type CatalogHotelRow = {
  code: string;
  nameZh: string;
  nameEn: string;
  brandCode: string;
  brandSlug: string | null;
  tier: string | null;
  cityNameZh: string;
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  bannerWideUrl: string | null;
  bannerClassicUrl: string | null;
};

/**
 * 城市酒店目录：只给「这个地区有哪些万豪酒店 + banner」，不带价格。
 *
 * 目录是静态字段（名称、品牌、坐标、图片与日期无关），所以价格缺失时
 * 仍然可以把酒店列全——用户至少能看到这个地区有什么，而不是一片空白。
 * 价格仍由每日采样或用户输入提供。
 */
export async function handleCatalogRequest(
  request: Request,
  database: HotelDatabase,
) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim() ?? "";
  if (!city) {
    return jsonResponse({ status: "error", message: "城市不能为空。" }, 400);
  }

  const panelCity = resolvePanelCity(city);
  if (!panelCity) {
    // 面板外的城市暂时没有目录；如实返回空，不猜
    return jsonResponse({ status: "empty", city, hotels: [] });
  }

  try {
    const statement = database.prepare(`
      SELECT
        hotel_code AS "code",
        name_zh AS "nameZh",
        name_en AS "nameEn",
        brand_code AS "brandCode",
        brand_slug AS "brandSlug",
        portfolio_tier AS "tier",
        city_name_zh AS "cityNameZh",
        description, rating, review_count AS "reviewCount",
        banner_wide_url AS "bannerWideUrl",
        banner_classic_url AS "bannerClassicUrl"
      FROM hotel_catalog
      WHERE city_slug = ?
      ORDER BY COALESCE(rating, 0) DESC, name_zh ASC
      LIMIT 80
    `);
    const result = await statement.bind(panelCity.slug).all<CatalogHotelRow>();

    const hotels = (result.results ?? []).map((row) => {
      const brandId = row.brandSlug ?? row.brandCode.toLowerCase();
      const { bannerWideUrl, bannerClassicUrl, ...rest } = row;
      return {
        ...rest,
        brandId,
        brand: brandNames.get(brandId) ?? row.brandCode,
        imagePath: proxiedImagePath(bannerWideUrl ?? bannerClassicUrl),
      };
    });

    if (hotels.length === 0) {
      return jsonResponse({ status: "empty", city: panelCity.nameZh, hotels: [] });
    }
    return jsonResponse({
      status: "ok",
      city: panelCity.nameZh,
      citySlug: panelCity.slug,
      hotels,
    });
  } catch (error) {
    console.error("Catalog query failed", error);
    return jsonResponse({ status: "error", message: "目录暂时无法读取。" }, 500);
  }
}


type CoverageRow = {
  checkIn: string;
  checkOut: string;
};

/**
 * Reports the earliest stay window that has snapshots for a city, so an empty
 * result can point the user at dates the data actually covers instead of
 * leaving them to guess.
 */
export async function queryCityCoverage(
  database: HotelDatabase,
  city: string,
) {
  // 优先指向每日采样的窗口：它是最新的一批；手工快照只在采样没覆盖时兜底。
  const panelCity = resolvePanelCity(city);
  if (panelCity) {
    const indexStatement = database.prepare(`
      SELECT check_in AS "checkIn", check_out AS "checkOut"
      FROM index_samples
      WHERE city_slug = ?
      ORDER BY run_id DESC, check_in ASC
      LIMIT 1
    `);
    const indexResult = await indexStatement
      .bind(panelCity.slug)
      .all<CoverageRow>();
    const indexRow = indexResult.results?.[0];
    if (indexRow) return { checkIn: indexRow.checkIn, checkOut: indexRow.checkOut };
  }

  const statement = database.prepare(`
    SELECT
      ps.check_in AS "checkIn",
      ps.check_out AS "checkOut"
    FROM cities c
    INNER JOIN hotels h ON h.city_id = c.id
    INNER JOIN price_snapshots ps ON ps.hotel_id = h.id
    WHERE c.active = 1
      AND h.active = 1
      AND instr(c.search_terms, '|' || ? || '|') > 0
    ORDER BY ps.check_in ASC, ps.check_out ASC, h.id ASC
    LIMIT 1
  `);
  const result = await statement
    .bind(normalizeSearchText(city))
    .all<CoverageRow>();
  const row = result.results?.[0];

  return row ? { checkIn: row.checkIn, checkOut: row.checkOut } : null;
}

export async function handleHotelSearchRequest(
  request: Request,
  database: HotelDatabase,
) {
  if (request.method !== "GET") {
    return jsonResponse(
      { status: "error", message: "仅支持 GET 请求。" },
      405,
    );
  }

  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim() ?? "";
  const checkIn = url.searchParams.get("checkIn") ?? "";
  const checkOut = url.searchParams.get("checkOut") ?? "";
  const tier = url.searchParams.get("tier")?.trim() || undefined;

  if (!city || !checkIn || !checkOut) {
    return jsonResponse(
      {
        status: "error",
        message: "城市、入住日期和退房日期不能为空。",
      },
      400,
    );
  }

  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) {
    return jsonResponse(
      {
        status: "error",
        message: "日期格式无效，且退房日期必须晚于入住日期。",
      },
      400,
    );
  }

  if (tier && !portfolioTiers.has(tier)) {
    return jsonResponse(
      { status: "error", message: "酒店品牌层级无效。" },
      400,
    );
  }

  try {
    // 主数据源：每日采样（20 城、每天更新）。命中就直接返回。
    const panelCity = resolvePanelCity(city);
    if (panelCity) {
      const sampled = await queryIndexSamples(database, {
        citySlug: panelCity.slug,
        cityNameZh: panelCity.nameZh,
        countryCode: panelCity.countryCode,
        checkIn,
        checkOut,
        tier,
      });
      if (sampled.length > 0) {
        return jsonResponse({
          status: "ok",
          source: "index",
          query: { city, checkIn, checkOut, tier: tier ?? null },
          hotels: sampled,
        });
      }
    }

    // 兜底：手工维护的有限快照（含税费拆分样例），只在采样没覆盖时使用
    const hotels = await queryHotelSnapshots(database, {
      city,
      checkIn,
      checkOut,
      tier,
    });

    if (hotels.length === 0) {
      const coverage = await queryCityCoverage(database, city);

      return jsonResponse({
        status: "empty",
        message: "暂无数据",
        hotels: [],
        coverage,
      });
    }

    return jsonResponse({
      status: "ok",
      source: "snapshot",
      query: { city, checkIn, checkOut, tier: tier ?? null },
      hotels,
    });
  } catch (error) {
    console.error("Hotel snapshot query failed", error);
    return jsonResponse(
      { status: "error", message: "数据暂时无法读取，请稍后重试。" },
      500,
    );
  }
}

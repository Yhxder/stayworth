import { IMAGE_PROXY_URL } from "../app/lib/image-proxy.ts";

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

type FeaturedHotelRow = {
  code: string;
  nameZh: string;
  nameEn: string;
  cityNameZh: string;
  bannerWideUrl: string | null;
  bannerClassicUrl: string | null;
};

/**
 * 首页的「一处奢华信号」：从真实目录里挑一家有官方图片的酒店。
 * 排序固定（评级、点评数、代号），同一份数据每次返回同一家，不随机。
 *
 * 目录里的 city_name_zh 记录的是「搜到这家酒店的搜索面板城市」，不是酒店自身的
 * 所在地：半径搜索会把邻市酒店并进来（生产数据里广州的酒店被记在佛山名下）。
 * 首页把城市和酒店名并排展示，两者一旦矛盾，看起来就像数据出错。因此这里要求
 * 酒店中文名里含有所属面板城市名——这只用于挑选门面，不改动目录数据本身。
 */
export async function handleFeaturedHotelRequest(database: HotelDatabase) {
  try {
    const statement = database.prepare(`
      SELECT
        hotel_code AS "code",
        name_zh AS "nameZh",
        name_en AS "nameEn",
        city_name_zh AS "cityNameZh",
        banner_wide_url AS "bannerWideUrl",
        banner_classic_url AS "bannerClassicUrl"
      FROM hotel_catalog
      WHERE (banner_wide_url IS NOT NULL OR banner_classic_url IS NOT NULL)
        AND city_name_zh <> ''
        AND name_zh LIKE '%' || city_name_zh || '%'
      ORDER BY COALESCE(rating, 0) DESC, COALESCE(review_count, 0) DESC, hotel_code ASC
      LIMIT 1
    `);
    const result = await statement.all<FeaturedHotelRow>();
    const row = result.results?.[0];

    if (!row) {
      return jsonResponse({ hotel: null });
    }

    const { bannerWideUrl, bannerClassicUrl, ...rest } = row;
    return jsonResponse({
      hotel: {
        ...rest,
        imagePath: proxiedImagePath(bannerWideUrl ?? bannerClassicUrl),
        imageSourceLabel: "万豪官方图片",
      },
    });
  } catch (error) {
    console.error("Featured hotel query failed", error);
    return jsonResponse({ hotel: null }, 500);
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

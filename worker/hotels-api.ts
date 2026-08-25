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
  brand: string;
  tier: string;
  city: string;
  district: string;
  cashPriceMinor: number;
  pointsRequired: number;
  currency: string;
  sourceLabel: string;
  sourceUrl: string | null;
  updatedAt: string;
};

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
        h.brand_name AS "brand",
        h.portfolio_tier AS "tier",
        c.name_zh AS "city",
        h.district AS "district",
        ps.cash_price_minor AS "cashPriceMinor",
        ps.points_required AS "pointsRequired",
        ps.currency_code AS "currency",
        ps.source_name AS "sourceLabel",
        ps.source_url AS "sourceUrl",
        ps.updated_at AS "updatedAt",
        ROW_NUMBER() OVER (
          PARTITION BY h.id
          ORDER BY ps.updated_at DESC, ps.id DESC
        ) AS snapshot_rank
      FROM cities c
      INNER JOIN hotels h ON h.city_id = c.id
      INNER JOIN price_snapshots ps ON ps.hotel_id = h.id
      WHERE ${conditions.join("\n        AND ")}
    )
    SELECT
      "id",
      "nameZh",
      "nameEn",
      "brand",
      "tier",
      "city",
      "district",
      "cashPriceMinor",
      "pointsRequired",
      "currency",
      "sourceLabel",
      "sourceUrl",
      "updatedAt"
    FROM ranked_snapshots
    WHERE snapshot_rank = 1
    ORDER BY "cashPriceMinor" ASC, "id" ASC
  `);
  const result = await statement.bind(...bindings).all<HotelSnapshotRow>();

  return (result.results ?? []).map((row) => ({
    ...row,
    cashPrice: row.cashPriceMinor / 100,
  }));
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
      return jsonResponse({ status: "empty", message: "暂无数据", hotels: [] });
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

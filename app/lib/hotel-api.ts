import type {
  Hotel,
  PortfolioTier,
  SearchFilters,
} from "../types/hotel";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type FetchHotelOptions = {
  fetcher?: Fetcher;
  signal?: AbortSignal;
};

export type CityCoverage = {
  checkIn: string;
  checkOut: string;
};

export type HotelSearchPayload =
  | { status: "ok"; hotels: Hotel[] }
  | {
      status: "empty";
      message: string;
      hotels: [];
      coverage: CityCoverage | null;
    };

const portfolioTiers = new Set<PortfolioTier>([
  "Luxury",
  "Premium",
  "Select",
  "Longer Stays",
  "Collections",
]);

const currencyCodes = new Set<Hotel["currency"]>([
  "CNY",
  "HKD",
  "USD",
  "CAD",
  "JPY",
  "KRW",
  "SGD",
  "THB",
  "EUR",
  "GBP",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isCityCoverage(value: unknown): value is CityCoverage {
  return (
    isRecord(value) &&
    typeof value.checkIn === "string" &&
    typeof value.checkOut === "string"
  );
}

function isHotel(value: unknown): value is Hotel {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.nameZh === "string" &&
    typeof value.nameEn === "string" &&
    typeof value.brandId === "string" &&
    typeof value.brand === "string" &&
    typeof value.tier === "string" &&
    portfolioTiers.has(value.tier as PortfolioTier) &&
    typeof value.city === "string" &&
    typeof value.district === "string" &&
    typeof value.cashPrice === "number" &&
    Number.isFinite(value.cashPrice) &&
    value.cashPrice >= 0 &&
    typeof value.pointsRequired === "number" &&
    Number.isFinite(value.pointsRequired) &&
    value.pointsRequired > 0 &&
    typeof value.currency === "string" &&
    currencyCodes.has(value.currency as Hotel["currency"]) &&
    typeof value.sourceLabel === "string" &&
    isNullableString(value.sourceUrl) &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(new Date(value.updatedAt).getTime())
  );
}

function responseMessage(body: unknown, fallback: string) {
  return isRecord(body) && typeof body.message === "string"
    ? body.message
    : fallback;
}

export function buildHotelSearchUrl(filters: SearchFilters) {
  const search = new URLSearchParams({
    city: filters.city.trim(),
    checkIn: filters.checkIn,
    checkOut: filters.checkOut,
  });

  if (filters.tier !== "全部等级") {
    search.set("tier", filters.tier);
  }

  return `/api/hotels?${search.toString()}`;
}

export async function fetchHotelSnapshots(
  filters: SearchFilters,
  options: FetchHotelOptions = {},
): Promise<HotelSearchPayload> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(buildHotelSearchUrl(filters), {
    headers: { accept: "application/json" },
    signal: options.signal,
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("接口返回了无法识别的数据，请稍后重试。");
  }

  if (!response.ok) {
    throw new Error(responseMessage(body, "酒店数据查询失败，请稍后重试。"));
  }

  if (!isRecord(body)) {
    throw new Error("酒店数据格式无效，请稍后重试。");
  }

  if (body.status === "empty") {
    if (!Array.isArray(body.hotels) || body.hotels.length !== 0) {
      throw new Error("酒店数据格式无效，请稍后重试。");
    }

    const coverage =
      body.coverage == null
        ? null
        : isCityCoverage(body.coverage)
          ? body.coverage
          : undefined;

    if (coverage === undefined) {
      throw new Error("酒店数据格式无效，请稍后重试。");
    }

    return {
      status: "empty",
      message: responseMessage(body, "暂无数据"),
      hotels: [],
      coverage,
    };
  }

  if (
    body.status !== "ok" ||
    !Array.isArray(body.hotels) ||
    !body.hotels.every(isHotel)
  ) {
    throw new Error("酒店数据格式无效，请稍后重试。");
  }

  return { status: "ok", hotels: body.hotels };
}

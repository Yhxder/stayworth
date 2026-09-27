/**
 * StayWorth Index 采样的纯逻辑层：日期窗口、响应解析、清洗与价值计算。
 *
 * 本文件不发起任何网络请求，也不访问数据库，便于单元测试。
 * 抓取与落库分别在 scraper/marriott-cn.ts、scraper/index-store.ts。
 * 规格见 docs/DATA_SAMPLING_SPEC.md 第四、五节。
 */

import type { PanelCity } from "../data/city-panel";
import type { PortfolioTier } from "../types/hotel";

/** 积分兑换价所在的费率分组代号（Marriott Rewards）。 */
export const REDEMPTION_RATE_CLUSTER = "MRW";

/** 现金价使用的标准费率分组。 */
export const STANDARD_RATE_CATEGORY = "StandardRates";

export type CashAmounts = {
  amountMinor: number;
  amountDecimalPoint: number;
  totalMinor: number;
  totalDecimalPoint: number;
  feesMinor: number;
  feesDecimalPoint: number;
  taxesMinor: number;
  taxesDecimalPoint: number;
};

export type RawHotelRecord = {
  hotelCode: string;
  hotelName: string;
  brandCode: string;
  brandName: string;
  currencyCode: string;
  pointsPerNight: number | null;
  cash: CashAmounts | null;
  membersOnly: boolean;
};

export type IndexSample = {
  citySlug: string;
  checkIn: string;
  checkOut: string;
  capturedAt: string;
  hotelCode: string;
  hotelName: string;
  brandCode: string;
  brandSlug: string | null;
  portfolioTier: PortfolioTier | null;
  currencyCode: string;
  cash: CashAmounts;
  points: number;
  membersOnly: boolean;
  /** 含税含费总额 ÷ 积分 × 10000，单位为该币种的主单位 */
  valuePerTenThousand: number;
};

export type DroppedSample = {
  hotelCode: string;
  reason:
    | "missing_points"
    | "missing_cash"
    | "non_positive"
    | "outlier"
    | "unmapped_brand"
    | "currency_mismatch";
  valuePerTenThousand?: number;
};

// ── 类型安全的取值助手 ────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readMonetary(value: unknown): { minor: number; decimalPoint: number } | null {
  const record = asRecord(value);
  if (!record) return null;
  const minor = asNumber(record.amount);
  const decimalPoint = asNumber(record.decimalPoint) ?? 2;
  if (minor === null) return null;
  return { minor, decimalPoint };
}

function readCashAmounts(value: unknown): CashAmounts | null {
  const record = asRecord(value);
  if (!record) return null;
  const amount = readMonetary(record.amount);
  const total = readMonetary(record.totalAmount) ?? readMonetary(record.amountPlusMandatoryFees);
  if (!amount || !total) return null;
  const fees = readMonetary(record.fees);
  const taxes = readMonetary(record.taxes);
  return {
    amountMinor: amount.minor,
    amountDecimalPoint: amount.decimalPoint,
    totalMinor: total.minor,
    totalDecimalPoint: total.decimalPoint,
    feesMinor: fees?.minor ?? 0,
    feesDecimalPoint: fees?.decimalPoint ?? amount.decimalPoint,
    taxesMinor: taxes?.minor ?? 0,
    taxesDecimalPoint: taxes?.decimalPoint ?? amount.decimalPoint,
  };
}

// ── 日期窗口 ──────────────────────────────────────────────────

function formatInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * 计算采样日期窗口：城市当地时间的「今天 + daysAhead」入住，连住 nights 晚。
 * 日期一律按城市时区计算，不做跨时区折算。
 */
export function futureWindow(
  city: Pick<PanelCity, "timezone">,
  options: { daysAhead?: number; nights?: number; now?: Date } = {},
): { checkIn: string; checkOut: string } {
  const { daysAhead = 30, nights = 1, now = new Date() } = options;
  const todayLocal = formatInTimeZone(now, city.timezone);
  const checkIn = addDays(todayLocal, daysAhead);
  return { checkIn, checkOut: addDays(checkIn, nights) };
}

// ── 响应解析 ──────────────────────────────────────────────────

function readRateModes(rate: Record<string, unknown>): {
  points: number | null;
  cash: CashAmounts | null;
} {
  const modes = asRecord(rate.rateModes);
  if (!modes) return { points: null, cash: null };

  const pointsPerUnit = asRecord(modes.pointsPerUnit);
  const cashAndPoints = asRecord(modes.cashAndPointsPerUnit);
  const lowestAverageRate = asRecord(modes.lowestAverageRate);

  const points =
    asNumber(pointsPerUnit?.points) ??
    asNumber(cashAndPoints?.points) ??
    null;

  const cash =
    readCashAmounts(lowestAverageRate) ??
    readCashAmounts(cashAndPoints) ??
    null;

  return { points, cash };
}

/**
 * 把一家酒店的多条费率合并为一行：
 * - 积分价取兑换分组（MRW）里可售的那条；
 * - 现金价取 StandardRates 分组里可售的那条；
 * - 促销（P17）与其他重复条目一律丢弃。
 */
function readHotel(node: Record<string, unknown>): RawHotelRecord | null {
  const property = asRecord(node.property);
  if (!property) return null;
  const basic = asRecord(property.basicInformation);
  if (!basic) return null;
  const brand = asRecord(basic.brand);

  const hotelCode = asString(property.id);
  const hotelName = asString(basic.name);
  const brandCode = asString(brand?.id);
  const currencyCode = asString(basic.currency);
  if (!hotelCode || !hotelName || !brandCode || !currencyCode) return null;

  let pointsPerNight: number | null = null;
  let cash: CashAmounts | null = null;
  let membersOnly = false;

  for (const entry of asArray(node.rates)) {
    const rate = asRecord(entry);
    if (!rate) continue;
    const category = asRecord(rate.rateCategory);
    const status = asRecord(rate.status);
    const statusCode = asString(status?.code);
    if (statusCode !== null && statusCode !== "AvailableForSale") continue;

    const { points, cash: rateCash } = readRateModes(rate);
    const categoryCode = asString(category?.code);
    const categoryValue = asString(category?.value);

    if (
      pointsPerNight === null &&
      points !== null &&
      points > 0 &&
      categoryValue === REDEMPTION_RATE_CLUSTER
    ) {
      pointsPerNight = points;
      if (rate.membersOnly === true) membersOnly = true;
    }

    if (cash === null && rateCash !== null && categoryCode === STANDARD_RATE_CATEGORY) {
      cash = rateCash;
      if (rate.membersOnly === true) membersOnly = true;
    }
  }

  return {
    hotelCode,
    hotelName,
    brandCode,
    brandName: asString(brand?.name) ?? brandCode,
    currencyCode,
    pointsPerNight,
    cash,
    membersOnly,
  };
}

/**
 * 解析房价接口响应。
 * 兼容 searchByDestination（按城市名搜索）与 searchByGeolocation（按坐标搜索）两种结构。
 */
export function parseSearchResponse(payload: unknown): RawHotelRecord[] {
  const data = asRecord(asRecord(payload)?.data);
  const search = asRecord(data?.search);
  const lowest = asRecord(search?.lowestAvailableRates);
  if (!lowest) return [];

  const connection =
    asRecord(lowest.searchByDestination) ??
    asRecord(lowest.searchByGeolocation);
  const edges = asArray(connection?.edges);

  const hotels: RawHotelRecord[] = [];
  for (const edge of edges) {
    const node = asRecord(asRecord(edge)?.node);
    if (!node) continue;
    const hotel = readHotel(node);
    if (hotel) hotels.push(hotel);
  }
  return hotels;
}

// ── 价值计算 ──────────────────────────────────────────────────

export function toMajorUnits(minor: number, decimalPoint: number): number {
  return minor / 10 ** decimalPoint;
}

/** 每万分价值 = 含税含费总额 ÷ 积分需求 × 10000。 */
export function valuePerTenThousand(
  totalMinor: number,
  totalDecimalPoint: number,
  points: number,
): number | null {
  if (!(points > 0) || !(totalMinor > 0)) return null;
  return (toMajorUnits(totalMinor, totalDecimalPoint) / points) * 10000;
}

// ── 清洗 ──────────────────────────────────────────────────────

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function quantile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export type CleanInput = {
  hotel: RawHotelRecord;
  citySlug: string;
  checkIn: string;
  checkOut: string;
  capturedAt: string;
  brandSlug: string | null;
  portfolioTier: PortfolioTier | null;
  /**
   * 该城市在面板里登记的当地币种。
   * 搜索是「中心点 + 半径」，会把邻国酒店一并返回（实测多伦多的结果里混进了美国酒店），
   * 币种不一致的记录必须剔除，否则会把别国价格算进这个国家的参考值。
   */
  expectedCurrency: string;
  /**
   * 已识别、但明确不归入五档的独立品牌（如 Series by Marriott、Marriott Vacation Club）。
   * 这类样本照常保留，只把 portfolioTier 留空，供聚合层单独成行。
   */
  separateBrand?: boolean;
};

export type CleanResult = {
  kept: IndexSample[];
  dropped: DroppedSample[];
};

/**
 * 单条记录的基础过滤：必须有积分、有现金价、都为正数。
 * 品牌已识别但被归为「单独列出」时保留样本，层级留空；品牌完全未知才丢弃。
 */
function toSample(input: CleanInput, dropped: DroppedSample[]): IndexSample | null {
  const { hotel } = input;
  if (hotel.currencyCode !== input.expectedCurrency) {
    dropped.push({ hotelCode: hotel.hotelCode, reason: "currency_mismatch" });
    return null;
  }
  if (hotel.pointsPerNight === null || hotel.pointsPerNight <= 0) {
    dropped.push({ hotelCode: hotel.hotelCode, reason: "missing_points" });
    return null;
  }
  if (hotel.cash === null) {
    dropped.push({ hotelCode: hotel.hotelCode, reason: "missing_cash" });
    return null;
  }
  const value = valuePerTenThousand(
    hotel.cash.totalMinor,
    hotel.cash.totalDecimalPoint,
    hotel.pointsPerNight,
  );
  if (value === null) {
    dropped.push({ hotelCode: hotel.hotelCode, reason: "non_positive" });
    return null;
  }
  if (input.brandSlug === null) {
    dropped.push({
      hotelCode: hotel.hotelCode,
      reason: "unmapped_brand",
      valuePerTenThousand: value,
    });
    return null;
  }
  if (input.portfolioTier === null && input.separateBrand !== true) {
    dropped.push({
      hotelCode: hotel.hotelCode,
      reason: "unmapped_brand",
      valuePerTenThousand: value,
    });
    return null;
  }
  return {
    citySlug: input.citySlug,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    capturedAt: input.capturedAt,
    hotelCode: hotel.hotelCode,
    hotelName: hotel.hotelName,
    brandCode: hotel.brandCode,
    brandSlug: input.brandSlug,
    portfolioTier: input.portfolioTier,
    currencyCode: hotel.currencyCode,
    cash: hotel.cash,
    points: hotel.pointsPerNight,
    membersOnly: hotel.membersOnly,
    valuePerTenThousand: value,
  };
}

/**
 * 清洗一个城市的一批酒店：
 * 1. 丢弃缺积分、缺现金价、非正数与未映射品牌的记录；
 * 2. 计算每万分价值；
 * 3. 丢弃偏离城市中位数 5 倍以上的异常值（通常是现金价异常）。
 */
export function cleanCitySamples(inputs: CleanInput[]): CleanResult {
  const dropped: DroppedSample[] = [];
  const candidates: IndexSample[] = [];
  for (const input of inputs) {
    const sample = toSample(input, dropped);
    if (sample) candidates.push(sample);
  }

  const center = median(candidates.map((sample) => sample.valuePerTenThousand));
  if (center === null || center <= 0) {
    return { kept: candidates, dropped };
  }

  const lower = center / 5;
  const upper = center * 5;
  const kept: IndexSample[] = [];
  for (const sample of candidates) {
    if (sample.valuePerTenThousand < lower || sample.valuePerTenThousand > upper) {
      dropped.push({
        hotelCode: sample.hotelCode,
        reason: "outlier",
        valuePerTenThousand: sample.valuePerTenThousand,
      });
      continue;
    }
    kept.push(sample);
  }
  return { kept, dropped };
}

// ── 汇总（供命令行输出与后续聚合复用）─────────────────────────

export type SampleSummary = {
  count: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
};

export function summarize(samples: IndexSample[]): SampleSummary {
  const values = samples.map((sample) => sample.valuePerTenThousand);
  if (values.length === 0) {
    return { count: 0, p25: null, median: null, p75: null, min: null, max: null };
  }
  return {
    count: values.length,
    p25: quantile(values, 0.25),
    median: median(values),
    p75: quantile(values, 0.75),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

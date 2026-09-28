/**
 * 把 StayWorth Index 的参考值落到「用户住的那家酒店」上。
 *
 * 三级回退，逐级放宽，并且**每一级都要在界面上标明**：
 *   1. 城市口径——酒店所在城市在采样面板里，且样本达标；
 *   2. 国家/地区口径——城市没采到，退到所在国家/地区；
 *   3. 全球口径——国家也没采到，退到全部采样市场。
 *
 * 三条口径纪律：
 * - 这是**市场参考中位数**，不是这家酒店的兑换价值；
 * - 城市/国家口径的原始值用当地货币，展示时按当日汇率换算到用户选的币种；
 * - 汇率缺失时保留当地货币并标记 `localOnly`，绝不猜。
 *
 * 纯函数，不联网、不落库，便于单测。
 */

export type IndexRow = {
  key: string;
  label: string;
  currencyCode: string;
  value: number | null;
  p25: number | null;
  p75: number | null;
  sampleCount: number;
  cityCount: number;
};

export type IndexViewShape = { rows: IndexRow[] };

export type IndexSummaryShape = {
  runKey: string;
  sampleCount: number;
  cityCount: number;
  currency: { display: string; options: string[] };
  views: {
    byCurrency: Record<string, { global: IndexViewShape }>;
    country: IndexViewShape;
    city?: IndexViewShape;
  };
};

export type ReferenceLevel = "city" | "country" | "global";

export type MarketReference = {
  level: ReferenceLevel;
  /** 例如「城市口径」 */
  levelLabel: string;
  /** 例如「香港」「中国香港」「全部采样市场」 */
  scopeLabel: string;
  /** 已换算到目标币种的值 */
  value: number;
  currencyCode: string;
  /** 原始当地货币值；与目标币种一致时为 null */
  localValue: number | null;
  localCurrencyCode: string | null;
  sampleCount: number;
  cityCount: number;
  /** 数据日期（批次标识） */
  runKey: string;
  /** true 表示缺汇率，只能给当地货币 */
  localOnly: boolean;
};

export type ConvertFn = (amount: number, from: string, to: string) => number | null;

const LEVEL_LABELS: Record<ReferenceLevel, string> = {
  city: "城市口径",
  country: "国家/地区口径",
  global: "全球口径",
};

function buildReference(
  row: IndexRow,
  level: ReferenceLevel,
  targetCurrency: string,
  summary: IndexSummaryShape,
  convert: ConvertFn,
): MarketReference | null {
  if (row.value === null || row.value <= 0) return null;

  const converted =
    row.currencyCode === targetCurrency
      ? row.value
      : convert(row.value, row.currencyCode, targetCurrency);

  if (converted === null) {
    // 汇率缺失：如实给当地货币，并标记 localOnly
    return {
      level,
      levelLabel: LEVEL_LABELS[level],
      scopeLabel: row.label,
      value: row.value,
      currencyCode: row.currencyCode,
      localValue: null,
      localCurrencyCode: null,
      sampleCount: row.sampleCount,
      cityCount: row.cityCount,
      runKey: summary.runKey,
      localOnly: true,
    };
  }

  return {
    level,
    levelLabel: LEVEL_LABELS[level],
    scopeLabel: row.label,
    value: converted,
    currencyCode: targetCurrency,
    localValue: row.currencyCode === targetCurrency ? null : row.value,
    localCurrencyCode: row.currencyCode === targetCurrency ? null : row.currencyCode,
    sampleCount: row.sampleCount,
    cityCount: row.cityCount,
    runKey: summary.runKey,
    localOnly: false,
  };
}

/**
 * 找到该酒店可用的市场参考值，按 城市 → 国家/地区 → 全球 的顺序回退。
 * 全部缺失时返回 null，调用方应当不显示任何数字。
 */
export function findMarketReference(input: {
  summary: IndexSummaryShape;
  /** 酒店所在城市在采样面板里的标识，如 hong-kong；未知传 null */
  citySlug?: string | null;
  /** 酒店所在国家/地区代码，如 HK；未知传 null */
  countryCode?: string | null;
  /** 用户当前选择的结算币种 */
  currency: string;
  convert: ConvertFn;
}): MarketReference | null {
  const { summary, citySlug, countryCode, currency, convert } = input;

  const cityRow = citySlug
    ? summary.views.city?.rows.find((row) => row.key === citySlug)
    : undefined;
  if (cityRow) {
    const reference = buildReference(cityRow, "city", currency, summary, convert);
    if (reference) return reference;
  }

  const countryRow = countryCode
    ? summary.views.country.rows.find((row) => row.key === countryCode)
    : undefined;
  if (countryRow) {
    const reference = buildReference(
      countryRow,
      "country",
      currency,
      summary,
      convert,
    );
    if (reference) return reference;
  }

  const globalView =
    summary.views.byCurrency[currency] ??
    summary.views.byCurrency[summary.currency.display];
  const globalRow = globalView?.global.rows[0];
  if (!globalRow) return null;

  // 全球值本身就是统一货币口径
  return buildReference(
    { ...globalRow, currencyCode: currency },
    "global",
    currency,
    summary,
    convert,
  );
}

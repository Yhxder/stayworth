/**
 * 回血计算器使用的币种与参考汇率。
 *
 * 汇率不再是手抄表：数值来自 `app/data/fx-snapshot.json`，
 * 而那份快照由每日抓取写入（源头是 D1 的 `fx_rates` 表，见 scraper/fx-rates.ts）。
 * 因此计算器与 StayWorth Index 用的是同一套汇率，不会出现两个日期、两个来源。
 *
 * 快照随构建打进前端，所以它反映「最后一次发布时的汇率」；
 * 页面照例显示参考日期与来源，并提示可以手动修改。
 */

// 运行时要被 Node 直接执行，必须带扩展名（见 DEVELOPMENT_NOTES 的既有约定）。
import { FX_SNAPSHOT as fxSnapshot } from "../data/fx-snapshot.ts";

const rates = fxSnapshot.rates as Record<string, number>;

export const EXCHANGE_RATE_REFERENCE_DATE = fxSnapshot.referenceDate;
export const EXCHANGE_RATE_SOURCE_URL = fxSnapshot.sourceUrl;
export const EXCHANGE_RATE_SOURCE_NAME = fxSnapshot.sourceName;

/** 币种展示信息；汇率在下面统一从快照推导，避免两处数据不一致。 */
const currencyMeta = [
  { code: "CNY", label: "人民币", symbol: "¥", fractionDigits: 2 },
  { code: "HKD", label: "港币", symbol: "HK$", fractionDigits: 2 },
  { code: "USD", label: "美元", symbol: "US$", fractionDigits: 2 },
  { code: "CAD", label: "加拿大元", symbol: "CA$", fractionDigits: 2 },
  { code: "JPY", label: "日元", symbol: "JP¥", fractionDigits: 0 },
  { code: "KRW", label: "韩元", symbol: "₩", fractionDigits: 0 },
  { code: "SGD", label: "新加坡元", symbol: "S$", fractionDigits: 2 },
  { code: "THB", label: "泰铢", symbol: "฿", fractionDigits: 2 },
  { code: "EUR", label: "欧元", symbol: "€", fractionDigits: 2 },
  { code: "GBP", label: "英镑", symbol: "£", fractionDigits: 2 },
  // 下面几个是为了让 Index 的国家参考值（当地货币）能换算到用户选的币种而补的
  { code: "TWD", label: "新台币", symbol: "NT$", fractionDigits: 0 },
  { code: "INR", label: "印度卢比", symbol: "₹", fractionDigits: 0 },
  { code: "AED", label: "阿联酋迪拉姆", symbol: "AED ", fractionDigits: 2 },
  { code: "AUD", label: "澳大利亚元", symbol: "A$", fractionDigits: 2 },
  { code: "BRL", label: "巴西雷亚尔", symbol: "R$", fractionDigits: 2 },
  { code: "COP", label: "哥伦比亚比索", symbol: "COL$ ", fractionDigits: 0 },
] as const;

export type CurrencyCode = (typeof currencyMeta)[number]["code"];

/**
 * 快照以 CNY 为基准，所以 1 USD = rates.USD 个 CNY，
 * 而 unitsPerUsd 表示「1 美元等于多少该币种」，即 rates[code] / rates.USD。
 */
const unitsPerBase = rates.CNY ?? 1;
const unitsPerUsdRate = rates.USD ?? 1;

/**
 * 汇率只保留两位小数，而且直接截断、不做四舍五入。
 *
 * 接口给的是 6–8 位小数（如 1 USD ≈ 6.721562765 CNY），对「参考汇率」这个用途
 * 没有任何意义，却会把输入框和说明文字撑成一行长数字。截断而不是四舍五入，
 * 是避免把换算结果往「更划算」的方向微调——宁可少一点，也不要看起来比实际更优。
 */
export const EXCHANGE_RATE_FRACTION_DIGITS = 2;

function truncateToDigits(value: number, digits: number) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const nearest = Math.round(scaled);

  // 浮点误差保护：6.72 * 100 可能算出 671.9999999999999，
  // 直接 Math.floor 会把它截成 6.71。
  const whole = Math.abs(scaled - nearest) < 1e-6 ? nearest : Math.floor(scaled);

  return whole / factor;
}

export const currencyOptions = currencyMeta.map((meta) => ({
  ...meta,
  unitsPerUsd: truncateToDigits(
    (rates[meta.code] ?? unitsPerBase) / unitsPerUsdRate,
    EXCHANGE_RATE_FRACTION_DIGITS,
  ),
}));

/** 展示用汇率：固定两位小数，和计算用的值完全一致（同一个 unitsPerUsd）。 */
export function formatExchangeRate(value: number) {
  return value.toFixed(EXCHANGE_RATE_FRACTION_DIGITS);
}

export function getCurrencyConfig(code: string) {
  const currency = currencyOptions.find((option) => option.code === code);

  if (!currency) {
    throw new RangeError(`Unsupported currency: ${code}`);
  }

  return currency;
}

export function formatCurrencyAmount(value: number, code: CurrencyCode) {
  const currency = getCurrencyConfig(code);
  const sign = value < 0 ? "-" : "";
  const formattedNumber = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: currency.fractionDigits,
    maximumFractionDigits: currency.fractionDigits,
  }).format(Math.abs(value));

  return `${sign}${currency.symbol}${formattedNumber}`;
}

export function convertCurrencyAmount(
  value: number,
  fromCode: CurrencyCode,
  toCode: CurrencyCode,
) {
  const fromCurrency = getCurrencyConfig(fromCode);
  const toCurrency = getCurrencyConfig(toCode);
  const convertedValue =
    (value / fromCurrency.unitsPerUsd) * toCurrency.unitsPerUsd;
  const roundingFactor = 10 ** toCurrency.fractionDigits;

  return (
    Math.round((convertedValue + Number.EPSILON) * roundingFactor) /
    roundingFactor
  );
}

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return currencyOptions.some((option) => option.code === code);
}

/**
 * 供 StayWorth Index 参考值换算使用：币种不认识时返回 null 而不是抛错，
 * 让调用方可以退化成「只显示当地货币」。
 */
export function tryConvertCurrencyAmount(
  value: number,
  fromCode: string,
  toCode: string,
): number | null {
  if (!isSupportedCurrency(fromCode) || !isSupportedCurrency(toCode)) return null;
  return convertCurrencyAmount(value, fromCode, toCode);
}

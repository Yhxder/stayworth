/**
 * StayWorth Index 统一货币换算。
 *
 * 汇率来自开放接口（open.er-api.com，覆盖 166 种货币、无需密钥、每日更新），
 * 每天由抓取端写入 D1 的 `fx_rates` 表，导出时读取最新一行。
 *
 * 这里保留一份**兜底表**：D1 暂时读不到时用它在本地算出结果，并在页面上注明用的是兜底汇率。
 * 兜底表是 2026-09-28 的真实快照，不是估算值。
 *
 * 口径：1 基准币 = rates[X] 个目标币。基准统一用 CNY。
 */

export const FX_BASE = "CNY";
export const FX_FALLBACK_REFERENCE_DATE = "2026-09-28";
export const FX_FALLBACK_SOURCE_NAME = "open.er-api.com（ExchangeRate-API 开放端点）";
export const FX_FALLBACK_SOURCE_URL = "https://open.er-api.com/v6/latest/CNY";

/** 1 CNY = 表中数值个目标币。 */
export const FX_FALLBACK_RATES: Record<string, number> = {
  CNY: 1,
  JPY: 23.456869,
  KRW: 203.086921,
  HKD: 1.167613,
  TWD: 4.739336,
  SGD: 0.190259,
  THB: 4.963391,
  INR: 14.265132,
  AUD: 0.21233,
  GBP: 0.112528,
  EUR: 0.130816,
  AED: 0.546545,
  USD: 0.148821,
  CAD: 0.210588,
  BRL: 0.769408,
  COP: 496.210616,
};

export type ConvertCurrency = (
  amount: number,
  from: string,
  to: string,
) => number | null;

/**
 * 用一张汇率表构造换算函数。
 * 任一币种不在表里就返回 null——宁可不要数字，也不猜汇率。
 */
export function makeConverter(
  rates: Record<string, number> = FX_FALLBACK_RATES,
): ConvertCurrency {
  return (amount, from, to) => {
    if (from === to) return amount;
    const fromRate = rates[from];
    const toRate = rates[to];
    if (!fromRate || !toRate) return null;
    // rates[X] = 1 基准币可兑换的 X 数量：先折回基准币，再折到目标币
    return (amount / fromRate) * toRate;
  };
}

/** 用兜底汇率表构造的换算函数，供测试与无 D1 场景使用。 */
export const convertCurrency: ConvertCurrency = makeConverter();

export function hasRate(currencyCode: string, rates = FX_FALLBACK_RATES): boolean {
  return Object.prototype.hasOwnProperty.call(rates, currencyCode);
}

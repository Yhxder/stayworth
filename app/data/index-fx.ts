/**
 * StayWorth Index 统一货币换算用的汇率表。
 *
 * 来源：欧洲央行每日参考汇率（ECB reference rates），以欧元为基准。
 * 参考日期：2026-09-25（最近一个工作日）。
 * 该汇率仅用于展示层换算，不写回原始样本；页面上必须标注来源与日期，并注明非实时。
 *
 * 覆盖情况：面板 18 种当地币种中，ECB 覆盖 15 种。
 * 缺口：TWD（新台币）、VND（越南盾）、AED（迪拉姆）不在 ECB 参考汇率清单内，
 * 因此台湾、越南、阿联酋三个市场的样本不参与统一货币视图，只提供当地货币口径。
 * 补齐来源前不得用近似值填充（见 docs/DATA_SAMPLING_SPEC.md 第八节）。
 */

export const INDEX_FX_REFERENCE_DATE = "2026-09-25";
export const INDEX_FX_SOURCE_NAME = "欧洲央行参考汇率 (ECB)";
export const INDEX_FX_SOURCE_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

/** 1 欧元可兑换的当地货币数量。 */
export const unitsPerEur: Record<string, number> = {
  EUR: 1,
  USD: 1.1403,
  JPY: 179.7,
  KRW: 1545.16,
  SGD: 1.4563,
  THB: 38.023,
  HKD: 8.9445,
  CNY: 7.6551,
  GBP: 0.86045,
  MYR: 4.6456,
  IDR: 20427.22,
  PHP: 71.244,
  INR: 109.2605,
  AUD: 1.622,
  CAD: 1.6127,
};

/** 面板中存在、但当前汇率来源未覆盖的币种。 */
export const currenciesWithoutRate = ["TWD", "VND", "AED"] as const;

export function hasRate(currencyCode: string): boolean {
  return Object.prototype.hasOwnProperty.call(unitsPerEur, currencyCode);
}

/**
 * 把 amount 从 from 换算到 to。
 * 任一币种缺少汇率时返回 null——宁可不要数字，也不猜汇率。
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
): number | null {
  if (from === to) return amount;
  const fromRate = unitsPerEur[from];
  const toRate = unitsPerEur[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

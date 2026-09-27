/**
 * StayWorth Index 采样城市面板
 *
 * 这是样本框的唯一事实来源：文档与实现的描述都必须与本文件一致。
 * 规格见 docs/DATA_SAMPLING_SPEC.md 第三节。
 *
 * 规则：
 * 1. 面板一旦生效即冻结，不随临时判断增删城市。
 * 2. 增删城市必须提高面板版本并注明生效日期（见 CITY_PANEL_VERSION）。
 * 3. 历史数据保留原面板版本标记，跨版本曲线不得直接相连。
 * 4. currencyCode 是数据源返回的当地计价币种，不是报价换算表 currencies.ts 的取值集合，
 *    两者含义不同，不要互相赋值。
 */

export const CITY_PANEL_VERSION = "v1";
export const CITY_PANEL_EFFECTIVE_DATE = "2026-09-27";

export type CityRank = "primary" | "secondary";

export type PanelCity = {
  /** StayWorth 内部标识 */
  slug: string;
  nameZh: string;
  /** 抓取时传给接口 destination 参数；实测英文城市名可用 */
  nameEn: string;
  countryCode: string;
  countryNameZh: string;
  region: "Asia" | "Europe" | "Americas" | "Middle East" | "Oceania";
  rank: CityRank;
  /** 数据源返回的当地计价币种 */
  currencyCode: string;
  /** 用于确定「T+30」当地日期 */
  timezone: string;
};

export const cityPanel: PanelCity[] = [
  // ── 一级城市（12）──────────────────────────────────────────
  { slug: "tokyo", nameZh: "东京", nameEn: "Tokyo", countryCode: "JP", countryNameZh: "日本", region: "Asia", rank: "primary", currencyCode: "JPY", timezone: "Asia/Tokyo" },
  { slug: "osaka", nameZh: "大阪", nameEn: "Osaka", countryCode: "JP", countryNameZh: "日本", region: "Asia", rank: "primary", currencyCode: "JPY", timezone: "Asia/Tokyo" },
  { slug: "seoul", nameZh: "首尔", nameEn: "Seoul", countryCode: "KR", countryNameZh: "韩国", region: "Asia", rank: "primary", currencyCode: "KRW", timezone: "Asia/Seoul" },
  { slug: "singapore", nameZh: "新加坡", nameEn: "Singapore", countryCode: "SG", countryNameZh: "新加坡", region: "Asia", rank: "primary", currencyCode: "SGD", timezone: "Asia/Singapore" },
  { slug: "bangkok", nameZh: "曼谷", nameEn: "Bangkok", countryCode: "TH", countryNameZh: "泰国", region: "Asia", rank: "primary", currencyCode: "THB", timezone: "Asia/Bangkok" },
  { slug: "hong-kong", nameZh: "香港", nameEn: "Hong Kong", countryCode: "HK", countryNameZh: "中国香港", region: "Asia", rank: "primary", currencyCode: "HKD", timezone: "Asia/Hong_Kong" },
  { slug: "shanghai", nameZh: "上海", nameEn: "Shanghai", countryCode: "CN", countryNameZh: "中国", region: "Asia", rank: "primary", currencyCode: "CNY", timezone: "Asia/Shanghai" },
  { slug: "beijing", nameZh: "北京", nameEn: "Beijing", countryCode: "CN", countryNameZh: "中国", region: "Asia", rank: "primary", currencyCode: "CNY", timezone: "Asia/Shanghai" },
  { slug: "london", nameZh: "伦敦", nameEn: "London", countryCode: "GB", countryNameZh: "英国", region: "Europe", rank: "primary", currencyCode: "GBP", timezone: "Europe/London" },
  { slug: "paris", nameZh: "巴黎", nameEn: "Paris", countryCode: "FR", countryNameZh: "法国", region: "Europe", rank: "primary", currencyCode: "EUR", timezone: "Europe/Paris" },
  { slug: "new-york", nameZh: "纽约", nameEn: "New York", countryCode: "US", countryNameZh: "美国", region: "Americas", rank: "primary", currencyCode: "USD", timezone: "America/New_York" },
  { slug: "los-angeles", nameZh: "洛杉矶", nameEn: "Los Angeles", countryCode: "US", countryNameZh: "美国", region: "Americas", rank: "primary", currencyCode: "USD", timezone: "America/Los_Angeles" },

  // ── 二级城市（18）──────────────────────────────────────────
  { slug: "kyoto", nameZh: "京都", nameEn: "Kyoto", countryCode: "JP", countryNameZh: "日本", region: "Asia", rank: "secondary", currencyCode: "JPY", timezone: "Asia/Tokyo" },
  { slug: "taipei", nameZh: "台北", nameEn: "Taipei", countryCode: "TW", countryNameZh: "中国台湾", region: "Asia", rank: "secondary", currencyCode: "TWD", timezone: "Asia/Taipei" },
  { slug: "kuala-lumpur", nameZh: "吉隆坡", nameEn: "Kuala Lumpur", countryCode: "MY", countryNameZh: "马来西亚", region: "Asia", rank: "secondary", currencyCode: "MYR", timezone: "Asia/Kuala_Lumpur" },
  { slug: "jakarta", nameZh: "雅加达", nameEn: "Jakarta", countryCode: "ID", countryNameZh: "印度尼西亚", region: "Asia", rank: "secondary", currencyCode: "IDR", timezone: "Asia/Jakarta" },
  { slug: "manila", nameZh: "马尼拉", nameEn: "Manila", countryCode: "PH", countryNameZh: "菲律宾", region: "Asia", rank: "secondary", currencyCode: "PHP", timezone: "Asia/Manila" },
  { slug: "hanoi", nameZh: "河内", nameEn: "Hanoi", countryCode: "VN", countryNameZh: "越南", region: "Asia", rank: "secondary", currencyCode: "VND", timezone: "Asia/Ho_Chi_Minh" },
  { slug: "ho-chi-minh-city", nameZh: "胡志明市", nameEn: "Ho Chi Minh City", countryCode: "VN", countryNameZh: "越南", region: "Asia", rank: "secondary", currencyCode: "VND", timezone: "Asia/Ho_Chi_Minh" },
  { slug: "mumbai", nameZh: "孟买", nameEn: "Mumbai", countryCode: "IN", countryNameZh: "印度", region: "Asia", rank: "secondary", currencyCode: "INR", timezone: "Asia/Kolkata" },
  { slug: "dubai", nameZh: "迪拜", nameEn: "Dubai", countryCode: "AE", countryNameZh: "阿联酋", region: "Middle East", rank: "secondary", currencyCode: "AED", timezone: "Asia/Dubai" },
  { slug: "sydney", nameZh: "悉尼", nameEn: "Sydney", countryCode: "AU", countryNameZh: "澳大利亚", region: "Oceania", rank: "secondary", currencyCode: "AUD", timezone: "Australia/Sydney" },
  { slug: "melbourne", nameZh: "墨尔本", nameEn: "Melbourne", countryCode: "AU", countryNameZh: "澳大利亚", region: "Oceania", rank: "secondary", currencyCode: "AUD", timezone: "Australia/Melbourne" },
  { slug: "milan", nameZh: "米兰", nameEn: "Milan", countryCode: "IT", countryNameZh: "意大利", region: "Europe", rank: "secondary", currencyCode: "EUR", timezone: "Europe/Rome" },
  { slug: "rome", nameZh: "罗马", nameEn: "Rome", countryCode: "IT", countryNameZh: "意大利", region: "Europe", rank: "secondary", currencyCode: "EUR", timezone: "Europe/Rome" },
  { slug: "frankfurt", nameZh: "法兰克福", nameEn: "Frankfurt", countryCode: "DE", countryNameZh: "德国", region: "Europe", rank: "secondary", currencyCode: "EUR", timezone: "Europe/Berlin" },
  { slug: "amsterdam", nameZh: "阿姆斯特丹", nameEn: "Amsterdam", countryCode: "NL", countryNameZh: "荷兰", region: "Europe", rank: "secondary", currencyCode: "EUR", timezone: "Europe/Amsterdam" },
  { slug: "chicago", nameZh: "芝加哥", nameEn: "Chicago", countryCode: "US", countryNameZh: "美国", region: "Americas", rank: "secondary", currencyCode: "USD", timezone: "America/Chicago" },
  { slug: "san-francisco", nameZh: "旧金山", nameEn: "San Francisco", countryCode: "US", countryNameZh: "美国", region: "Americas", rank: "secondary", currencyCode: "USD", timezone: "America/Los_Angeles" },
  { slug: "toronto", nameZh: "多伦多", nameEn: "Toronto", countryCode: "CA", countryNameZh: "加拿大", region: "Americas", rank: "secondary", currencyCode: "CAD", timezone: "America/Toronto" },
];

export const primaryCities = cityPanel.filter((city) => city.rank === "primary");
export const secondaryCities = cityPanel.filter((city) => city.rank === "secondary");

const bySlug = new Map<string, PanelCity>(
  cityPanel.map((city) => [city.slug, city]),
);

export function cityBySlug(slug: string): PanelCity | null {
  return bySlug.get(slug) ?? null;
}

/**
 * 统一货币换算的注意事项：
 * 面板涉及 JPY、KRW、SGD、THB、HKD、CNY、GBP、EUR、USD、TWD、MYR、IDR、PHP、
 * VND、INR、AED、AUD、CAD 共 18 种当地币种。
 * 现有 app/lib/currencies.ts 只覆盖其中 10 种，且在编汇率参考日期为 2026-08-21。
 * 落地统一货币视图前必须：补齐币种，并确认所选汇率来源覆盖全部面板币种
 * （AED、VND 是否在来源清单内需要核对）。
 */
export const CITY_PANEL_CURRENCIES = Array.from(
  new Set(cityPanel.map((city) => city.currencyCode)),
).sort();

/**
 * StayWorth Index 采样城市面板
 *
 * 这是样本框的唯一事实来源：文档与实现的描述都必须与本文件一致。
 * 规格见 docs/DATA_SAMPLING_SPEC.md 第三节。
 *
 * v4（2026-09-29 生效）：南美加波哥大。实测里约热内卢只有 4 家酒店（可用 2 家），
 * 达不到 8 家城市下限、对 Index 没有任何贡献；波哥大 14 家（可用 12、11 个品牌），
 * 是南美唯一能真正产出参考值的市场。里约保留在面板里（用户指定），但标注为展示用。
 *
 * v3（2026-09-28 生效）：在 v2 基础上补两个市场——东亚加上海（国内品牌覆盖最全的市场），
 * 南美加里约热内卢（补上此前完全缺失的南美）。BRL 已在汇率来源覆盖范围内。
 * 本次只加城市、不再删减；单日请求量预计从约 25 次升到约 30 次，仍在 100 次预算内。
 *
 * v2 的取舍（2026-09-27）：
 * Index 只需要给用户一个「当前参考值」，不需要穷举城市。因此每个国家/地区只保留
 * 一个有代表性的城市，并且优先选**品牌覆盖够全**且**抓取成本适中**的：
 * - 可用样本少于 8 家会被城市样本下限整城剔除（悉尼 6 家、马尼拉 6 家、河内 3 家都被淘汰）；
 * - 返回超过 80 家需要翻 3 页，上游超时风险明显更高（洛杉矶、芝加哥实测出现过 HTTP 500）。
 * 每个城市的实测数据见规格附录 E。
 *
 * 规则：
 * 1. 面板一旦生效即冻结，不随临时判断增删城市。
 * 2. 增删城市必须提高面板版本并注明生效日期（见 CITY_PANEL_VERSION）。
 * 3. 历史数据保留原面板版本标记，跨版本曲线不得直接相连。
 * 4. currencyCode 是数据源返回的当地计价币种，不是报价换算表 currencies.ts 的取值集合，
 *    两者含义不同，不要互相赋值。
 */

export const CITY_PANEL_VERSION = "v4";
export const CITY_PANEL_EFFECTIVE_DATE = "2026-09-29";

export type PanelCity = {
  /** StayWorth 内部标识 */
  slug: string;
  nameZh: string;
  /** 抓取时传给接口 destination 参数；实测英文城市名可用 */
  nameEn: string;
  countryCode: string;
  countryNameZh: string;
  region: "Asia" | "Europe" | "Americas" | "Middle East" | "Oceania";
  /** 更细的分区，用于说明为什么选它 */
  area: string;
  /** 数据源返回的当地计价币种 */
  currencyCode: string;
  /** 用于确定「T+30」当地日期 */
  timezone: string;
  /**
   * 实测可用样本不足以进入聚合、仅作市场展示的城市。
   * 保留是为了让用户看得到该市场，但页面上不得给它任何参考值。
   */
  displayOnly?: boolean;
};

export const cityPanel: PanelCity[] = [
  // ── 东亚 ────────────────────────────────────────────────────
  { slug: "tokyo", nameZh: "东京", nameEn: "Tokyo", countryCode: "JP", countryNameZh: "日本", region: "Asia", area: "东亚", currencyCode: "JPY", timezone: "Asia/Tokyo" },
  { slug: "seoul", nameZh: "首尔", nameEn: "Seoul", countryCode: "KR", countryNameZh: "韩国", region: "Asia", area: "东亚", currencyCode: "KRW", timezone: "Asia/Seoul" },
  { slug: "beijing", nameZh: "北京", nameEn: "Beijing", countryCode: "CN", countryNameZh: "中国", region: "Asia", area: "东亚", currencyCode: "CNY", timezone: "Asia/Shanghai" },
  { slug: "shanghai", nameZh: "上海", nameEn: "Shanghai", countryCode: "CN", countryNameZh: "中国", region: "Asia", area: "东亚", currencyCode: "CNY", timezone: "Asia/Shanghai" },
  { slug: "hong-kong", nameZh: "香港", nameEn: "Hong Kong", countryCode: "HK", countryNameZh: "中国香港", region: "Asia", area: "东亚", currencyCode: "HKD", timezone: "Asia/Hong_Kong" },
  { slug: "taipei", nameZh: "台北", nameEn: "Taipei", countryCode: "TW", countryNameZh: "中国台湾", region: "Asia", area: "东亚", currencyCode: "TWD", timezone: "Asia/Taipei" },

  // ── 东南亚与南亚 ────────────────────────────────────────────
  { slug: "singapore", nameZh: "新加坡", nameEn: "Singapore", countryCode: "SG", countryNameZh: "新加坡", region: "Asia", area: "东南亚", currencyCode: "SGD", timezone: "Asia/Singapore" },
  { slug: "bangkok", nameZh: "曼谷", nameEn: "Bangkok", countryCode: "TH", countryNameZh: "泰国", region: "Asia", area: "东南亚", currencyCode: "THB", timezone: "Asia/Bangkok" },
  { slug: "mumbai", nameZh: "孟买", nameEn: "Mumbai", countryCode: "IN", countryNameZh: "印度", region: "Asia", area: "南亚", currencyCode: "INR", timezone: "Asia/Kolkata" },

  // ── 大洋洲 ──────────────────────────────────────────────────
  { slug: "melbourne", nameZh: "墨尔本", nameEn: "Melbourne", countryCode: "AU", countryNameZh: "澳大利亚", region: "Oceania", area: "大洋洲", currencyCode: "AUD", timezone: "Australia/Melbourne" },

  // ── 欧洲 ────────────────────────────────────────────────────
  { slug: "london", nameZh: "伦敦", nameEn: "London", countryCode: "GB", countryNameZh: "英国", region: "Europe", area: "西欧", currencyCode: "GBP", timezone: "Europe/London" },
  { slug: "paris", nameZh: "巴黎", nameEn: "Paris", countryCode: "FR", countryNameZh: "法国", region: "Europe", area: "西欧", currencyCode: "EUR", timezone: "Europe/Paris" },
  { slug: "frankfurt", nameZh: "法兰克福", nameEn: "Frankfurt", countryCode: "DE", countryNameZh: "德国", region: "Europe", area: "中欧", currencyCode: "EUR", timezone: "Europe/Berlin" },

  // ── 中东 ────────────────────────────────────────────────────
  { slug: "dubai", nameZh: "迪拜", nameEn: "Dubai", countryCode: "AE", countryNameZh: "阿联酋", region: "Middle East", area: "中东", currencyCode: "AED", timezone: "Asia/Dubai" },

  // ── 北美（美国按东部 / 中部 / 西部各取一个代表城市）─────────
  { slug: "washington", nameZh: "华盛顿", nameEn: "Washington", countryCode: "US", countryNameZh: "美国", region: "Americas", area: "美国东部", currencyCode: "USD", timezone: "America/New_York" },
  { slug: "minneapolis", nameZh: "明尼阿波利斯", nameEn: "Minneapolis", countryCode: "US", countryNameZh: "美国", region: "Americas", area: "美国中部", currencyCode: "USD", timezone: "America/Chicago" },
  { slug: "seattle", nameZh: "西雅图", nameEn: "Seattle", countryCode: "US", countryNameZh: "美国", region: "Americas", area: "美国西部", currencyCode: "USD", timezone: "America/Los_Angeles" },
  { slug: "toronto", nameZh: "多伦多", nameEn: "Toronto", countryCode: "CA", countryNameZh: "加拿大", region: "Americas", area: "加拿大", currencyCode: "CAD", timezone: "America/Toronto" },
  { slug: "rio-de-janeiro", nameZh: "里约热内卢", nameEn: "Rio de Janeiro", countryCode: "BR", countryNameZh: "巴西", region: "Americas", area: "南美", currencyCode: "BRL", timezone: "America/Sao_Paulo", displayOnly: true },
  { slug: "bogota", nameZh: "波哥大", nameEn: "Bogota", countryCode: "CO", countryNameZh: "哥伦比亚", region: "Americas", area: "南美", currencyCode: "COP", timezone: "America/Bogota" },
];

export const cityBySlug = (slug: string): PanelCity | null =>
  cityPanel.find((city) => city.slug === slug) ?? null;

/**
 * 仅作展示、不得产出参考值的城市（实测可用样本远低于 8 家下限）。
 * 聚合前会把这些城市的样本剔除，避免它们悄悄影响任何一层数字。
 */
export const displayOnlyCitySlugs = cityPanel
  .filter((city) => city.displayOnly === true)
  .map((city) => city.slug);

/**
 * 统一货币换算的注意事项：
 * 面板涉及 JPY、KRW、CNY、HKD、TWD、SGD、THB、INR、AUD、GBP、EUR、AED、USD、CAD、BRL
 * 共 15 种当地币种。现有汇率来源（欧洲央行）覆盖其中 12 种，
 * **TWD、AED 以及其它未覆盖币种不会参与统一货币视图**——这是刻意选择，不猜汇率。
 * 详见 app/data/index-fx.ts 与规格第八节。
 */
export const CITY_PANEL_CURRENCIES = Array.from(
  new Set(cityPanel.map((city) => city.currencyCode)),
).sort();

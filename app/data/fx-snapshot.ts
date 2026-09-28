/**
 * 由 scraper/fx-rates.ts 自动生成，请勿手改。
 * 每次抓取汇率时重写；来源与日期见下方字段。
 */

export const FX_SNAPSHOT = {
  base: "CNY",
  referenceDate: "2026-09-28",
  sourceName: "open.er-api.com（ExchangeRate-API 开放端点）",
  sourceUrl: "https://open.er-api.com/v6/latest/CNY",
  fetchedAt: "2026-09-28T05:47:16.840Z",
  /** 1 基准币 = rates[X] 个 X */
  rates: {
  AED: 0.546545,
  AUD: 0.21233,
  BRL: 0.769408,
  CAD: 0.210588,
  CNY: 1,
  COP: 496.210616,
  EUR: 0.130816,
  GBP: 0.112528,
  HKD: 1.167613,
  INR: 14.265132,
  JPY: 23.456869,
  KRW: 203.086921,
  SGD: 0.190259,
  THB: 4.963391,
  TWD: 4.739336,
  USD: 0.148821,
  },
} as const;

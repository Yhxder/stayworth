/**
 * 由 scraper/fx-rates.ts 自动生成，请勿手改。
 * 每次抓取汇率时重写；来源与日期见下方字段。
 */

export const FX_SNAPSHOT = {
  base: "CNY",
  referenceDate: "2026-09-29",
  sourceName: "open.er-api.com（ExchangeRate-API 开放端点）",
  sourceUrl: "https://open.er-api.com/v6/latest/CNY",
  fetchedAt: "2026-09-29T04:13:18.672Z",
  /** 1 基准币 = rates[X] 个 X */
  rates: {
  AED: 0.546375,
  AUD: 0.212328,
  BRL: 0.771843,
  CAD: 0.210765,
  CNY: 1,
  COP: 491.086274,
  EUR: 0.130904,
  GBP: 0.112344,
  HKD: 1.16707,
  INR: 14.258623,
  JPY: 23.420554,
  KRW: 201.816347,
  SGD: 0.190044,
  THB: 4.984519,
  TWD: 4.730369,
  USD: 0.148775,
  },
} as const;

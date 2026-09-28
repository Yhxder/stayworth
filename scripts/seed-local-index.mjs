// 给本地 D1 灌一小份 StayWorth Index 种子数据。
//
// 为什么需要：Index 页面现在运行时读 /api/index（走 D1）。
// 本地与 CI 的库只有表结构没有数据，页面会一直停在「暂无采样结果」，
// 浏览器测试也就没法验证表格渲染。这里灌一份**确定性的小样本**，
// 只用于本地与 CI，不进生产库。
//
// 用法：node scripts/seed-local-index.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DATABASE = "stayworth-mvp";
const RUN_KEY = "seed-local-2026-09-28";
const CAPTURED_AT = "2026-09-28T00:00:00.000Z";
const FETCHED_AT = "2026-09-28T00:00:00.000Z";

// 每个城市 10 家，保证越过 8 家城市下限；香港额外放 2 家无层级样本，
// 用来验证「单独列出」这一行。
const cities = [
  { slug: "hong-kong", currency: "HKD", checkIn: "2026-10-28", checkOut: "2026-10-29" },
  { slug: "shanghai", currency: "CNY", checkIn: "2026-10-28", checkOut: "2026-10-29" },
  // 第三个国家让「主要国家」视图不止一行
  { slug: "tokyo", currency: "JPY", checkIn: "2026-10-28", checkOut: "2026-10-29" },
];

const tiers = ["Luxury", "Premium", "Select", "Longer Stays", "Collections"];
const brandsByTier = {
  Luxury: ["RZ", "JW"],
  Premium: ["MC", "SI", "WI"],
  Select: ["CY", "FP", "AL"],
  "Longer Stays": ["RI", "TS"],
  Collections: ["AK", "TX"],
};

const samples = [];
for (const city of cities) {
  tiers.forEach((tier, tierIndex) => {
    for (let i = 0; i < 2; i += 1) {
      const brandCode = brandsByTier[tier][i % brandsByTier[tier].length];
      const points = 20000 + tierIndex * 5000 + i * 1000;
      // 让每万分价值落在 300–600 之间，便于人工核对
      const value = 350 + tierIndex * 60 + i * 20;
      const totalMinor = Math.round((value * points) / 10000 * 100);
      samples.push({
        citySlug: city.slug,
        checkIn: city.checkIn,
        checkOut: city.checkOut,
        currency: city.currency,
        hotelCode: `${city.slug.slice(0, 3).toUpperCase()}${tierIndex}${i}`,
        hotelName: `${city.slug} 样例酒店 ${tierIndex}-${i}`,
        brandCode,
        brandSlug: null,
        tier,
        points,
        totalMinor,
        decimalPoint: 2,
        value,
      });
    }
  });
  // 无层级样本（Series by Marriott）
  for (let i = 0; i < 2; i += 1) {
    const points = 30000;
    const value = 400;
    samples.push({
      citySlug: city.slug,
      checkIn: city.checkIn,
      checkOut: city.checkOut,
      currency: city.currency,
      hotelCode: `${city.slug.slice(0, 3).toUpperCase()}SE${i}`,
      hotelName: `${city.slug} 样例酒店 SE-${i}`,
      brandCode: "SE",
      brandSlug: "series-by-marriott",
      tier: null,
      points,
      totalMinor: Math.round((value * points) / 10000 * 100),
      decimalPoint: 2,
      value,
    });
  }
}

const fx = [
  ["CNY", 1],
  ["HKD", 1.167613],
  ["USD", 0.148821],
  ["JPY", 23.456869],
];

const text = (value) =>
  value === null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

const statements = [
  `DELETE FROM index_samples WHERE run_id IN (SELECT id FROM index_runs WHERE run_key = ${text(RUN_KEY)});`,
  `DELETE FROM index_runs WHERE run_key = ${text(RUN_KEY)};`,
  `INSERT INTO index_runs
     (run_key, started_at, finished_at, panel_version, days_ahead, nights, status,
      cities_ok, cities_failed, samples_kept, samples_dropped, requests_sent)
   VALUES (${text(RUN_KEY)}, ${text(CAPTURED_AT)}, ${text(CAPTURED_AT)}, 'v4', 30, 1, 'ok',
           ${cities.length}, 0, ${samples.length}, 0, 0);`,
];

// 样本按 run_key 反查 id，避免依赖自增序号
for (let i = 0; i < samples.length; i += 20) {
  const chunk = samples
    .slice(i, i + 20)
    .map(
      (s) =>
        `((SELECT id FROM index_runs WHERE run_key = ${text(RUN_KEY)}), ` +
        `${text(CAPTURED_AT)}, ${text(s.citySlug)}, ${text(s.checkIn)}, ${text(s.checkOut)}, ` +
        `${text(s.hotelCode)}, ${text(s.hotelName)}, ${text(s.brandCode)}, ${text(s.brandSlug)}, ` +
        `${text(s.tier)}, ${text(s.currency)}, ${s.totalMinor}, ${s.decimalPoint}, ` +
        `${s.totalMinor}, ${s.decimalPoint}, 0, 0, ${s.points}, 0, ${s.value})`,
    )
    .join(",\n  ");
  statements.push(
    `INSERT INTO index_samples (
       run_id, captured_at, city_slug, check_in, check_out,
       hotel_code, hotel_name, brand_code, brand_slug, portfolio_tier,
       currency_code, cash_total_minor, cash_total_decimal_point,
       cash_amount_minor, cash_amount_decimal_point, fees_minor, taxes_minor,
       points, members_only, value_per_10k
     ) VALUES\n  ${chunk};`,
  );
}

statements.push(
  `INSERT OR REPLACE INTO fx_rates
     (base, currency_code, rate, source_name, source_url, provider_updated_at, fetched_at)
   VALUES ${fx
     .map(
       ([code, rate]) =>
         `('CNY', ${text(code)}, ${rate}, ${text("open.er-api.com（ExchangeRate-API 开放端点）")}, ` +
         `${text("https://open.er-api.com/v6/latest/CNY")}, ${text("Mon, 28 Sep 2026 00:02:31 +0000")}, ${text(FETCHED_AT)})`,
     )
     .join(",\n          ")};`,
);

const dir = mkdtempSync(join(tmpdir(), "stayworth-seed-"));
const file = join(dir, "seed.sql");
writeFileSync(file, `${statements.join("\n")}\n`, "utf8");

execFileSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    DATABASE,
    "--local",
    "--config",
    "wrangler.local.jsonc",
    "--file",
    file,
  ],
  {
    stdio: "pipe",
    encoding: "utf8",
    env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
  },
);

console.log(
  `本地种子完成：1 个批次、${samples.length} 条样本、${fx.length} 条汇率（${cities.map((c) => c.slug).join(" / ")}）`,
);

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  handleHotelSearchRequest,
  queryHotelSnapshots,
} from "../worker/hotels-api.ts";
import { handleHotelImageRequest } from "../worker/media-proxy.ts";

const requiredFiles = [
  "db/schema.ts",
  "drizzle.config.ts",
  "worker/hotels-api.ts",
];

function createFakeDatabase(rows = [], error = null, coverageRows = []) {
  const calls = [];

  return {
    calls,
    prepare(sql) {
      const call = { sql, values: [] };
      calls.push(call);

      return {
        bind(...values) {
          call.values = values;
          return this;
        },
        async all() {
          if (error) throw error;
          // 搜索会先问每日采样表；这里让它返回空，走回手工快照分支，
          // 与「每日采样没覆盖时退回快照」的生产行为一致。
          if (/FROM index_samples/.test(call.sql)) {
            return { results: [], success: true };
          }
          const isCoverageQuery = /AS "checkIn"/.test(call.sql);
          return {
            results: isCoverageQuery ? coverageRows : rows,
            success: true,
          };
        },
      };
    },
  };
}

const databaseRow = {
  id: "cyberport",
  nameZh: "香港数码港艾美酒店",
  nameEn: "Le Méridien Hong Kong, Cyberport",
  brandId: "le-meridien",
  brand: "Le Méridien",
  tier: "Premium",
  city: "香港",
  district: "香港岛 · 数码港",
  cashPriceMinor: 123500,
  pointsRequired: 37000,
  currency: "CNY",
  sourceLabel: "用户提供的价格样例（日期为原型）",
  sourceUrl: null,
  updatedAt: "2026-07-25T20:35:00+08:00",
};

test("defines the finite D1 schema and DB binding", () => {
  for (const file of requiredFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }

  const schema = readFileSync("db/schema.ts", "utf8");
  assert.match(schema, /sqliteTable\(\s*["']cities["']/);
  assert.match(schema, /sqliteTable\(\s*["']hotels["']/);
  assert.match(schema, /sqliteTable\(\s*["']price_snapshots["']/);
  assert.match(schema, /cash_price_minor/);
  assert.match(schema, /source_name/);
  assert.match(schema, /source_url/);
  assert.match(schema, /updated_at/);

  const hosting = JSON.parse(readFileSync(".openai/hosting.json", "utf8"));
  assert.equal(hosting.d1, "DB");

  const worker = readFileSync("worker/index.ts", "utf8");
  assert.match(worker, /url\.pathname === ["']\/api\/hotels["']/);
  assert.match(worker, /handleHotelSearchRequest\(request, env\.DB\)/);
});

test("queries exact city and dates with prepared-statement bindings", async () => {
  const database = createFakeDatabase([databaseRow]);
  const hotels = await queryHotelSnapshots(database, {
    city: "Hong Kong",
    checkIn: "2026-08-15",
    checkOut: "2026-08-16",
    tier: "Premium",
  });

  assert.equal(database.calls.length, 1);
  assert.match(database.calls[0].sql, /price_snapshots/);
  assert.match(database.calls[0].sql, /check_in = \?/);
  assert.match(database.calls[0].sql, /check_out = \?/);
  assert.deepEqual(database.calls[0].values, [
    "hong kong",
    "2026-08-15",
    "2026-08-16",
    "Premium",
  ]);
  assert.deepEqual(hotels[0], {
    ...databaseRow,
    cashPrice: 1235,
    currency: "CNY",
    imagePath: null,
  });
});

test("routes catalog banners through the site proxy instead of shipping CDN urls", async () => {
  const bannerUrl =
    "https://cache.marriott.com/content/dam/marriott-renditions/MD/md-main-002-hor-feat.jpg";
  const database = createFakeDatabase([
    {
      ...databaseRow,
      bannerWideUrl: bannerUrl,
      bannerClassicUrl: null,
    },
  ]);
  const hotels = await queryHotelSnapshots(database, {
    city: "Hong Kong",
    checkIn: "2026-08-15",
    checkOut: "2026-08-16",
  });

  assert.equal(hotels[0].imagePath, `/media/hotel?src=${encodeURIComponent(bannerUrl)}`);
  // 第三方地址留在服务端，前端只拿到代理路径
  assert.equal(hotels[0].bannerWideUrl, undefined);
});

test("media proxy refuses hosts outside the allowlist", async () => {
  const blocked = await handleHotelImageRequest(
    new Request(
      "https://stayworth.test/media/hotel?src=https%3A%2F%2Fexample.com%2Fa.jpg",
    ),
  );
  const missing = await handleHotelImageRequest(
    new Request("https://stayworth.test/media/hotel"),
  );
  const insecure = await handleHotelImageRequest(
    new Request(
      "https://stayworth.test/media/hotel?src=http%3A%2F%2Fcache.marriott.com%2Fa.jpg",
    ),
  );

  assert.equal(blocked.status, 403);
  assert.equal(missing.status, 400);
  assert.equal(insecure.status, 403);
});

test("returns an explicit empty response for an uncovered date", async () => {
  const response = await handleHotelSearchRequest(
    new Request(
      "https://stayworth.test/api/hotels?city=Shanghai&checkIn=2026-09-01&checkOut=2026-09-02",
    ),
    createFakeDatabase([]),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "empty");
  assert.equal(body.message, "暂无数据");
  assert.deepEqual(body.hotels, []);
  assert.equal(body.coverage, null);
});

test("points an uncovered date at the covered stay window", async () => {
  const response = await handleHotelSearchRequest(
    new Request(
      "https://stayworth.test/api/hotels?city=香港&checkIn=2099-01-01&checkOut=2099-01-02",
    ),
    createFakeDatabase([], null, [
      { checkIn: "2026-08-15", checkOut: "2026-08-16" },
    ]),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "empty");
  assert.deepEqual(body.coverage, {
    checkIn: "2026-08-15",
    checkOut: "2026-08-16",
  });
});

test("rejects missing or invalid date parameters", async () => {
  const missing = await handleHotelSearchRequest(
    new Request("https://stayworth.test/api/hotels?city=香港"),
    createFakeDatabase(),
  );
  const reversed = await handleHotelSearchRequest(
    new Request(
      "https://stayworth.test/api/hotels?city=香港&checkIn=2026-08-16&checkOut=2026-08-15",
    ),
    createFakeDatabase(),
  );

  assert.equal(missing.status, 400);
  assert.equal(reversed.status, 400);
  assert.equal((await missing.json()).status, "error");
});

test("rejects an unsupported portfolio tier", async () => {
  const response = await handleHotelSearchRequest(
    new Request(
      "https://stayworth.test/api/hotels?city=香港&checkIn=2026-08-15&checkOut=2026-08-16&tier=Category%208",
    ),
    createFakeDatabase(),
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /品牌层级无效/);
});

test("returns sourced snapshots and hides database failure details", async () => {
  const found = await handleHotelSearchRequest(
    new Request(
      "https://stayworth.test/api/hotels?city=香港&checkIn=2026-08-15&checkOut=2026-08-16",
    ),
    createFakeDatabase([databaseRow]),
  );
  const foundBody = await found.json();

  assert.equal(found.status, 200);
  assert.equal(foundBody.status, "ok");
  assert.equal(foundBody.hotels[0].sourceLabel, databaseRow.sourceLabel);
  assert.equal(foundBody.hotels[0].currency, "CNY");
  assert.equal(foundBody.hotels[0].updatedAt, databaseRow.updatedAt);

  const originalConsoleError = console.error;
  console.error = () => {};
  const failed = await handleHotelSearchRequest(
    new Request(
      "https://stayworth.test/api/hotels?city=香港&checkIn=2026-08-15&checkOut=2026-08-16",
    ),
    createFakeDatabase([], new Error("secret database detail")),
  ).finally(() => {
    console.error = originalConsoleError;
  });
  const failedBody = await failed.json();

  assert.equal(failed.status, 500);
  assert.equal(failedBody.status, "error");
  assert.doesNotMatch(JSON.stringify(failedBody), /secret database detail/);
});

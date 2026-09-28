import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHotelSearchUrl,
  fetchHotelSnapshots,
} from "../app/lib/hotel-api.ts";
import { createRebatePrefill } from "../app/lib/rebate-prefill.ts";

const filters = {
  city: "香港",
  checkIn: "2026-08-15",
  checkOut: "2026-08-16",
  tier: "Premium",
};

const hotel = {
  id: "cyberport",
  nameZh: "香港数码港艾美酒店",
  nameEn: "Le Méridien Hong Kong, Cyberport",
  brandId: "le-meridien",
  brand: "Le Méridien",
  tier: "Premium",
  city: "香港",
  citySlug: "hong-kong",
  countryCode: "HK",
  district: "香港岛 · 数码港",
  cashPrice: 1235,
  pointsRequired: 37000,
  currency: "CNY",
  sourceLabel: "用户提供的价格样例（日期为原型）",
  sourceUrl: null,
  updatedAt: "2026-07-25T20:35:00+08:00",
};

test("builds the finite hotel API query and omits the all-tier label", () => {
  assert.equal(
    buildHotelSearchUrl(filters),
    "/api/hotels?city=%E9%A6%99%E6%B8%AF&checkIn=2026-08-15&checkOut=2026-08-16&tier=Premium",
  );
  assert.equal(
    buildHotelSearchUrl({ ...filters, tier: "全部等级" }),
    "/api/hotels?city=%E9%A6%99%E6%B8%AF&checkIn=2026-08-15&checkOut=2026-08-16",
  );
});

test("returns validated hotel snapshots from the Worker response", async () => {
  const payload = await fetchHotelSnapshots(filters, {
    fetcher: async () =>
      Response.json({
        status: "ok",
        query: { ...filters },
        hotels: [hotel],
      }),
  });

  assert.equal(payload.status, "ok");
  assert.deepEqual(payload.hotels, [hotel]);
});

test("keeps explicit empty responses and surfaces API failures", async () => {
  const empty = await fetchHotelSnapshots(filters, {
    fetcher: async () =>
      Response.json({ status: "empty", message: "暂无数据", hotels: [] }),
  });

  assert.deepEqual(empty, {
    status: "empty",
    message: "暂无数据",
    hotels: [],
    coverage: null,
  });

  const emptyWithCoverage = await fetchHotelSnapshots(filters, {
    fetcher: async () =>
      Response.json({
        status: "empty",
        message: "暂无数据",
        hotels: [],
        coverage: { checkIn: "2026-08-15", checkOut: "2026-08-16" },
      }),
  });

  assert.deepEqual(emptyWithCoverage.coverage, {
    checkIn: "2026-08-15",
    checkOut: "2026-08-16",
  });

  await assert.rejects(
    fetchHotelSnapshots(filters, {
      fetcher: async () =>
        Response.json({
          status: "empty",
          message: "暂无数据",
          hotels: [],
          coverage: { checkIn: 20260815 },
        }),
    }),
    /酒店数据格式无效/,
  );

  await assert.rejects(
    fetchHotelSnapshots(filters, {
      fetcher: async () =>
        Response.json(
          { status: "error", message: "数据暂时无法读取，请稍后重试。" },
          { status: 500 },
        ),
    }),
    /数据暂时无法读取/,
  );
});

test("rejects malformed snapshots before they reach the comparison UI", async () => {
  await assert.rejects(
    fetchHotelSnapshots(filters, {
      fetcher: async () =>
        Response.json({
          status: "ok",
          hotels: [{ ...hotel, currency: "INVALID" }],
        }),
    }),
    /酒店数据格式无效/,
  );
});

test("creates a calculator prefill without guessing ineligible spend", () => {
  assert.deepEqual(
    createRebatePrefill(hotel, "2026-08-15", "2026-08-18", 7),
    {
      revision: 7,
      hotelName: "香港数码港艾美酒店",
      cashPrice: 1235,
      currency: "CNY",
      nights: 3,
      brandId: "le-meridien",
      // 带上城市与国家，回血计算器才能查到 StayWorth Index 的市场参考值
      citySlug: "hong-kong",
      countryCode: "HK",
    },
  );
});

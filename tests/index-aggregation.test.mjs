import assert from "node:assert/strict";
import test from "node:test";

import { convertCurrency, hasRate } from "../app/data/index-fx.ts";
import {
  MIN_CITY_SAMPLES,
  SEPARATE_TIER_LABEL,
  cityMedians,
  countryView,
  globalView,
  tierView,
} from "../app/lib/index-aggregation.ts";

const noConversion = (amount, from, to) => (from === to ? amount : null);

function sample({
  city,
  value,
  currency = "CNY",
  tier = "Select",
  brandCode = "CY",
  brandSlug = "courtyard",
  hotelCode = null,
}) {
  return {
    citySlug: city,
    checkIn: "2026-10-28",
    checkOut: "2026-10-29",
    capturedAt: "2026-09-27T06:30:00.000Z",
    hotelCode: hotelCode ?? `${city}-${value}-${Math.round(value)}`,
    hotelName: "样例酒店",
    brandCode,
    brandSlug,
    portfolioTier: tier,
    currencyCode: currency,
    cash: {
      amountMinor: 0,
      amountDecimalPoint: 2,
      totalMinor: 0,
      totalDecimalPoint: 2,
      feesMinor: 0,
      feesDecimalPoint: 2,
      taxesMinor: 0,
      taxesDecimalPoint: 2,
    },
    points: 10000,
    membersOnly: false,
    valuePerTenThousand: value,
  };
}

function repeat(count, factory) {
  return Array.from({ length: count }, (_, index) => factory(index));
}

test("drops whole cities that fall below the minimum sample size", () => {
  const samples = [
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "shanghai", value: 300, hotelCode: `sha-${i}` })),
    ...repeat(MIN_CITY_SAMPLES - 1, (i) => sample({ city: "hanoi", value: 900, hotelCode: `han-${i}` })),
  ];
  const { buckets, skippedCities } = cityMedians(samples, "CNY", noConversion, (s) => s.citySlug);
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].citySlug, "shanghai");
  assert.equal(skippedCities, 1);
});

test("aggregates in two steps so a single large city cannot dominate", () => {
  // 上海 100 家、每家 100；东京 8 家、每家 1000。
  // 直接对所有酒店求平均约为 166，两步聚合应为 (100 + 1000) / 2 = 550。
  const samples = [
    ...repeat(100, (i) => sample({ city: "shanghai", value: 100, hotelCode: `sha-${i}` })),
    ...repeat(8, (i) => sample({ city: "tokyo", value: 1000, hotelCode: `tyo-${i}` })),
  ];
  const view = globalView(samples, "CNY", noConversion);
  assert.equal(view.rows[0].value, 550);
  assert.equal(view.rows[0].cityCount, 2);
  assert.equal(view.rows[0].sampleCount, 108);
});

test("excludes samples whose currency has no rate and reports them", () => {
  const samples = [
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "shanghai", value: 300, currency: "CNY", hotelCode: `sha-${i}` })),
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "taipei", value: 1800, currency: "TWD", hotelCode: `tpe-${i}` })),
  ];
  const view = globalView(samples, "CNY", noConversion);
  assert.equal(view.rows[0].cityCount, 1);
  assert.equal(view.rows[0].sampleCount, MIN_CITY_SAMPLES);
  assert.deepEqual(view.exclusions, [{ currencyCode: "TWD", sampleCount: MIN_CITY_SAMPLES }]);
});

test("converts into the requested currency when a rate exists", () => {
  const samples = [
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "shanghai", value: 700, currency: "CNY", hotelCode: `sha-${i}` })),
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "tokyo", value: 1000, currency: "JPY", hotelCode: `tyo-${i}` })),
  ];
  const view = globalView(samples, "CNY", convertCurrency);
  const tokyoInCny = convertCurrency(1000, "JPY", "CNY");
  assert.ok(tokyoInCny !== null);
  assert.equal(view.exclusions.length, 0);
  assert.ok(
    Math.abs((view.rows[0].value ?? 0) - (700 + tokyoInCny) / 2) < 0.001,
  );
});

test("renders five tiers plus a separate row that only holds untiered brands", () => {
  const samples = [
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "shanghai", value: 500, tier: "Luxury", brandCode: "JW", brandSlug: "jw-marriott", hotelCode: `lux-${i}` })),
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "shanghai", value: 300, tier: "Select", hotelCode: `sel-${i}` })),
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({
      city: "shanghai",
      value: 200,
      tier: null,
      brandCode: "SE",
      brandSlug: "series-by-marriott",
      hotelCode: `sep-${i}`,
    })),
  ];
  const view = tierView(samples, "CNY", noConversion);
  assert.equal(view.rows.length, 6);
  assert.deepEqual(
    view.rows.map((row) => row.label),
    ["Luxury", "Premium", "Select", "Longer Stays", "Collections", SEPARATE_TIER_LABEL],
  );

  const luxury = view.rows.find((row) => row.key === "Luxury");
  const select = view.rows.find((row) => row.key === "Select");
  const separate = view.rows.find((row) => row.key === "separate");
  assert.equal(luxury.value, 500);
  assert.equal(select.value, 300);
  assert.equal(separate.value, 200);

  const premium = view.rows.find((row) => row.key === "Premium");
  assert.equal(premium.value, null);
  assert.equal(premium.sampleCount, 0);
});

test("keeps the country view in each country's own currency", () => {
  const samples = [
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "shanghai", value: 300, currency: "CNY", hotelCode: `sha-${i}` })),
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "beijing", value: 320, currency: "CNY", hotelCode: `pek-${i}` })),
    ...repeat(MIN_CITY_SAMPLES, (i) => sample({ city: "tokyo", value: 8000, currency: "JPY", hotelCode: `tyo-${i}` })),
  ];

  const view = countryView(samples, (s) => {
    if (s.citySlug === "tokyo") return { code: "JP", label: "日本" };
    return { code: "CN", label: "中国" };
  });

  const china = view.rows.find((row) => row.key === "CN");
  const japan = view.rows.find((row) => row.key === "JP");
  assert.equal(china.currencyCode, "CNY");
  assert.equal(china.value, 310);
  assert.equal(china.cityCount, 2);
  assert.equal(japan.currencyCode, "JPY");
  assert.equal(japan.value, 8000);
  assert.equal(view.currencyCode, null);
});

test("admits which currencies cannot be converted yet", () => {
  assert.equal(hasRate("CNY"), true);
  assert.equal(hasRate("TWD"), false);
  assert.equal(convertCurrency(100, "TWD", "CNY"), null);
  assert.equal(convertCurrency(100, "CNY", "CNY"), 100);
});

test("lets a thin tier contribute once its city qualifies overall", () => {
  // 面板收敛成「一个国家一个代表城市」后，单城高端酒店本来就少。
  // 城市只要合计达到下限，它在某个档位上的少量样本仍应参与，否则整个 Luxury 会消失。
  const samples = [
    ...repeat(8, (i) => sample({ city: "washington", value: 400, tier: "Select", hotelCode: `dc-sel-${i}` })),
    ...repeat(2, (i) => sample({ city: "washington", value: 900, tier: "Luxury", brandCode: "RZ", brandSlug: "ritz-carlton", hotelCode: `dc-lux-${i}` })),
    // 这个城市合计只有 3 家，达不到城市下限，任何档位都不该出现。
    ...repeat(3, (i) => sample({ city: "thin-city", value: 5000, tier: "Luxury", brandCode: "RZ", brandSlug: "ritz-carlton", hotelCode: `thin-${i}` })),
  ];

  const view = tierView(samples, "CNY", noConversion);
  const luxury = view.rows.find((row) => row.key === "Luxury");
  const select = view.rows.find((row) => row.key === "Select");

  assert.equal(luxury.value, 900);
  assert.equal(luxury.cityCount, 1);
  assert.equal(luxury.sampleCount, 2);
  assert.equal(select.value, 400);
  // 不合格城市不得出现在任何档位里
  assert.equal(view.sampleCount, 10);
  assert.equal(view.cityCount, 1);
});

test("never mixes currencies inside one country row", () => {
  const samples = [
    ...repeat(9, (i) => sample({ city: "toronto", value: 90, currency: "CAD", hotelCode: `tor-cad-${i}` })),
    ...repeat(3, (i) => sample({ city: "toronto", value: 60, currency: "USD", hotelCode: `tor-usd-${i}` })),
  ];

  const view = countryView(samples, () => ({ code: "CA", label: "加拿大" }));
  const canada = view.rows.find((row) => row.key === "CA");
  assert.equal(canada.currencyCode, "CAD");
  assert.equal(canada.value, 90);
  assert.equal(canada.sampleCount, 9);
});

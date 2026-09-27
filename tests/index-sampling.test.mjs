import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanCitySamples,
  futureWindow,
  median,
  parseSearchResponse,
  quantile,
  summarize,
  toMajorUnits,
  valuePerTenThousand,
} from "../app/lib/index-sampling.ts";

/**
 * 真实响应结构样例。
 * 结构与字段取自 2026-09-27 万豪中国站实际响应（上海明天广场 JW 万豪，
 * 税前 ¥1138.00 / 服务费 ¥188.91 / 含税含费 ¥1326.91 / 33000 分）。
 */
function monetary(amount, decimalPoint = 2, currency = "CNY") {
  return { __typename: "MonetaryAmount", amount, currency, decimalPoint };
}

function cashRate({ total, amount, fees, taxes = 0, membersOnly = false, code = "StandardRates", value = null }) {
  return {
    __typename: "SearchLowestAvailableRate",
    lengthOfStay: 1,
    membersOnly,
    rateCategory: { __typename: "SearchRateCategory", code, value },
    rateModes: {
      __typename: "SearchLowestAvailableRatesRateModesCash",
      lowestAverageRate: {
        __typename: "SearchLowestAvailableRatesRateAmountCash",
        amount: monetary(amount),
        amountPlusMandatoryFees: monetary(amount),
        fees: monetary(fees),
        mandatoryFees: monetary(0),
        taxes: monetary(taxes),
        totalAmount: monetary(total),
      },
    },
    sourceOfRate: "DSP",
    status: { __typename: "Lookup", code: "AvailableForSale" },
  };
}

function pointsRate({ points, value = "MRW", code = "Special", status = "AvailableForSale" }) {
  return {
    __typename: "SearchLowestAvailableRate",
    lengthOfStay: 1,
    membersOnly: false,
    rateCategory: { __typename: "SearchRateCategory", code, value },
    rateModes:
      status === "AvailableForSale"
        ? {
            __typename: "SearchLowestAvailableRatesRateModesPoints",
            pointsPerUnit: { __typename: "SearchLowestAvailableRatesRateAmountPoints", points },
          }
        : null,
    sourceOfRate: "DSP",
    status: { __typename: "Lookup", code: status },
  };
}

function unavailableRate(value) {
  return {
    __typename: "SearchLowestAvailableRate",
    lengthOfStay: 1,
    membersOnly: false,
    rateCategory: { __typename: "SearchRateCategory", code: "Special", value },
    rateModes: null,
    sourceOfRate: "DSP",
    status: { __typename: "Lookup", code: "NotAvailable" },
  };
}

function hotelNode({ id, name, brandCode, brandName, currency, rates }) {
  return {
    distance: 364.2448,
    property: {
      id,
      basicInformation: {
        name,
        currency,
        brand: { __typename: "Brand", id: brandCode, name: brandName },
      },
    },
    rates,
  };
}

function payloadFor(nodes) {
  return {
    data: {
      search: {
        lowestAvailableRates: {
          searchByDestination: {
            total: nodes.length,
            pageInfo: { hasNextPage: false },
            edges: nodes.map((node) => ({ node })),
          },
        },
      },
    },
  };
}

const shanghaiJw = hotelNode({
  id: "SHAJW",
  name: "上海明天广场 JW 万豪酒店",
  brandCode: "JW",
  brandName: "JW Marriott",
  currency: "CNY",
  rates: [
    unavailableRate("P17"),
    pointsRate({ points: 33000 }),
    cashRate({ amount: 113800, fees: 18891, total: 132691 }),
  ],
});

test("computes the sampling window in the city's own time zone", () => {
  // 2026-09-27T18:00Z 在东京已经是 9 月 28 日 03:00，因此当天应以 09-28 起算。
  const tokyo = futureWindow(
    { timezone: "Asia/Tokyo" },
    { daysAhead: 30, nights: 1, now: new Date("2026-09-27T18:00:00Z") },
  );
  assert.deepEqual(tokyo, { checkIn: "2026-10-28", checkOut: "2026-10-29" });

  const shanghai = futureWindow(
    { timezone: "Asia/Shanghai" },
    { daysAhead: 30, nights: 2, now: new Date("2026-09-27T18:00:00Z") },
  );
  assert.deepEqual(shanghai, { checkIn: "2026-10-28", checkOut: "2026-10-30" });
});

test("keeps the same local date on both sides of midnight UTC", () => {
  const before = futureWindow(
    { timezone: "Asia/Shanghai" },
    { daysAhead: 30, now: new Date("2026-09-27T15:59:00Z") },
  );
  const after = futureWindow(
    { timezone: "Asia/Shanghai" },
    { daysAhead: 30, now: new Date("2026-09-27T16:01:00Z") },
  );
  assert.equal(before.checkIn, "2026-10-27");
  assert.equal(after.checkIn, "2026-10-28");
});

test("parses points from the redemption cluster and cash from the standard rate", () => {
  const hotels = parseSearchResponse(payloadFor([shanghaiJw]));
  assert.equal(hotels.length, 1);
  const [hotel] = hotels;
  assert.equal(hotel.hotelCode, "SHAJW");
  assert.equal(hotel.brandCode, "JW");
  assert.equal(hotel.currencyCode, "CNY");
  assert.equal(hotel.pointsPerNight, 33000);
  assert.equal(hotel.membersOnly, false);
  assert.equal(hotel.cash.totalMinor, 132691);
  assert.equal(hotel.cash.totalDecimalPoint, 2);
  assert.equal(hotel.cash.amountMinor, 113800);
  assert.equal(hotel.cash.feesMinor, 18891);
});

test("ignores unavailable and promotional rates", () => {
  const onlyPromo = hotelNode({
    id: "SHAXX",
    name: "样例酒店",
    brandCode: "MC",
    brandName: "Marriott Hotels & Resorts",
    currency: "CNY",
    rates: [unavailableRate("P17"), pointsRate({ points: 20000, status: "NotAvailable" })],
  });
  const [hotel] = parseSearchResponse(payloadFor([onlyPromo]));
  assert.equal(hotel.pointsPerNight, null);
  assert.equal(hotel.cash, null);
});

test("falls back to cash-and-points rate mode when standard cash is absent", () => {
  const node = hotelNode({
    id: "SHAYY",
    name: "样例酒店",
    brandCode: "CY",
    brandName: "Courtyard",
    currency: "CNY",
    rates: [
      pointsRate({ points: 12000, code: "Special", value: "MRW" }),
      {
        __typename: "SearchLowestAvailableRate",
        lengthOfStay: 1,
        membersOnly: false,
        rateCategory: { __typename: "SearchRateCategory", code: "StandardRates", value: null },
        rateModes: {
          __typename: "SearchLowestAvailableRatesRateModesCashAndPoints",
          cashAndPointsPerUnit: {
            amount: monetary(50000),
            points: 5000,
            taxes: monetary(0),
            totalAmount: monetary(55000),
            fees: monetary(5000),
          },
        },
        sourceOfRate: "DSP",
        status: { __typename: "Lookup", code: "AvailableForSale" },
      },
    ],
  });
  const [hotel] = parseSearchResponse(payloadFor([node]));
  assert.equal(hotel.cash.totalMinor, 55000);
});

test("converts minor units and computes value per 10,000 points", () => {
  assert.equal(toMajorUnits(132691, 2), 1326.91);
  assert.equal(toMajorUnits(180463, 0), 180463);

  const cny = valuePerTenThousand(132691, 2, 33000);
  assert.ok(cny !== null);
  assert.equal(Math.round(cny * 100) / 100, 402.09);

  const jpy = valuePerTenThousand(180463, 0, 122500);
  assert.ok(jpy !== null);
  assert.equal(Math.round(jpy), 14732);

  assert.equal(valuePerTenThousand(132691, 2, 0), null);
  assert.equal(valuePerTenThousand(0, 2, 33000), null);
});

test("drops records missing points, missing cash, or an unmapped brand", () => {
  const inputs = [
    {
      hotel: { ...parseSearchResponse(payloadFor([shanghaiJw]))[0] },
      citySlug: "shanghai",
      checkIn: "2026-10-28",
      checkOut: "2026-10-29",
      capturedAt: "2026-09-27T06:30:00.000Z",
      brandSlug: "jw-marriott",
      portfolioTier: "Luxury",
      expectedCurrency: "CNY",
    },
    {
      hotel: { ...parseSearchResponse(payloadFor([shanghaiJw]))[0], hotelCode: "NO_POINTS", pointsPerNight: null },
      citySlug: "shanghai",
      checkIn: "2026-10-28",
      checkOut: "2026-10-29",
      capturedAt: "2026-09-27T06:30:00.000Z",
      brandSlug: "jw-marriott",
      portfolioTier: "Luxury",
      expectedCurrency: "CNY",
    },
    {
      hotel: { ...parseSearchResponse(payloadFor([shanghaiJw]))[0], hotelCode: "NO_CASH", cash: null },
      citySlug: "shanghai",
      checkIn: "2026-10-28",
      checkOut: "2026-10-29",
      capturedAt: "2026-09-27T06:30:00.000Z",
      brandSlug: "jw-marriott",
      portfolioTier: "Luxury",
      expectedCurrency: "CNY",
    },
    {
      hotel: { ...parseSearchResponse(payloadFor([shanghaiJw]))[0], hotelCode: "NEW_BRAND" },
      citySlug: "shanghai",
      checkIn: "2026-10-28",
      checkOut: "2026-10-29",
      capturedAt: "2026-09-27T06:30:00.000Z",
      brandSlug: null,
      portfolioTier: null,
      expectedCurrency: "CNY",
    },
  ];

  const { kept, dropped } = cleanCitySamples(inputs);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].hotelCode, "SHAJW");
  assert.equal(kept[0].portfolioTier, "Luxury");
  assert.ok(Math.abs(kept[0].valuePerTenThousand - 402.09) < 0.01);

  const reasons = dropped.map((entry) => `${entry.hotelCode}:${entry.reason}`).sort();
  assert.deepEqual(reasons, [
    "NEW_BRAND:unmapped_brand",
    "NO_CASH:missing_cash",
    "NO_POINTS:missing_points",
  ]);
});

function makeInput(hotel, overrides = {}) {
  return {
    hotel,
    citySlug: "shanghai",
    checkIn: "2026-10-28",
    checkOut: "2026-10-29",
    capturedAt: "2026-09-27T06:30:00.000Z",
    brandSlug: "jw-marriott",
    portfolioTier: "Luxury",
    expectedCurrency: "CNY",
    ...overrides,
  };
}

test("keeps separately listed brands with an empty tier instead of dropping them", () => {
  const base = parseSearchResponse(payloadFor([shanghaiJw]))[0];
  const { kept, dropped } = cleanCitySamples([
    makeInput(
      { ...base, hotelCode: "SERIES", brandCode: "SE" },
      { brandSlug: "series-by-marriott", portfolioTier: null, separateBrand: true },
    ),
  ]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].brandSlug, "series-by-marriott");
  assert.equal(kept[0].portfolioTier, null);
  assert.equal(dropped.length, 0);
});

test("still drops a brand that is neither mapped nor separately listed", () => {
  const base = parseSearchResponse(payloadFor([shanghaiJw]))[0];
  const { kept, dropped } = cleanCitySamples([
    makeInput(
      { ...base, hotelCode: "UNKNOWN", brandCode: "ZZ" },
      { brandSlug: null, portfolioTier: null },
    ),
  ]);
  assert.equal(kept.length, 0);
  assert.deepEqual(
    dropped.map((entry) => `${entry.hotelCode}:${entry.reason}`),
    ["UNKNOWN:unmapped_brand"],
  );
});

test("drops a null tier unless the brand is explicitly marked as separate", () => {
  const base = parseSearchResponse(payloadFor([shanghaiJw]))[0];
  const { kept, dropped } = cleanCitySamples([
    makeInput(
      { ...base, hotelCode: "NO_TIER", brandCode: "JW" },
      { brandSlug: "jw-marriott", portfolioTier: null },
    ),
  ]);
  assert.equal(kept.length, 0);
  assert.equal(dropped[0].reason, "unmapped_brand");
});

test("drops a sample that sits more than five times away from the city median", () => {
  const base = parseSearchResponse(payloadFor([shanghaiJw]))[0];
  const values = [
    { id: "A", total: 90000, points: 30000 },   // 300
    { id: "B", total: 105000, points: 30000 },  // 350
    { id: "C", total: 120000, points: 30000 },  // 400
    { id: "D", total: 135000, points: 30000 },  // 450
    { id: "E", total: 150000, points: 30000 },  // 500
    { id: "F", total: 3000000, points: 30000 }, // 1000*10 = 10000，异常
  ];
  const inputs = values.map((entry) => ({
    hotel: {
      ...base,
      hotelCode: entry.id,
      pointsPerNight: entry.points,
      cash: {
        amountMinor: entry.total,
        amountDecimalPoint: 2,
        totalMinor: entry.total,
        totalDecimalPoint: 2,
        feesMinor: 0,
        feesDecimalPoint: 2,
        taxesMinor: 0,
        taxesDecimalPoint: 2,
      },
    },
    citySlug: "shanghai",
    checkIn: "2026-10-28",
    checkOut: "2026-10-29",
    capturedAt: "2026-09-27T06:30:00.000Z",
    brandSlug: "jw-marriott",
    portfolioTier: "Luxury",
    expectedCurrency: "CNY",
  }));

  const { kept, dropped } = cleanCitySamples(inputs);
  assert.equal(kept.length, 5);
  assert.deepEqual(
    dropped.map((entry) => `${entry.hotelCode}:${entry.reason}`),
    ["F:outlier"],
  );
});

test("summarises a sample set with quartiles", () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(quantile([], 0.25), null);

  const samples = parseSearchResponse(payloadFor([shanghaiJw]));
  const rows = samples.map((hotel) => ({
    citySlug: "shanghai",
    checkIn: "2026-10-28",
    checkOut: "2026-10-29",
    capturedAt: "2026-09-27T06:30:00.000Z",
    hotelCode: hotel.hotelCode,
    hotelName: hotel.hotelName,
    brandCode: hotel.brandCode,
    brandSlug: "jw-marriott",
    portfolioTier: "Luxury",
    currencyCode: hotel.currencyCode,
    cash: hotel.cash,
    points: hotel.pointsPerNight,
    membersOnly: false,
    valuePerTenThousand: 402.09,
  }))
    .concat([
      {
        citySlug: "shanghai",
        checkIn: "2026-10-28",
        checkOut: "2026-10-29",
        capturedAt: "2026-09-27T06:30:00.000Z",
        hotelCode: "SECOND",
        hotelName: "第二家",
        brandCode: "CY",
        brandSlug: "courtyard",
        portfolioTier: "Select",
        currencyCode: "CNY",
        cash: samples[0].cash,
        points: 20000,
        membersOnly: false,
        valuePerTenThousand: 300,
      },
    ]);

  const stats = summarize(rows);
  assert.equal(stats.count, 2);
  assert.equal(stats.min, 300);
  assert.equal(stats.max, 402.09);
  // (402.09 + 300) / 2 = 351.045，用容差比较避免二进制浮点误差
  assert.ok(Math.abs(stats.median - 351.045) < 0.001);
});
test("drops a hotel priced in a different currency than the city's local one", () => {
  // 实测：多伦多的搜索结果里混进了 2 家美元报价的美国酒店（半径搜索的副作用）。
  const base = parseSearchResponse(payloadFor([shanghaiJw]))[0];
  const foreign = { ...base, hotelCode: "US_IN_TORONTO", currencyCode: "USD" };
  const { kept, dropped } = cleanCitySamples([
    makeInput(foreign, { expectedCurrency: "CAD" }),
  ]);
  assert.equal(kept.length, 0);
  assert.deepEqual(
    dropped.map((entry) => `${entry.hotelCode}:${entry.reason}`),
    ["US_IN_TORONTO:currency_mismatch"],
  );
});

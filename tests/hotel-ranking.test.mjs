import assert from "node:assert/strict";
import test from "node:test";

import {
  RANKING_OPTIONS,
  RANKING_SCOPE_NOTE,
  getCashValuePerTenThousand,
  getRankingOption,
  rankHotels,
} from "../app/lib/hotel-ranking.ts";

function hotel(overrides) {
  return {
    id: "cyberport",
    nameZh: "香港数码港艾美酒店",
    nameEn: "Le Méridien Hong Kong, Cyberport",
    brandId: "le-meridien",
    brand: "Le Méridien",
    tier: "Premium",
    city: "香港",
    district: "香港岛 · 数码港",
    cashPrice: 1235,
    pointsRequired: 37000,
    currency: "CNY",
    sourceLabel: "用户提供的价格样例（日期为原型）",
    sourceUrl: null,
    updatedAt: "2026-07-25T20:35:00+08:00",
    ...overrides,
  };
}

const hongKongHotels = [
  hotel({ id: "cyberport", cashPrice: 1235, pointsRequired: 37000 }),
  hotel({
    id: "jw-hong-kong",
    nameZh: "香港 JW 万豪酒店",
    cashPrice: 2280,
    pointsRequired: 52000,
    tier: "Luxury",
  }),
  hotel({
    id: "sheraton-hong-kong",
    nameZh: "香港喜来登酒店",
    cashPrice: 1680,
    pointsRequired: 48000,
  }),
  hotel({
    id: "courtyard-hong-kong",
    nameZh: "香港万怡酒店",
    cashPrice: 1120,
    pointsRequired: 32000,
    tier: "Select",
  }),
];

function orderOf(ranked) {
  return ranked.map((entry) => entry.hotel.id);
}

test("ranks the highest redemption value first", () => {
  const ranked = rankHotels(hongKongHotels, "value");

  assert.deepEqual(orderOf(ranked), [
    "jw-hong-kong",
    "courtyard-hong-kong",
    "sheraton-hong-kong",
    "cyberport",
  ]);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].valuePerTenThousand, 438.46);
  assert.equal(ranked.at(-1).valuePerTenThousand, 333.78);
});

test("gives tied redemption value the same rank and orders them by cash price", () => {
  const ranked = rankHotels(hongKongHotels, "value");

  // Sheraton and Courtyard both return exactly ¥350 per 10,000 points.
  assert.equal(ranked[1].valuePerTenThousand, 350);
  assert.equal(ranked[2].valuePerTenThousand, 350);
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[2].rank, 2);
  assert.equal(ranked[1].hotel.id, "courtyard-hong-kong");
  assert.equal(ranked[2].hotel.id, "sheraton-hong-kong");
  // The next distinct value skips to 4 instead of continuing at 3.
  assert.equal(ranked[3].rank, 4);
});

test("sorts by cash price or points without changing the rank meaning", () => {
  const byCash = rankHotels(hongKongHotels, "cash");
  assert.deepEqual(orderOf(byCash), [
    "courtyard-hong-kong",
    "cyberport",
    "sheraton-hong-kong",
    "jw-hong-kong",
  ]);
  assert.deepEqual(
    byCash.map((entry) => entry.rank),
    [1, 2, 3, 4],
  );

  const byPoints = rankHotels(hongKongHotels, "points");
  assert.deepEqual(orderOf(byPoints), [
    "courtyard-hong-kong",
    "cyberport",
    "sheraton-hong-kong",
    "jw-hong-kong",
  ]);
});

test("keeps the input array untouched and handles empty results", () => {
  const original = hongKongHotels.map((entry) => entry.id);
  rankHotels(hongKongHotels, "value");

  assert.deepEqual(
    hongKongHotels.map((entry) => entry.id),
    original,
  );
  assert.deepEqual(rankHotels([], "value"), []);
});

test("is deterministic when every metric is identical", () => {
  const twins = [
    hotel({ id: "b-hotel" }),
    hotel({ id: "a-hotel" }),
    hotel({ id: "c-hotel" }),
  ];
  const ranked = rankHotels(twins, "value");

  assert.deepEqual(orderOf(ranked), ["a-hotel", "b-hotel", "c-hotel"]);
  assert.deepEqual(
    ranked.map((entry) => entry.rank),
    [1, 1, 1],
  );
});

test("publishes explainable criteria and an honest scope note", () => {
  assert.deepEqual(
    RANKING_OPTIONS.map((option) => option.id),
    ["value", "cash", "points"],
  );
  assert.equal(getRankingOption("value").label, "兑换价值最高");
  assert.equal(getRankingOption("cash").label, "现金价最低");
  assert.equal(getRankingOption("points").label, "所需积分最少");
  assert.match(RANKING_SCOPE_NOTE, /不构成预订建议/);
  assert.throws(() => getRankingOption("cheapest"), /Unsupported ranking/);
  assert.equal(
    getCashValuePerTenThousand(hongKongHotels[0]),
    333.78,
  );
});

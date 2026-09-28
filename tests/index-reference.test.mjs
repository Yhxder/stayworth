import assert from "node:assert/strict";
import test from "node:test";

import { findMarketReference } from "../app/lib/index-reference.ts";

function row(key, label, currencyCode, value, sampleCount = 40, cityCount = 1) {
  return {
    key,
    label,
    currencyCode,
    value,
    p25: value * 0.9,
    p75: value * 1.1,
    sampleCount,
    cityCount,
  };
}

const summary = {
  runKey: "2026-09-28T11:48",
  sampleCount: 691,
  cityCount: 18,
  currency: { display: "CNY", options: ["CNY", "USD"] },
  views: {
    byCurrency: {
      CNY: { global: { rows: [row("global", "全部品牌", "CNY", 391.65, 691, 18)] } },
      USD: { global: { rows: [row("global", "全部品牌", "USD", 58.28, 691, 18)] } },
    },
    country: {
      rows: [
        row("HK", "中国香港", "HKD", 382.44, 15),
        row("TW", "中国台湾", "TWD", 1853.46, 17),
      ],
    },
    city: {
      rows: [
        row("hong-kong", "香港", "HKD", 378.07, 13),
        row("taipei", "台北", "TWD", 2073.37, 17),
      ],
    },
  },
};

// 1 HKD = 0.9217 CNY
const convert = (amount, from, to) => {
  const toCny = { CNY: 1, HKD: 0.9217, TWD: 0.211, USD: 6.7195 };
  if (!(from in toCny) || !(to in toCny)) return null;
  return (amount * toCny[from]) / toCny[to];
};

test("uses the city level when the city is sampled", () => {
  const reference = findMarketReference({
    summary,
    citySlug: "hong-kong",
    countryCode: "HK",
    currency: "CNY",
    convert,
  });
  assert.equal(reference.level, "city");
  assert.equal(reference.levelLabel, "城市口径");
  assert.equal(reference.scopeLabel, "香港");
  assert.ok(Math.abs(reference.value - 378.07 * 0.9217) < 0.01);
  assert.equal(reference.localCurrencyCode, "HKD");
  assert.equal(reference.localValue, 378.07);
  assert.equal(reference.sampleCount, 13);
  assert.equal(reference.runKey, "2026-09-28T11:48");
  assert.equal(reference.localOnly, false);
});

test("falls back to the country level when the city is not sampled", () => {
  const reference = findMarketReference({
    summary,
    citySlug: "shenzhen",
    countryCode: "HK",
    currency: "CNY",
    convert,
  });
  assert.equal(reference.level, "country");
  assert.equal(reference.levelLabel, "国家/地区口径");
  assert.equal(reference.scopeLabel, "中国香港");
  assert.equal(reference.sampleCount, 15);
});

test("falls back to the global level when neither city nor country is sampled", () => {
  const reference = findMarketReference({
    summary,
    citySlug: null,
    countryCode: "JP",
    currency: "CNY",
    convert,
  });
  assert.equal(reference.level, "global");
  assert.equal(reference.levelLabel, "全球口径");
  assert.equal(reference.scopeLabel, "全部品牌");
  assert.equal(reference.value, 391.65);
  assert.equal(reference.localValue, null, "全球值本身就是目标币种，不该再标当地货币");
});

test("returns the value in the requested currency for the global level", () => {
  const reference = findMarketReference({
    summary,
    citySlug: null,
    countryCode: "JP",
    currency: "USD",
    convert,
  });
  assert.equal(reference.level, "global");
  assert.equal(reference.value, 58.28);
  assert.equal(reference.currencyCode, "USD");
});

test("keeps the local currency and flags it when no rate is available", () => {
  const reference = findMarketReference({
    summary,
    citySlug: "taipei",
    countryCode: "TW",
    currency: "CNY",
    convert: () => null,
  });
  assert.equal(reference.level, "city");
  assert.equal(reference.localOnly, true);
  assert.equal(reference.currencyCode, "TWD");
  assert.equal(reference.value, 2073.37);
});

test("returns null when there is nothing to show", () => {
  const reference = findMarketReference({
    summary,
    citySlug: null,
    countryCode: null,
    currency: "CNY",
    convert,
  });
  assert.equal(reference?.level, "global", "有全球值时应退到全球");

  const empty = {
    ...summary,
    views: { ...summary.views, byCurrency: {} },
  };
  assert.equal(
    findMarketReference({
      summary: empty,
      citySlug: null,
      countryCode: null,
      currency: "CNY",
      convert,
    }),
    null,
  );
});

test("ignores rows without a usable value", () => {
  const withEmptyCity = {
    ...summary,
    views: {
      ...summary.views,
      city: { rows: [row("hong-kong", "香港", "HKD", null, 0)] },
    },
  };
  const reference = findMarketReference({
    summary: withEmptyCity,
    citySlug: "hong-kong",
    countryCode: "HK",
    currency: "CNY",
    convert,
  });
  assert.equal(reference.level, "country", "城市行没有值时应继续往下退");
});

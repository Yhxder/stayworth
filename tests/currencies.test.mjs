import assert from "node:assert/strict";
import test from "node:test";

import {
  EXCHANGE_RATE_REFERENCE_DATE,
  EXCHANGE_RATE_SOURCE_URL,
  convertCurrencyAmount,
  currencyOptions,
  formatCurrencyAmount,
  getCurrencyConfig,
} from "../app/lib/currencies.ts";

test("provides the supported currencies with dated reference rates", () => {
  assert.equal(EXCHANGE_RATE_REFERENCE_DATE, "2026-08-21");
  assert.match(EXCHANGE_RATE_SOURCE_URL, /^https:\/\/www\.ecb\.europa\.eu\//);
  assert.deepEqual(
    currencyOptions.map((currency) => currency.code),
    ["CNY", "HKD", "USD", "CAD", "JPY", "KRW", "SGD", "THB", "EUR", "GBP"],
  );
  assert.equal(getCurrencyConfig("CNY").unitsPerUsd, 6.7206);
  assert.equal(getCurrencyConfig("USD").unitsPerUsd, 1);
  assert.equal(getCurrencyConfig("CAD").unitsPerUsd, 1.374);
  assert.ok(currencyOptions.every((currency) => currency.unitsPerUsd > 0));
});

test("formats amounts with unambiguous currency symbols", () => {
  assert.equal(formatCurrencyAmount(1235.5, "CNY"), "¥1,235.50");
  assert.equal(formatCurrencyAmount(1235.5, "HKD"), "HK$1,235.50");
  assert.equal(formatCurrencyAmount(1235.5, "CAD"), "CA$1,235.50");
  assert.equal(formatCurrencyAmount(1235.5, "JPY"), "JP¥1,236");
  assert.equal(formatCurrencyAmount(1235.5, "KRW"), "₩1,236");
  assert.equal(formatCurrencyAmount(-10, "CNY"), "-¥10.00");
});

test("converts a point valuation when the selected currency changes", () => {
  assert.equal(convertCurrencyAmount(400, "CNY", "HKD"), 466.65);
  assert.equal(convertCurrencyAmount(400, "CNY", "JPY"), 9446);
});

test("rejects an unsupported currency code", () => {
  assert.throws(() => getCurrencyConfig("ABC"), /Unsupported currency/);
});

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
import { FX_SNAPSHOT } from "../app/data/fx-snapshot.ts";

test("provides the supported currencies with dated reference rates", () => {
  // 汇率来自每日抓取写入的快照（源头是 D1 的 fx_rates），不再手抄。
  assert.match(EXCHANGE_RATE_REFERENCE_DATE, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(EXCHANGE_RATE_SOURCE_URL, /^https:\/\/open\.er-api\.com\//);
  assert.deepEqual(
    currencyOptions.map((currency) => currency.code),
    [
      "CNY", "HKD", "USD", "CAD", "JPY", "KRW", "SGD", "THB", "EUR", "GBP",
      // 为 Index 国家参考值补的币种
      "TWD", "INR", "AED", "AUD", "BRL", "COP",
    ],
  );
  // 美元必须正好是 1，其它币种与快照同源、不能出现两个日期两套数字
  assert.equal(getCurrencyConfig("USD").unitsPerUsd, 1);
  // 期望值从快照推导，不写死数字：汇率每天由定时任务刷新，
  // 写死的话每天第一次提交都会让 CI 变红。
  assert.ok(
    Math.abs(getCurrencyConfig("CNY").unitsPerUsd - 1 / FX_SNAPSHOT.rates.USD) <
      0.0001,
  );
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
  // 换算按 unitsPerUsd 折算，等于 value × rates[to] / rates[from]。
  // 容差取 1：日元没有小数位，结果会被四舍五入到整数。
  const conv = (value, to) =>
    (value * FX_SNAPSHOT.rates[to]) / FX_SNAPSHOT.rates.CNY;
  assert.ok(
    Math.abs(convertCurrencyAmount(400, "CNY", "HKD") - conv(400, "HKD")) < 1,
  );
  assert.ok(
    Math.abs(convertCurrencyAmount(400, "CNY", "JPY") - conv(400, "JPY")) < 1,
  );
});

test("rejects an unsupported currency code", () => {
  assert.throws(() => getCurrencyConfig("ABC"), /Unsupported currency/);
});

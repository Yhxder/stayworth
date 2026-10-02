import assert from "node:assert/strict";
import test from "node:test";

import {
  EXCHANGE_RATE_REFERENCE_DATE,
  EXCHANGE_RATE_SOURCE_URL,
  convertCurrencyAmount,
  currencyOptions,
  formatCurrencyAmount,
  formatExchangeRate,
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
  // 汇率只保留两位小数，而且是截断不是四舍五入：
  // 接口给的是 6–8 位小数，对「参考汇率」这个用途只会把输入框撑成一行长数字。
  // 期望值从当日快照推导，不写死数字——汇率每天由定时任务刷新。
  for (const currency of currencyOptions) {
    const derived =
      (FX_SNAPSHOT.rates[currency.code] ?? FX_SNAPSHOT.rates.CNY) /
      FX_SNAPSHOT.rates.USD;

    assert.ok(
      currency.unitsPerUsd > 0,
      `${currency.code} 的汇率必须大于 0`,
    );
    assert.equal(
      Number(currency.unitsPerUsd.toFixed(2)),
      currency.unitsPerUsd,
      `${currency.code} 的汇率最多两位小数`,
    );
    assert.ok(
      currency.unitsPerUsd <= derived + 1e-9,
      `${currency.code} 不能比接口值更大（截断而不是四舍五入）`,
    );
    assert.ok(
      derived - currency.unitsPerUsd < 0.01 + 1e-9,
      `${currency.code} 的截断误差不能超过 0.01`,
    );
  }
  assert.equal(
    formatExchangeRate(getCurrencyConfig("CNY").unitsPerUsd),
    getCurrencyConfig("CNY").unitsPerUsd.toFixed(2),
  );
});

test("formats amounts with unambiguous currency symbols", () => {
  assert.equal(formatCurrencyAmount(1235.5, "CNY"), "¥1,235.50");
  assert.equal(formatCurrencyAmount(1235.5, "HKD"), "HK$1,235.50");
  assert.equal(formatCurrencyAmount(1235.5, "CAD"), "CA$1,235.50");
  assert.equal(formatCurrencyAmount(1235.5, "JPY"), "JP¥1,236");
  assert.equal(formatCurrencyAmount(1235.5, "KRW"), "₩1,236");
  assert.equal(formatCurrencyAmount(-10, "CNY"), "-¥10.00");
});

test("converts a point valuation with the same rates the interface shows", () => {
  // 换算用的就是页面上那两个小数位，所以和接口的严格值之间只差「两位截断」的
  // 误差：相对误差在 0.2% 以内。日元没有小数位，结果会被取整到整数。
  const rateRatio = (value, to) =>
    convertCurrencyAmount(value, "CNY", to) /
    ((value * FX_SNAPSHOT.rates[to]) / FX_SNAPSHOT.rates.CNY);

  assert.ok(Math.abs(rateRatio(400, "HKD") - 1) < 0.002);
  assert.ok(Math.abs(rateRatio(400, "JPY") - 1) < 0.002);
});

test("rejects an unsupported currency code", () => {
  assert.throws(() => getCurrencyConfig("ABC"), /Unsupported currency/);
});

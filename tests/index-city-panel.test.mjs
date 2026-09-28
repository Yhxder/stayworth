import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_PANEL_VERSION,
  cityPanel,
  displayOnlyCitySlugs,
} from "../app/data/city-panel.ts";
import {
  FX_FALLBACK_RATES,
  hasRate,
} from "../app/data/index-fx.ts";

test("keeps the city panel internally consistent", () => {
  const slugs = cityPanel.map((city) => city.slug);
  assert.equal(new Set(slugs).size, slugs.length, "城市标识不能重复");
  assert.match(CITY_PANEL_VERSION, /^v\d+$/);
  for (const city of cityPanel) {
    assert.ok(city.nameZh.length > 0 && city.nameEn.length > 0);
    assert.match(city.currencyCode, /^[A-Z]{3}$/);
    assert.ok(city.timezone.includes("/"), `${city.slug} 缺少时区`);
  }
});

test("every panel currency has a rate so all regions reach the unified view", () => {
  // 2026-09-28 起换成覆盖 166 种货币的开放接口，面板里每个币种都必须有汇率。
  // 新增城市时忘了补汇率，这条会直接失败，而不是让页面悄悄少一个国家。
  const missing = [];
  for (const city of cityPanel) {
    if (!hasRate(city.currencyCode)) missing.push(`${city.slug}:${city.currencyCode}`);
  }
  assert.deepEqual(missing, [], `以下市场缺汇率：${missing.join("、")}`);
});

test("keeps display-only cities out of the value views", () => {
  // 里约热内卢实测只有 4 家酒店（可用 2 家），达不到 8 家下限；
  // 它保留在面板里只为了让用户看得到巴西市场，绝不能产出参考值。
  assert.deepEqual(displayOnlyCitySlugs, ["rio-de-janeiro"]);
  for (const slug of displayOnlyCitySlugs) {
    const city = cityPanel.find((entry) => entry.slug === slug);
    assert.equal(city?.displayOnly, true);
  }
  // 反过来：样本充足的城市不能被标成仅展示
  const bogota = cityPanel.find((city) => city.slug === "bogota");
  assert.equal(bogota?.displayOnly, undefined);
});

test("keeps the exchange-rate table honest about its coverage", () => {
  // 这三种就是被 ECB 漏掉、逼我们换源头的币种，必须都在
  for (const code of ["TWD", "AED", "COP"]) {
    assert.equal(hasRate(code), true, `${code} 必须有汇率`);
    assert.ok(FX_FALLBACK_RATES[code] > 0);
  }
  assert.equal(FX_FALLBACK_RATES.CNY, 1, "基准币自身必须是 1");
  assert.equal(hasRate("XYZ"), false, "未知币种必须如实返回 false");
});

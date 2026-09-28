import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_PANEL_VERSION,
  cityPanel,
  displayOnlyCitySlugs,
} from "../app/data/city-panel.ts";
import {
  currenciesWithoutRate,
  hasRate,
  unitsPerEur,
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

test("never leaves a panel currency without an explanation", () => {
  // 每个币种要么有汇率，要么在「已知缺汇率」清单里被显式记下来。
  // 新增城市时忘了补汇率，这条会直接失败，而不是让页面悄悄少一个国家。
  const missing = currenciesWithoutRate;
  for (const city of cityPanel) {
    const covered = hasRate(city.currencyCode) || missing.includes(city.currencyCode);
    assert.ok(
      covered,
      `${city.slug} 的币种 ${city.currencyCode} 既没有汇率也没登记在 currenciesWithoutRate`,
    );
  }
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
  assert.ok(Object.keys(unitsPerEur).length >= 16);
  assert.equal(unitsPerEur.EUR, 1);
  assert.equal(hasRate("COP"), false, "比索没有 ECB 汇率，必须如实返回 false");
  assert.ok(currenciesWithoutRate.includes("COP"));
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  BRAND_RULE_REFERENCE_DATE,
  BRAND_RULE_SOURCE_URL,
  getMarriottBrandRule,
  marriottBrandRules,
} from "../app/lib/brand-points.ts";

test("maps a selected Marriott brand to its official base earning rate", () => {
  assert.equal(getMarriottBrandRule("le-meridien").baseRate, 10);
  assert.equal(getMarriottBrandRule("residence-inn").baseRate, 5);
  assert.equal(getMarriottBrandRule("studiores").baseRate, 4);
  assert.equal(getMarriottBrandRule("studiores").eliteBonusEligible, false);
});

test("models the regional Series by Marriott exception explicitly", () => {
  assert.equal(getMarriottBrandRule("series-greater-china").baseRate, 10);
  assert.equal(getMarriottBrandRule("series-other").baseRate, 5);
});

test("keeps every selectable brand rule valid and sourced", () => {
  assert.equal(BRAND_RULE_REFERENCE_DATE, "2026-08-25");
  assert.match(BRAND_RULE_SOURCE_URL, /^https:\/\/www\.marriott\.com\//);
  assert.ok(marriottBrandRules.length >= 30);
  assert.ok(
    marriottBrandRules.every((brand) => [4, 5, 10].includes(brand.baseRate)),
  );
  assert.equal(
    new Set(marriottBrandRules.map((brand) => brand.id)).size,
    marriottBrandRules.length,
  );
});

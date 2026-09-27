import assert from "node:assert/strict";
import test from "node:test";

import {
  BRAND_TIER_REFERENCE_DATE,
  brandMappingForCode,
  marriottBrandMappings,
  pendingBrands,
  portfolioTierForCode,
  separateBrandForCode,
  separateBrands,
} from "../app/data/marriott-brand-tiers.ts";

const ALLOWED_TIERS = ["Luxury", "Premium", "Select", "Longer Stays", "Collections"];

test("uses unique, uppercase API codes for every verified brand", () => {
  const codes = marriottBrandMappings.map((mapping) => mapping.code);
  assert.equal(new Set(codes).size, codes.length, "品牌代号不能重复");
  for (const code of codes) {
    assert.match(code, /^[A-Z0-9]{2,3}$/, `代号 ${code} 应为接口返回的大写字母代号`);
  }

  const slugs = marriottBrandMappings.map((mapping) => mapping.brandSlug);
  assert.equal(new Set(slugs).size, slugs.length, "品牌标识不能重复");
});

test("keeps every mapping inside the five portfolio tiers", () => {
  for (const mapping of marriottBrandMappings) {
    assert.ok(
      ALLOWED_TIERS.includes(mapping.tier),
      `${mapping.code} 的层级 ${mapping.tier} 不在五档之内`,
    );
    assert.equal(mapping.verified, true, `${mapping.code} 未标记为已验证`);
  }
  for (const brand of pendingBrands) {
    assert.ok(ALLOWED_TIERS.includes(brand.tier));
  }
});

test("keeps separate brands out of the tier mapping and out of pending", () => {
  for (const brand of separateBrands) {
    assert.equal(
      brandMappingForCode(brand.code),
      null,
      `${brand.code} 不应出现在五档映射里`,
    );
    assert.equal(
      separateBrandForCode(brand.code)?.brandSlug,
      brand.brandSlug,
    );
    assert.ok(brand.reason.length > 10, `${brand.code} 需要写明单独列出的理由`);
    assert.ok(
      !pendingBrands.some((pending) => pending.brandSlug === brand.brandSlug),
      `${brand.code} 不应同时留在待验证清单`,
    );
  }
});

test("looks up brand codes case-insensitively and returns null when unknown", () => {
  assert.equal(brandMappingForCode("jw")?.tier, "Luxury");
  assert.equal(brandMappingForCode(" JW ")?.brandSlug, "jw-marriott");
  assert.equal(portfolioTierForCode("cy"), "Select");
  assert.equal(brandMappingForCode("ZZ"), null);
  assert.equal(portfolioTierForCode("ZZ"), null);
  assert.equal(separateBrandForCode("zz"), null);
});

test("keeps the codes verified against real responses from regressing", () => {
  // 这批代号来自 2026-09-27 的真实响应（含 AC=AR、EDITION=EB、Moxy=OX 等反直觉取值）。
  // 数量下降通常意味着有人凭印象改回了猜测值，需要重新核对真实响应。
  const expected = [
    "AK", "AL", "AR", "BG", "BR", "CM", "CY", "DE", "DS", "EB",
    "EL", "ER", "FI", "FP", "JW", "LC", "MC", "MD", "OX", "RI",
    "RZ", "SH", "SI", "TS", "TX", "WH", "WI", "XE", "XF", "XR",
  ];
  const codes = marriottBrandMappings.map((mapping) => mapping.code).sort();
  assert.deepEqual(codes, [...expected].sort());
  assert.equal(BRAND_TIER_REFERENCE_DATE, "2026-09-27");
});

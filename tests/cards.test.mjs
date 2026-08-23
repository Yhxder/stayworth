import assert from "node:assert/strict";
import test from "node:test";

import {
  NO_CARD_ID,
  getMarriottCard,
  marriottCards,
} from "../app/lib/cards.ts";
import { calculateRebateEstimate } from "../app/lib/points.ts";

test("stores the researched China, US, and Canada Marriott cards", () => {
  assert.equal(marriottCards.length, 12);
  assert.deepEqual(
    [...new Set(marriottCards.map((card) => card.countryCode))],
    ["CN", "US", "CA"],
  );
  assert.equal(
    getMarriottCard("cn-citic-gold").pointsPerCurrencyUnit,
    2 / 18,
  );
  assert.equal(
    getMarriottCard("us-amex-brilliant").pointsPerCurrencyUnit,
    6,
  );
  assert.equal(
    getMarriottCard("ca-amex-bonvoy-business").pointsPerCurrencyUnit,
    5,
  );
  assert.equal(getMarriottCard(NO_CARD_ID), null);
});

test("keeps every dropdown label to a flag and exact card name", () => {
  assert.ok(
    marriottCards.every((card) =>
      /^(🇨🇳|🇺🇸|🇨🇦)\s\S/.test(card.optionLabel),
    ),
  );
  assert.ok(
    marriottCards.every((card) => !/\dX|\d×|个人卡|商业卡/.test(card.optionLabel)),
  );
});

test("backs every card rule with an official HTTPS source", () => {
  assert.ok(
    marriottCards.every((card) =>
      /^https:\/\/(creditcard\.ecitic\.com|www\.americanexpress\.com|creditcards\.chase\.com|marriott\.chase\.com)\//.test(
        card.sourceUrl,
      ),
    ),
  );
});

test("calculates card points in each card's own earning currency", () => {
  const common = {
    cashPrice: 672.06,
    ineligibleSpend: 0,
    nights: 1,
    exchangeRate: 6.7206,
    baseRate: 0,
    eliteBonusRate: 0,
    welcomePoints: 0,
    promotionalPoints: 0,
    valuePerTenThousand: 400,
  };

  assert.equal(
    calculateRebateEstimate({
      ...common,
      cardPointsPerCurrencyUnit: 6,
      cardCurrencyUnitsPerUsd: 1,
      cardStayBonusPoints: 0,
    }).cardPoints,
    600,
  );
  assert.equal(
    calculateRebateEstimate({
      ...common,
      cardPointsPerCurrencyUnit: 5,
      cardCurrencyUnitsPerUsd: 1.374,
      cardStayBonusPoints: 0,
    }).cardPoints,
    687,
  );
  assert.equal(
    calculateRebateEstimate({
      ...common,
      cardPointsPerCurrencyUnit: 0.3,
      cardCurrencyUnitsPerUsd: 6.7206,
      cardStayBonusPoints: 0,
    }).cardPoints,
    202,
  );
  assert.equal(
    calculateRebateEstimate({
      ...common,
      cardPointsPerCurrencyUnit: 6,
      cardCurrencyUnitsPerUsd: 1,
      cardStayBonusPoints: 1000,
    }).cardPoints,
    1600,
  );
});

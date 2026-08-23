import assert from "node:assert/strict";
import test from "node:test";

import { calculateRebateEstimate } from "../app/lib/points.ts";

const defaultInput = {
  cashPrice: 1235,
  ineligibleSpend: 235,
  nights: 1,
  exchangeRate: 7.2,
  baseRate: 10,
  eliteBonusRate: 0.5,
  cardMultiplier: 6,
  welcomePoints: 1000,
  promotionalPoints: 0,
  valuePerTenThousand: 400,
};

test("calculates the complete earned-points rebate estimate", () => {
  const result = calculateRebateEstimate(defaultInput);

  assert.deepEqual(result, {
    eligibleSpend: 1000,
    basePoints: 1389,
    eliteBonusPoints: 695,
    cardPoints: 1029,
    welcomePoints: 1000,
    promotionalPoints: 0,
    totalPoints: 4113,
    rebateValue: 164.52,
    netStayCost: 1070.48,
    netCostPerNight: 1070.48,
    rebatePercentage: 13.32,
    isNetReturn: false,
  });
});

test("calculates the effective cost per night", () => {
  const result = calculateRebateEstimate({
    ...defaultInput,
    nights: 2,
  });

  assert.equal(result.netCostPerNight, 535.24);
});

test("preserves a negative effective cost as an estimated net return", () => {
  const result = calculateRebateEstimate({
    cashPrice: 100,
    ineligibleSpend: 0,
    nights: 1,
    exchangeRate: 1,
    baseRate: 10,
    eliteBonusRate: 0,
    cardMultiplier: 0,
    welcomePoints: 0,
    promotionalPoints: 10000,
    valuePerTenThousand: 100,
  });

  assert.equal(result.netStayCost, -10);
  assert.equal(result.isNetReturn, true);
});

test("rejects invalid calculator inputs", () => {
  assert.throws(
    () => calculateRebateEstimate({ ...defaultInput, cashPrice: 0 }),
    /greater than zero/,
  );
  assert.throws(
    () =>
      calculateRebateEstimate({
        ...defaultInput,
        ineligibleSpend: -1,
      }),
    /cannot be negative/,
  );
  assert.throws(
    () =>
      calculateRebateEstimate({
        ...defaultInput,
        ineligibleSpend: 1300,
      }),
    /cannot exceed cash price/,
  );
  assert.throws(
    () => calculateRebateEstimate({ ...defaultInput, nights: 0 }),
    /positive integer/,
  );
  assert.throws(
    () => calculateRebateEstimate({ ...defaultInput, nights: 1.5 }),
    /positive integer/,
  );
  assert.throws(
    () => calculateRebateEstimate({ ...defaultInput, welcomePoints: -1 }),
    /cannot be negative/,
  );
  assert.throws(
    () => calculateRebateEstimate({ ...defaultInput, cardMultiplier: -1 }),
    /cannot be negative/,
  );
  assert.throws(
    () =>
      calculateRebateEstimate({
        ...defaultInput,
        promotionalPoints: -1,
      }),
    /cannot be negative/,
  );
  assert.throws(
    () => calculateRebateEstimate({ ...defaultInput, exchangeRate: 0 }),
    /greater than zero/,
  );
  assert.throws(
    () =>
      calculateRebateEstimate({
        ...defaultInput,
        valuePerTenThousand: 0,
      }),
    /greater than zero/,
  );
});

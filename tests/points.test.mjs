import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCashValuePerTenThousand,
  calculateNetStayCost,
  calculatePointsPerCurrencyUnit,
} from "../app/lib/points.ts";

test("calculates the cash value of 10,000 Marriott points", () => {
  const value = calculateCashValuePerTenThousand(1235, 37000);
  assert.equal(value, 333.78);
});

test("calculates points required for each CNY of room value", () => {
  const value = calculatePointsPerCurrencyUnit(1235, 37000);
  assert.equal(value, 29.96);
});

test("calculates net stay cost after the earned-points rebate", () => {
  const result = calculateNetStayCost({
    cashPrice: 1235,
    basePoints: 1544,
    eliteBonusPoints: 772,
    cardPoints: 2470,
    welcomePoints: 1000,
    promotionalPoints: 0,
    valuePerTenThousand: 400,
  });

  assert.deepEqual(result, {
    totalPoints: 5786,
    rebateValue: 231.44,
    netStayCost: 1003.56,
  });
});

test("rejects zero or negative prices and point amounts", () => {
  assert.throws(
    () => calculateCashValuePerTenThousand(1235, 0),
    /greater than zero/,
  );
  assert.throws(
    () => calculatePointsPerCurrencyUnit(0, 37000),
    /greater than zero/,
  );
});

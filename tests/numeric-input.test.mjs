import assert from "node:assert/strict";
import test from "node:test";

import {
  CALCULATOR_LIMITS,
  parseNumericInput,
} from "../app/lib/numeric-input.ts";

test("keeps a cleared number input empty instead of converting it to zero", () => {
  assert.ok(Number.isNaN(parseNumericInput("")));
  assert.ok(Number.isNaN(parseNumericInput("   ")));
  assert.equal(parseNumericInput("0"), 0);
  assert.equal(parseNumericInput("1235.50"), 1235.5);
});

test("publishes explicit calculator input limits", () => {
  assert.equal(CALCULATOR_LIMITS.cashPrice.max, 100_000_000);
  assert.equal(CALCULATOR_LIMITS.nights.max, 365);
  assert.equal(CALCULATOR_LIMITS.points.max, 100_000_000);
});

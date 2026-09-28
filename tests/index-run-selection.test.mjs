import assert from "node:assert/strict";
import test from "node:test";

import {
  RUN_COVERAGE_RATIO,
  pickDisplayRun,
} from "../app/lib/index-run-selection.ts";

test("skips a tiny ad-hoc run in favour of a full one", () => {
  // 生产里出现过的情况：最新的一批只跑了 1 个城市
  const picked = pickDisplayRun(
    [
      { id: 9, citiesOk: 1 },
      { id: 8, citiesOk: 19 },
    ],
    20,
  );
  assert.equal(picked.id, 8);
});

test("keeps the newest run when it already covers enough cities", () => {
  const picked = pickDisplayRun(
    [
      { id: 12, citiesOk: 19 },
      { id: 11, citiesOk: 20 },
    ],
    20,
  );
  assert.equal(picked.id, 12);
});

test("accepts a partial run above the coverage floor", () => {
  const floor = Math.ceil(20 * RUN_COVERAGE_RATIO);
  const picked = pickDisplayRun(
    [
      { id: 4, citiesOk: floor },
      { id: 3, citiesOk: 20 },
    ],
    20,
  );
  assert.equal(picked.id, 4);
});

test("falls back to the newest run when nothing covers enough cities", () => {
  const picked = pickDisplayRun(
    [
      { id: 3, citiesOk: 2 },
      { id: 2, citiesOk: 1 },
    ],
    20,
  );
  assert.equal(picked.id, 3, "宁可显示小而完整的样本，也不要空白");
});

test("returns null when there is nothing to pick", () => {
  assert.equal(pickDisplayRun([], 20), null);
});

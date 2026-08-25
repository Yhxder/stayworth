import assert from "node:assert/strict";
import test from "node:test";

import {
  getSearchStateContent,
  isHotelDataStale,
} from "../app/lib/hotel-search.ts";

test("provides visible copy for loading, empty, error, and stale states", () => {
  assert.match(getSearchStateContent("loading").title, /正在查询/);
  assert.match(getSearchStateContent("empty").title, /暂无数据/);
  assert.match(getSearchStateContent("error").title, /查询失败/);
  assert.match(getSearchStateContent("stale").title, /数据已过期/);
});

test("marks old price snapshots as stale", () => {
  assert.equal(
    isHotelDataStale(
      "2026-07-25T20:35:00+08:00",
      new Date("2026-08-25T12:00:00+08:00"),
    ),
    true,
  );
  assert.equal(
    isHotelDataStale(
      "2026-08-24T20:35:00+08:00",
      new Date("2026-08-25T12:00:00+08:00"),
    ),
    false,
  );
});

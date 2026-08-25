import assert from "node:assert/strict";
import test from "node:test";

import { prototypeHotels } from "../app/data/prototype-hotels.ts";
import {
  filterPrototypeHotels,
  getSearchStateContent,
  isHotelDataStale,
} from "../app/lib/hotel-search.ts";

test("keeps prototype hotel data outside the page with provenance fields", () => {
  assert.equal(prototypeHotels.length, 4);
  assert.ok(
    prototypeHotels.every(
      (hotel) => hotel.city && hotel.sourceLabel && hotel.updatedAt,
    ),
  );
});

test("filters the prototype data by supported city alias and portfolio tier", () => {
  const results = filterPrototypeHotels(prototypeHotels, {
    city: "Hong Kong",
    tier: "Premium",
  });

  assert.deepEqual(
    results.map((hotel) => hotel.id),
    ["cyberport", "sheraton-hong-kong"],
  );
  assert.deepEqual(
    filterPrototypeHotels(prototypeHotels, {
      city: "上海",
      tier: "全部等级",
    }),
    [],
  );
});

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

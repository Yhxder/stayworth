import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_TIME_ZONE,
  DEFAULT_CHECK_IN_OFFSET_DAYS,
  addDaysToIsoDate,
  getDefaultStayDates,
  getTodayIso,
} from "../app/lib/stay-dates.ts";

test("resolves today in the app time zone instead of the runtime locale", () => {
  assert.equal(APP_TIME_ZONE, "Asia/Shanghai");

  // 2026-09-27T16:30Z is already 2026-09-28 in Shanghai.
  assert.equal(getTodayIso(new Date("2026-09-27T16:30:00Z")), "2026-09-28");
  assert.equal(getTodayIso(new Date("2026-09-27T15:59:00Z")), "2026-09-27");
});

test("defaults to a future stay instead of a past fixture date", () => {
  const stay = getDefaultStayDates(new Date("2026-09-27T02:00:00Z"));

  assert.equal(DEFAULT_CHECK_IN_OFFSET_DAYS, 30);
  assert.equal(stay.checkIn, "2026-10-27");
  assert.equal(stay.checkOut, "2026-10-28");
  assert.ok(stay.checkOut > stay.checkIn);
  assert.ok(stay.checkIn > getTodayIso(new Date("2026-09-27T02:00:00Z")));
});

test("adds whole days across month and year boundaries", () => {
  assert.equal(addDaysToIsoDate("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysToIsoDate("2026-02-28", 1), "2026-03-01");
  assert.equal(addDaysToIsoDate("2026-08-15", 0), "2026-08-15");
  assert.throws(() => addDaysToIsoDate("2026-08-15", 1.5), /integer/);
  assert.throws(() => addDaysToIsoDate("not-a-date", 1), /Invalid ISO date/);
});

test("keeps the default window exactly one night", () => {
  const stay = getDefaultStayDates(new Date("2026-01-31T12:00:00Z"));

  assert.equal(stay.checkIn, "2026-03-02");
  assert.equal(stay.checkOut, "2026-03-03");
});

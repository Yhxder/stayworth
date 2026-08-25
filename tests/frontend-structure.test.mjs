import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const projectFiles = [
  "app/components/search/SearchForm.tsx",
  "app/components/search/HotelCard.tsx",
  "app/components/search/SearchResults.tsx",
  "app/components/search/ComparisonSection.tsx",
  "app/components/rebate/RebateCalculator.tsx",
  "app/lib/hotel-api.ts",
  "app/lib/rebate-prefill.ts",
  "app/types/hotel.ts",
];

test("splits the four main UI responsibilities into focused files", () => {
  for (const file of projectFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }

  const pageSource = readFileSync("app/page.tsx", "utf8");
  assert.doesNotMatch(pageSource, /const hotels\s*:/);
  assert.match(pageSource, /<SearchForm/);
  assert.match(pageSource, /<SearchResults/);
  assert.match(pageSource, /<ComparisonSection/);
  assert.match(pageSource, /<RebateCalculator/);
  assert.match(pageSource, /fetchHotelSnapshots/);
  assert.doesNotMatch(pageSource, /prototypeHotels|filterPrototypeHotels/);
  assert.match(pageSource, /resultStayDates\.checkIn/);
  assert.match(pageSource, /resultStayDates\.checkOut/);
});

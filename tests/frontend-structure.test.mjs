import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const projectFiles = [
  "app/components/home/HeroSection.tsx",
  "app/components/home/BookingPanel.tsx",
  "app/components/ui/GlassCard.tsx",
  "app/components/ui/InputField.tsx",
  "app/components/search/HotelCard.tsx",
  "app/components/search/SearchResults.tsx",
  "app/components/search/ComparisonSection.tsx",
  "app/components/rebate/RebateCalculator.tsx",
  "app/lib/hotel-api.ts",
  "app/lib/hotel-ranking.ts",
  "app/lib/stay-dates.ts",
  "app/lib/rebate-prefill.ts",
  "app/types/hotel.ts",
];

test("splits the home page into focused, reusable components", () => {
  for (const file of projectFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }

  const pageSource = readFileSync("app/page.tsx", "utf8");
  assert.match(pageSource, /<HeroSection/);
  assert.match(pageSource, /<BookingPanel/);
  assert.doesNotMatch(pageSource, /const hotels\s*:/);
  assert.match(pageSource, /<SearchResults/);
  assert.match(pageSource, /<ComparisonSection/);
  assert.match(pageSource, /<RebateCalculator/);
  assert.match(pageSource, /fetchHotelSnapshots/);
  assert.doesNotMatch(pageSource, /prototypeHotels|filterPrototypeHotels/);
  assert.match(pageSource, /resultStayDates\.checkIn/);
  assert.match(pageSource, /resultStayDates\.checkOut/);
  // 首页只负责组合与状态，界面细节留在各自组件里
  assert.ok(
    pageSource.split("\n").length < 400,
    "app/page.tsx should stay a composition file",
  );

  const bookingSource = readFileSync(
    "app/components/home/BookingPanel.tsx",
    "utf8",
  );
  assert.match(bookingSource, /useState/);
  assert.match(bookingSource, /<GlassCard/);
  assert.match(bookingSource, /<InputField/);
});

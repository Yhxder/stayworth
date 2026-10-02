import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const projectFiles = [
  "app/components/home/HeroSection.tsx",
  "app/components/home/HeroGlobe.tsx",
  "app/components/home/BookingPanel.tsx",
  "app/components/shell/FloatingHeader.tsx",
  "app/components/shell/BrandLogo.tsx",
  "app/components/theme/ThemeToggle.tsx",
  "app/components/ui/SurfaceCard.tsx",
  "app/components/ui/InputField.tsx",
  "app/components/search/HotelCardList.tsx",
  "app/components/search/HotelCard.tsx",
  "app/components/search/HotelImage.tsx",
  "app/components/search/SearchResults.tsx",
  "app/components/search/ComparisonSection.tsx",
  "app/components/rebate/RebateCalculator.tsx",
  "app/lib/hotel-api.ts",
  "app/lib/hotel-ranking.ts",
  "app/lib/stay-dates.ts",
  "app/lib/theme.ts",
  "app/lib/image-proxy.ts",
  "app/types/hotel.ts",
  "worker/media-proxy.ts",
];

test("splits the home page into focused, reusable components", () => {
  for (const file of projectFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }

  const pageSource = readFileSync("app/page.tsx", "utf8");
  assert.match(pageSource, /<FloatingHeader/);
  assert.match(pageSource, /<HeroSection/);
  assert.match(pageSource, /<BookingPanel/);
  assert.match(pageSource, /<ComparisonTray/);
  assert.match(pageSource, /<SearchResults/);
  assert.match(pageSource, /<ComparisonSection/);
  assert.match(pageSource, /<RebateCalculator/);
  assert.match(pageSource, /fetchHotelSnapshots/);
  assert.doesNotMatch(pageSource, /prototypeHotels|filterPrototypeHotels/);
  assert.doesNotMatch(pageSource, /const hotels\s*:/);
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
  assert.match(bookingSource, /<SurfaceCard/);
  assert.match(bookingSource, /<InputField/);
});

test("keeps Liquid Glass out of the content layer", () => {
  const css = readFileSync("app/globals.css", "utf8");
  // 只允许功能层出现 backdrop-filter；回退块里的 none 不算使用点
  const blurBlocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
    ([, , body]) =>
      /backdrop-filter:\s*blur/.test(body) || /-webkit-backdrop-filter:\s*blur/.test(body),
  );

  assert.ok(blurBlocks.length > 0, "功能层应该至少有玻璃实现");
  for (const [selector] of blurBlocks) {
    assert.match(
      selector.trim(),
      /glass-functional|comparison-tray|site-header/,
      `玻璃只能用在功能层，出现问题的选择器：${selector.trim()}`,
    );
  }

  const glassUsage = readFileSync("app/globals.css", "utf8").match(/\.glass-functional/g) ?? [];
  assert.ok(glassUsage.length <= 3, "全站玻璃使用点不超过 3 处");
});

test("keeps one 并排比较 entry per viewport width", () => {
  const css = readFileSync("app/globals.css", "utf8");

  // 手机端：托盘的按钮让位给右下角的悬浮按钮，避免同一个动作出现两个同名按钮
  const mobile = css.slice(css.indexOf("@media (max-width: 768px)"));
  assert.match(mobile, /\.comparison-tray \.primary-button\s*\{[^}]*display:\s*none/);
  assert.match(mobile, /\.comparison-jump-button\s*\{[^}]*display:\s*inline-flex/);

  // 桌面端：托盘本来就吸顶常驻，悬浮按钮必须彻底退出（display:none 也让它离开可访问性树）
  const jumpBase = css.slice(
    css.indexOf(".comparison-jump-button {"),
    css.indexOf("@keyframes jump-button-in"),
  );
  assert.match(jumpBase, /display:\s*none/);
  assert.match(jumpBase, /position:\s*fixed/);
});

test("keeps type at or above the 12px floor and inside the spacing scale", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const tooSmall = [...css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)].filter(
    ([, value, unit]) => Number(value) < (unit === "px" ? 12 : 0.75),
  );

  assert.deepEqual(
    tooSmall.map((match) => match[0]),
    [],
    "所有字号必须 ≥ 12px（0.75rem）",
  );

  // 中文不加字距：只有拉丁大写标签允许放宽
  assert.match(css, /letter-spacing:\s*0(?:\.|\s|;)/);
});

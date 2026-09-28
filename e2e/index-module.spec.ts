import { expect, test } from "@playwright/test";

import { openPrototype } from "./support/stay";

async function openIndexModule(page: import("@playwright/test").Page) {
  await openPrototype(page);
  await page
    .getByRole("button", { name: "切换到每万分兑换价值模块" })
    .click();
  await expect(page.getByRole("heading", { name: /StayWorth Index/ })).toBeVisible();
}

test("默认展示全球参考值，并带上区间、样本量与数据日期", async ({ page }) => {
  await openIndexModule(page);

  const section = page.locator("#index");
  await expect(section).toContainText("每万分兑换价值");
  await expect(section).toContainText("统一货币 CNY");
  await expect(section).toContainText("数据日期");

  const table = section.locator(".index-table");
  await expect(table).toContainText("全部品牌");
  // 表格里必须同时出现数值区间与口径说明，不能只给一个孤立数字。
  await expect(table).toContainText(/¥\s?[\d,]+\.\d{2}\s*-\s*¥\s?[\d,]+\.\d{2}/);
  await expect(section).toContainText(/先在城市内取中位数，\s*再跨城市取中位数/);
  await expect(section).toContainText("抽样估算");
});

test("可以切换到品牌档位与国家视图", async ({ page }) => {
  await openIndexModule(page);
  const section = page.locator("#index");
  const table = section.locator(".index-table");

  await section.getByRole("button", { name: /^品牌档位/ }).click();
  await expect(table).toContainText("Luxury");
  await expect(table).toContainText("Premium");
  await expect(table).toContainText("Select");
  await expect(table).toContainText("Longer Stays");
  await expect(table).toContainText("Collections");
  // 跨档品牌单独成行，且注明不参与档位对比。
  await expect(table).toContainText("单独列出");
  await expect(table).toContainText("不参与档位对比");

  await section.getByRole("button", { name: /^主要国家/ }).click();
  await expect(table).toContainText("中国");
  await expect(table).toContainText("日本");
  await expect(section).toContainText("国家视图使用各自当地货币");
});

test("切换统一货币会同时改变全球与档位视图的币种", async ({ page }) => {
  await openIndexModule(page);
  const section = page.locator("#index");

  await section.getByRole("button", { name: "USD", exact: true }).click();
  await expect(section).toContainText("统一货币 USD");

  await section.getByRole("button", { name: /^品牌档位/ }).click();
  await expect(section).toContainText("统一货币 USD");
});

test("说明汇率来源，并确认没有市场被排除在统一口径外", async ({ page }) => {
  await openIndexModule(page);
  const section = page.locator("#index");

  await expect(section).toContainText("open.er-api.com");
  await expect(section).toContainText("非实时");
  await expect(section).not.toContainText("因缺少汇率未计入");
  await expect(section).not.toContainText("兜底汇率表");

  const sourceLink = section.getByRole("link", { name: "来源" });
  await expect(sourceLink).toHaveAttribute("target", "_blank");
});

test("回血模块提供跳转到参考价值的入口", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换到积分回血模块" }).click();

  const entry = page.getByRole("button", { name: "查看每万分兑换价值" });
  await expect(entry).toBeVisible();
  await entry.click();

  await expect(
    page.getByRole("heading", { name: /StayWorth Index/ }),
  ).toBeVisible();
});

test("手机宽度下参考值模块不产生横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openIndexModule(page);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await expect(page.locator("#index .index-table")).toBeVisible();
});

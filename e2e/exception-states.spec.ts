import { expect, test, type Page } from "@playwright/test";
import {
  COVERED_CHECK_IN,
  COVERED_CHECK_OUT,
  fillCoveredStayDates,
  openPrototype,
  todayInAppTimeZone,
} from "./support/stay";

async function openSearch(page: Page) {
  await openPrototype(page);
}

test("暂无数据时不伪造价格，修改日期后可以恢复搜索", async ({ page }) => {
  await openSearch(page);

  await page.getByLabel("入住日期").fill("2099-01-01");
  await page.getByLabel("退房日期").fill("2099-01-02");
  await page.getByRole("button", { name: "搜索匹配酒店" }).click();

  const emptyState = page.getByRole("status").filter({ hasText: "暂无数据" });
  await expect(emptyState.getByRole("heading", { name: "暂无数据" })).toBeFocused();
  await expect(emptyState).toContainText("未覆盖范围不会返回伪造价格");
  await expect(
    page.getByRole("button", { name: /^选择.+进行比较$/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "并排比较" })).toBeDisabled();

  await page.getByLabel("入住日期").fill(COVERED_CHECK_IN);
  await page.getByLabel("退房日期").fill(COVERED_CHECK_OUT);
  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  await expect(
    page.getByRole("heading", { name: "香港 · 4 家酒店快照" }),
  ).toBeVisible();
});

test("已有结果后接口失败会清空旧数据，重试后恢复相同查询", async ({ page }) => {
  let requestCount = 0;
  let failNextRequest = false;
  await page.route("**/api/hotels?**", async (route) => {
    requestCount += 1;
    if (failNextRequest) {
      failNextRequest = false;
      await route.fulfill({
        body: JSON.stringify({
          status: "error",
          message: "数据暂时无法读取，请稍后重试。",
        }),
        contentType: "application/json",
        status: 503,
      });
      return;
    }
    await route.continue();
  });
  await openSearch(page);
  await fillCoveredStayDates(page);

  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  await expect(
    page.getByRole("heading", { name: "香港 · 4 家酒店快照" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "选择香港数码港艾美酒店进行比较" })
    .click();
  await page
    .getByRole("button", { name: "选择香港喜来登酒店进行比较" })
    .click();
  await page.getByRole("button", { name: "并排比较" }).click();
  await expect(
    page.getByRole("region", { name: "酒店并排比较" }),
  ).toBeVisible();

  failNextRequest = true;
  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  const errorState = page.getByRole("alert").filter({ hasText: "查询失败" });
  await expect(errorState.getByRole("heading", { name: "查询失败" })).toBeFocused();
  await expect(errorState).toContainText("数据暂时无法读取，请稍后重试。");
  await expect(
    page.getByRole("button", { name: /^选择.+进行比较$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "酒店并排比较" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "并排比较" })).toBeDisabled();

  await errorState.getByRole("button", { name: "重新查询" }).click();
  await expect(
    page.getByRole("heading", { name: "香港 · 4 家酒店快照" }),
  ).toBeVisible();
  expect(requestCount).toBe(3);
});

test("过期快照醒目标注但仍允许用户完成比较", async ({ page }) => {
  await openSearch(page);
  await fillCoveredStayDates(page);
  await page.getByRole("button", { name: "搜索匹配酒店" }).click();

  await expect(page.getByText(/数据已过期 · 更新于/)).toBeVisible();
  const warning = page.getByRole("note").filter({ hasText: "数据已过期" });
  await expect(warning).toContainText("请前往 Marriott 官方渠道重新核验");
  const cyberportCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "香港数码港艾美酒店" }),
  });
  await expect(cyberportCard).toContainText("用户提供的价格样例（日期为原型）");

  const cyberportButton = page.getByRole("button", {
    name: "选择香港数码港艾美酒店进行比较",
  });
  const sheratonButton = page.getByRole("button", {
    name: "选择香港喜来登酒店进行比较",
  });
  await cyberportButton.click();
  await sheratonButton.click();
  await page.getByRole("button", { name: "并排比较" }).click();

  const comparison = page.getByRole("region", { name: "酒店并排比较" });
  await expect(comparison.getByText("香港数码港艾美酒店")).toBeVisible();
  await expect(comparison.getByText("香港喜来登酒店")).toBeVisible();
});

test("默认入住日期在未来，未覆盖日期会给出可用快照日期", async ({ page }) => {
  await openSearch(page);

  const checkIn = await page.getByLabel("入住日期").inputValue();
  const checkOut = await page.getByLabel("退房日期").inputValue();
  expect(checkIn > todayInAppTimeZone()).toBe(true);
  expect(checkOut > checkIn).toBe(true);

  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  const emptyState = page.getByRole("status").filter({ hasText: "暂无数据" });
  await expect(emptyState).toContainText("目前只有 2026-08-15 至 2026-08-16");
  await expect(
    page.getByRole("button", { name: /^选择.+进行比较$/ }),
  ).toHaveCount(0);

  await emptyState
    .getByRole("button", { name: "用这段日期重新搜索" })
    .click();
  await expect(page.getByLabel("入住日期")).toHaveValue(COVERED_CHECK_IN);
  await expect(page.getByLabel("退房日期")).toHaveValue(COVERED_CHECK_OUT);
  await expect(
    page.getByRole("heading", { name: "香港 · 4 家酒店快照" }),
  ).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";

import { fillCoveredStayDates, openPrototype } from "./support/stay";

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

async function searchAndSelectTwoHotels(page: Page) {
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
}

test("桌面端点了并排比较就把比较表带进视野", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await openPrototype(page);
  await searchAndSelectTwoHotels(page);

  await page.getByRole("button", { name: "并排比较" }).click();

  const comparison = page.getByRole("region", { name: "酒店并排比较" });
  await expect(comparison).toBeVisible();
  // 只滚动必要距离，但标题不能藏在吸顶的功能层下面
  await expect(
    comparison.getByRole("heading", { name: "选择结果一览" }),
  ).toBeInViewport();
  await expect(comparison).toBeFocused();
});

test("手机端用右下角的悬浮按钮随时跳回比较结果", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await openPrototype(page);
  await searchAndSelectTwoHotels(page);

  const jump = page.locator(".comparison-jump-button");
  await expect(jump).toBeVisible();
  await expect(jump).toHaveAttribute("aria-label", /已选 2 家/);
  await expect
    .poll(async () =>
      jump.evaluate((button) => Math.round(button.getBoundingClientRect().height)),
    )
    .toBeGreaterThanOrEqual(44);

  await jump.click();

  const comparison = page.getByRole("region", { name: "酒店并排比较" });
  await expect(comparison).toBeVisible();
  await expect(
    comparison.getByRole("heading", { name: "选择结果一览" }),
  ).toBeInViewport();
  // 已经在比较结果里，悬浮按钮让位（没有可跳的地方）
  await expect(jump).toHaveCount(0);

  // 滚回列表后它再回来
  await page
    .getByRole("heading", { name: "香港 · 4 家酒店快照" })
    .scrollIntoViewIfNeeded();
  await expect(page.locator(".comparison-jump-button")).toBeVisible();
});

test("带入回血计算器落在「不计分金额」，且默认不带任何加成", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await openPrototype(page);
  await searchAndSelectTwoHotels(page);

  await page.getByRole("button", { name: "并排比较" }).click();
  await page
    .getByRole("region", { name: "酒店并排比较" })
    .getByRole("button", { name: "带入回血计算器" })
    .first()
    .click();

  const calculator = page.getByRole("region", { name: "积分回血计算器" });
  await expect(calculator).toBeVisible();

  const ineligibleSpend = calculator.getByLabel("不计分金额（CNY）");
  await expect(ineligibleSpend).toBeFocused();
  await expect(ineligibleSpend).toBeInViewport();
  // 落点是「不计分金额」，不是文档底部
  expect(
    await page.evaluate(
      () =>
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 4,
    ),
  ).toBe(false);

  // 会员等级与信用卡都从「没有额外加成」开始，选择权交给用户
  await expect(calculator.getByLabel("会员等级")).toHaveValue("Member");
  await expect(calculator.getByLabel("信用卡选择")).toHaveValue("none");
  // 参考汇率只保留两位小数
  await expect(calculator.getByLabel("1 美元约等于多少 CNY")).toHaveValue(
    /^\d+\.\d{2}$/,
  );
});

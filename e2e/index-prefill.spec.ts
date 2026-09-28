import { expect, test } from "@playwright/test";

import { openPrototype, searchCoveredHongKong } from "./support/stay";

/** 搜索 → 选酒店 → 带入回血计算器，回到计算器区域。 */
async function bringHotelIntoCalculator(page: import("@playwright/test").Page) {
  await searchCoveredHongKong(page);
  await page
    .getByRole("button", { name: "选择香港数码港艾美酒店进行比较" })
    .click();
  // 至少选两家才能打开并排比较
  await page
    .getByRole("button", { name: "选择香港喜来登酒店进行比较" })
    .click();
  await page
    .getByRole("button", { name: "并排比较" })
    .click();
  const comparison = page.getByRole("region", { name: "酒店并排比较" });
  await expect(comparison.getByText("香港数码港艾美酒店")).toBeVisible();
  await page
    .locator("article")
    .filter({ hasText: "香港数码港艾美酒店" })
    .getByRole("button", { name: "带入回血计算器" })
    .click();
  return page.getByRole("region", { name: "积分回血计算器" });
}

test("带入酒店后显示市场参考中位数，并标明用的是城市口径", async ({ page }) => {
  const calculator = await bringHotelIntoCalculator(page);
  const reference = calculator.locator(".market-reference");

  await expect(reference).toBeVisible();
  await expect(reference).toContainText("市场参考中位数");
  await expect(reference).toContainText("城市口径");
  await expect(reference).toContainText("口径范围：香港");
  await expect(reference).toContainText(/样本\s*\d+\s*家/);
  await expect(reference).toContainText("数据日期");

  // 措辞必须说清这是市场参考，而不是这家酒店自己的兑换价值
  await expect(reference).toContainText("不是这家酒店的兑换价值");
  await expect(reference).toContainText("是否采用由你决定");
});

test("用户点按钮才写入参考值，不覆盖已经填好的数字", async ({ page }) => {
  const calculator = await bringHotelIntoCalculator(page);
  const reference = calculator.locator(".market-reference");
  // 用 role 精确定位输入框：结算币种下拉的说明里也含「每万分兑换价值」
  const input = calculator.getByRole("spinbutton", { name: /^每万分兑换价值/ });

  // 带入时不应该已经覆盖用户的值
  const before = await input.inputValue();
  await expect(reference).toBeVisible();
  expect(await input.inputValue()).toBe(before);

  await input.fill("12");
  await expect(input).toHaveValue("12");

  await reference.getByRole("button", { name: "使用市场参考值" }).click();
  const after = await input.inputValue();
  expect(after).not.toBe("12");
  expect(Number(after)).toBeGreaterThan(0);
});

test("手动填写时不给市场参考值，避免给出与处境无关的数字", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换到积分回血模块" }).click();

  const calculator = page.getByRole("region", { name: "积分回血计算器" });
  await expect(calculator).toBeVisible();
  await expect(calculator.locator(".market-reference")).toHaveCount(0);
});

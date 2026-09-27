import { expect, test } from "@playwright/test";
import { searchCoveredHongKong } from "./support/stay";

test("默认按兑换价值排名并标出同批最高的一家", async ({ page }) => {
  await searchCoveredHongKong(page);

  const group = page.getByRole("group", { name: "排序口径" });
  await expect(group.getByRole("radio", { name: "兑换价值最高" })).toBeChecked();
  await expect(group).toContainText("价值越高");
  await expect(
    page.getByText(/排名只针对本次返回的快照，不含税费、库存和会员优惠/),
  ).toBeVisible();
  await expect(page.getByText(/当前共比较 4 家/)).toBeVisible();

  const cards = page.locator(".hotel-grid article");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText("香港 JW 万豪酒店");
  await expect(cards.nth(0)).toContainText("#1");
  await expect(cards.nth(1)).toContainText("香港万怡酒店");
  await expect(cards.nth(1)).toContainText("#2");
  await expect(cards.nth(2)).toContainText("香港喜来登酒店");
  await expect(cards.nth(2)).toContainText("#2");
  await expect(cards.nth(3)).toContainText("香港数码港艾美酒店");
  await expect(cards.nth(3)).toContainText("#4");
});

test("切换排序口径会更新名次，但不清空已选酒店", async ({ page }) => {
  await searchCoveredHongKong(page);

  const group = page.getByRole("group", { name: "排序口径" });
  const cards = page.locator(".hotel-grid article");
  const cyberportButton = page.getByRole("button", {
    name: "选择香港数码港艾美酒店进行比较",
  });
  await cyberportButton.click();
  await expect(cyberportButton).toHaveAttribute("aria-pressed", "true");

  await group.getByRole("radio", { name: "现金价最低" }).check();
  await expect(group).toContainText("现金总价从低到高");
  await expect(cards.nth(0)).toContainText("香港万怡酒店");
  await expect(cards.nth(0)).toContainText("#1");
  await expect(cards.nth(1)).toContainText("香港数码港艾美酒店");
  await expect(cyberportButton).toHaveAttribute("aria-pressed", "true");

  await group.getByRole("radio", { name: "所需积分最少" }).check();
  await expect(group).toContainText("积分总价从少到多");
  await expect(cards.nth(0)).toContainText("香港万怡酒店");
  await expect(cards.nth(3)).toContainText("香港 JW 万豪酒店");
  await expect(cards.nth(3)).toContainText("#4");
});

test("手机宽度下排名控件可键盘切换且页面不溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await searchCoveredHongKong(page);

  const group = page.getByRole("group", { name: "排序口径" });
  await group.getByRole("radio", { name: "兑换价值最高" }).focus();
  await page.keyboard.press("ArrowRight");
  const cashOption = group.getByRole("radio", { name: "现金价最低" });
  await expect(cashOption).toBeChecked();
  await expect(cashOption).toBeFocused();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const optionHeight = await cashOption
    .locator("xpath=ancestor::label[1]")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(optionHeight).toBeGreaterThanOrEqual(44);
});

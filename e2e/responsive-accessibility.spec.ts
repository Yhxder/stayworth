import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectSingleColumn(locator: Locator) {
  const columnCount = await locator.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").length,
  );

  expect(columnCount).toBe(1);
}

async function tabAcrossNativeDateSegments(
  page: Page,
  current: Locator,
  target: Locator,
  maxTabs = 5,
) {
  for (let attempt = 0; attempt < maxTabs; attempt += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await expect(current).toBeFocused();
  }

  await expect(target).toBeFocused();
}

test("手机宽度保持单列，比较表只在自身内部横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expectSingleColumn(page.locator(".search-form"));
  await expectNoPageOverflow(page);

  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  await expect(
    page.getByRole("heading", { name: "香港 · 4 家酒店快照" }),
  ).toBeVisible();
  await expectSingleColumn(page.locator(".hotel-grid"));

  const firstSelectButton = page.getByRole("button", {
    name: "选择香港数码港艾美酒店进行比较",
  });
  await expect
    .poll(async () =>
      firstSelectButton.evaluate((button) => button.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(44);

  await firstSelectButton.click();
  await page
    .getByRole("button", { name: "选择香港喜来登酒店进行比较" })
    .click();
  await page.getByRole("button", { name: "并排比较" }).click();

  const comparisonColumns = page.locator(".comparison-columns");
  const comparisonWidths = await comparisonColumns.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(comparisonWidths.scrollWidth).toBeGreaterThan(comparisonWidths.clientWidth);
  const useForRebateButton = page
    .getByRole("region", { name: "酒店并排比较" })
    .getByRole("button", { name: "带入回血计算器" })
    .first();
  await expect
    .poll(async () =>
      useForRebateButton.evaluate(
        (button) => button.getBoundingClientRect().height,
      ),
    )
    .toBeGreaterThanOrEqual(44);
  await expectNoPageOverflow(page);

  await page.getByRole("button", { name: "切换到积分回血模块" }).click();
  await expectSingleColumn(page.locator(".field-grid").first());
  await expectNoPageOverflow(page);
});

test("平板宽度使用两列并且页面没有横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const searchColumnCount = await page.locator(".search-form").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").length,
  );
  expect(searchColumnCount).toBe(2);

  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  const hotelColumnCount = await page.locator(".hotel-grid").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").length,
  );
  expect(hotelColumnCount).toBe(2);
  await expectNoPageOverflow(page);
});

test("纯键盘可以按阅读顺序搜索并选择酒店", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const initialFocusOrder = [
    page.getByRole("link", { name: "StayWorth 首页" }),
    page.getByRole("button", { name: "切换到酒店对比模块" }),
    page.getByRole("button", { name: "切换到积分回血模块" }),
    page.getByLabel("城市或目的地"),
    page.getByLabel("入住日期"),
  ];

  for (const control of initialFocusOrder) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
  }

  const checkInInput = initialFocusOrder.at(-1)!;
  const checkOutInput = page.getByLabel("退房日期");
  const tierSelect = page.getByLabel("品牌层级");
  const searchButton = page.getByRole("button", { name: "搜索匹配酒店" });
  await tabAcrossNativeDateSegments(page, checkInInput, checkOutInput);
  await tabAcrossNativeDateSegments(page, checkOutInput, tierSelect);
  await page.keyboard.press("Tab");
  await expect(searchButton).toBeFocused();

  const focusOutline = await searchButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(focusOutline.style).toBe("solid");
  expect(Number.parseFloat(focusOutline.width)).toBeGreaterThanOrEqual(3);

  await page.keyboard.press("Enter");
  const resultsHeading = page.getByRole("heading", {
    name: "香港 · 4 家酒店快照",
  });
  await expect(resultsHeading).toBeVisible();
  await expect(resultsHeading).toBeFocused();
  const resultsHeadingOutline = await resultsHeading.evaluate((element) =>
    getComputedStyle(element).outlineWidth,
  );
  expect(Number.parseFloat(resultsHeadingOutline)).toBeGreaterThanOrEqual(3);

  await page.keyboard.press("Tab");
  const firstHotelButton = page
    .getByRole("button", { name: /^选择.+进行比较$/ })
    .first();
  await expect(firstHotelButton).toBeFocused();
  await page.keyboard.press("Space");
  await expect(firstHotelButton).toHaveAttribute("aria-pressed", "true");
});

test("搜索与计算器错误会标记并关联到具体字段", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const cityInput = page.getByLabel("城市或目的地");
  await cityInput.fill("");
  const cityError = page.getByRole("alert").filter({
    hasText: "请输入城市或目的地。",
  });
  await expect(cityError).toBeVisible();
  await expect(cityInput).toHaveAttribute("aria-invalid", "true");
  await expect(cityInput).toHaveAttribute(
    "aria-describedby",
    /search-validation-error/,
  );

  await cityInput.fill("香港");
  const checkInInput = page.getByLabel("入住日期");
  await checkInInput.fill("");
  await expect(
    page.getByRole("alert").filter({ hasText: "请选择入住日期。" }),
  ).toBeVisible();
  await expect(checkInInput).toHaveAttribute("aria-invalid", "true");
  await expect(checkInInput).toHaveAttribute(
    "aria-describedby",
    "search-validation-error",
  );

  await checkInInput.fill("2026-08-15");
  const checkOutInput = page.getByLabel("退房日期");
  await checkOutInput.fill("2026-08-15");
  await expect(
    page.getByRole("alert").filter({
      hasText: "退房日期必须晚于入住日期。",
    }),
  ).toBeVisible();
  await expect(checkOutInput).toHaveAttribute("aria-invalid", "true");
  await expect(checkOutInput).toHaveAttribute(
    "aria-describedby",
    "search-validation-error",
  );

  await page.getByRole("button", { name: "切换到积分回血模块" }).click();
  const cashPriceInput = page.getByLabel("现金总价（CNY）");
  const nightsInput = page.getByLabel("入住晚数");
  await cashPriceInput.fill("");
  const calculatorError = page.getByRole("alert").filter({
    hasText: "暂时无法计算",
  });
  await expect(calculatorError).toContainText("请输入大于 0 的现金总价。");
  await expect(cashPriceInput).toHaveAttribute("aria-invalid", "true");
  await expect(cashPriceInput).toHaveAttribute(
    "aria-describedby",
    "calculator-validation-error",
  );
  await expect(nightsInput).not.toHaveAttribute("aria-invalid", "true");

  await cashPriceInput.fill("1235");
  await expect(cashPriceInput).not.toHaveAttribute("aria-invalid", "true");
  await nightsInput.fill("");
  await expect(calculatorError).toContainText("请输入大于 0 的整数晚数。");
  await expect(nightsInput).toHaveAttribute("aria-invalid", "true");
  await expect(nightsInput).toHaveAttribute(
    "aria-describedby",
    "calculator-validation-error",
  );

  await nightsInput.fill("1");
  await expect(nightsInput).not.toHaveAttribute("aria-invalid", "true");
  await expect(calculatorError).not.toBeVisible();
});

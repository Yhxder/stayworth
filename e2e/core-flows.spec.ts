import { expect, test } from "@playwright/test";

test("搜索、比较酒店并把现金入住方案带入回血计算器", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  await expect(
    page.getByRole("heading", { name: "香港 · 4 家酒店快照" }),
  ).toBeVisible();

  const cyberportButton = page.getByRole("button", {
    name: "选择香港数码港艾美酒店进行比较",
  });
  const sheratonButton = page.getByRole("button", {
    name: "选择香港喜来登酒店进行比较",
  });

  await cyberportButton.click();
  await sheratonButton.click();
  await expect(cyberportButton).toHaveAttribute("aria-pressed", "true");
  await expect(sheratonButton).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "并排比较" }).click();
  const comparison = page.getByRole("region", { name: "酒店并排比较" });
  await expect(comparison.getByText("香港数码港艾美酒店")).toBeVisible();
  await expect(comparison.getByText("香港喜来登酒店")).toBeVisible();

  const cyberportComparison = comparison
    .locator("article")
    .filter({ hasText: "香港数码港艾美酒店" });
  await cyberportComparison
    .getByRole("button", { name: "带入回血计算器" })
    .click();

  const calculator = page.getByRole("region", { name: "积分回血计算器" });
  await expect(calculator).toBeVisible();
  await expect(
    calculator.getByText("已带入：香港数码港艾美酒店"),
  ).toBeVisible();
  await expect(calculator.getByLabel("结算币种")).toHaveValue("CNY");
  await expect(calculator.getByLabel("现金总价（CNY）")).toHaveValue("1235");
  await expect(calculator.getByLabel("不计分金额（CNY）")).toHaveValue("");
  await expect(calculator.getByLabel("入住晚数")).toHaveValue("1");
  await expect(calculator.getByLabel("酒店品牌")).toHaveValue("le-meridien");
  await expect(calculator.getByText("暂时无法计算")).toBeVisible();
});

test("完成固定案例的积分回血计算并核对关键结果", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const rebateModuleButton = page.getByRole("button", {
    name: "切换到积分回血模块",
  });
  await rebateModuleButton.click();
  await expect(rebateModuleButton).toHaveAttribute("aria-pressed", "true");

  const calculator = page.getByRole("region", { name: "积分回血计算器" });
  await calculator.getByLabel("现金总价（CNY）").fill("1235");
  await calculator.getByLabel("不计分金额（CNY）").fill("235");
  await calculator.getByLabel("入住晚数").fill("1");
  await calculator.getByLabel("1 美元约等于多少 CNY").fill("7.2");
  await calculator.getByLabel("酒店品牌").selectOption("le-meridien");
  await calculator.getByLabel("会员等级").selectOption("Platinum");
  await calculator
    .getByLabel("信用卡选择")
    .selectOption("us-amex-brilliant");
  await calculator.getByLabel("欢迎积分").fill("1000");
  await calculator.getByLabel("额外活动积分").fill("0");
  await calculator.getByLabel("每万分价值（CNY）").fill("400");

  const result = page.getByRole("complementary", {
    name: "积分回血计算结果",
  });
  await expect(
    result.getByLabel("预计有效入住成本金额：¥1,070.48"),
  ).toHaveText("¥1,070.48");
  await expect(result.getByText("¥1,000.00", { exact: true })).toBeVisible();
  await expect(result.getByText("4,113 分", { exact: true })).toBeVisible();
  await expect(result.getByText("13.32%", { exact: true })).toBeVisible();
  await expect(result).toContainText("积分回血 ¥164.52");
});

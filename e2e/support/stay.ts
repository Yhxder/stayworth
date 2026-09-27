import { expect, type Page } from "@playwright/test";

/** The only stay window that current D1 snapshots cover. */
export const COVERED_CHECK_IN = "2026-08-15";
export const COVERED_CHECK_OUT = "2026-08-16";

export function todayInAppTimeZone() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date());
}

export async function openPrototype(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

export async function fillCoveredStayDates(page: Page) {
  await page.getByLabel("入住日期").fill(COVERED_CHECK_IN);
  await page.getByLabel("退房日期").fill(COVERED_CHECK_OUT);
}

export async function searchCoveredHongKong(page: Page) {
  await openPrototype(page);
  await fillCoveredStayDates(page);
  await page.getByRole("button", { name: "搜索匹配酒店" }).click();
  await expect(
    page.getByRole("heading", { name: "香港 · 4 家酒店快照" }),
  ).toBeVisible();
}

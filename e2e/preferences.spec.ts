import { expect, test, type Page } from "@playwright/test";

import { openPrototype } from "./support/stay";

/** Chromium 专有的 prefers-reduced-transparency 只能通过 CDP 打开。 */
async function setEmulatedMedia(
  page: Page,
  features: Array<{ name: string; value: string }>,
) {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setEmulatedMedia", { features });
}

/**
 * 自定义属性会把 light-dark(...) 原样返回，所以这里读真正用到的画布颜色。
 */
function canvasColor(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test("跟随系统是默认状态，显式选择会写进 data-theme 并在刷新后保持", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openPrototype(page);

  // 默认不写 data-theme，由 color-scheme 跟随系统
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  expect(await canvasColor(page)).toBe("rgb(8, 9, 12)");

  await page.getByRole("button", { name: "浅色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await canvasColor(page)).toBe("rgb(244, 245, 247)");

  await page.reload();
  await page.waitForLoadState("networkidle");
  // 内联脚本在首屏前就写好属性，所以刷新后仍是浅色
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "浅色" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "跟随系统" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  expect(await canvasColor(page)).toBe("rgb(8, 9, 12)");
});

test("降低透明度时功能层玻璃退回不透明表面", async ({ page }) => {
  await openPrototype(page);

  const before = await page
    .locator(".site-header")
    .evaluate((element) => getComputedStyle(element).backdropFilter);
  expect(before).toContain("blur");

  await setEmulatedMedia(page, [
    { name: "prefers-reduced-transparency", value: "reduce" },
  ]);

  const header = await page
    .locator(".site-header")
    .evaluate((element) => getComputedStyle(element).backdropFilter);
  const tray = await page
    .locator(".comparison-tray")
    .evaluate((element) => getComputedStyle(element).backdropFilter);

  expect(header).toBe("none");
  expect(tray).toBe("none");
});

test("提高对比度时描边与次级文字一并加强", async ({ page }) => {
  await openPrototype(page);
  const secondaryBefore = await page.evaluate(() =>
    getComputedStyle(
      document.querySelector(".ranking-scope") ?? document.body,
    ).color,
  );

  await page.emulateMedia({ contrast: "more" });

  const [primary, secondary, cardBorder] = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const card = document.querySelector(".module-panel");
    return [
      root.getPropertyValue("--label-primary").trim(),
      root.getPropertyValue("--label-secondary").trim(),
      card ? getComputedStyle(card).borderTopWidth : "",
    ];
  });

  expect(secondary).toBe(primary);
  expect(secondaryBefore).not.toBe("");
  expect(cardBorder).toBe("2px");
});

test("降低动态效果时不保留位移与形变动画", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrototype(page);

  const transition = await page
    .locator(".primary-button")
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transition)).toBeLessThan(0.01);

  // 悬停也不做位移：形变与位移在降低动效时一律取消
  const hoverTarget = page.getByRole("button", { name: "切换到积分回血模块" });
  await hoverTarget.hover();
  expect(
    await hoverTarget.evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
});

test("键盘焦点环在浅色与深色下都清晰可见", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPrototype(page);

  const button = page.getByRole("button", { name: "搜索匹配酒店" });
  for (const scheme of ["light", "dark"] as const) {
    await page.getByRole("button", { name: scheme === "dark" ? "深色" : "浅色" }).click();
    // 程序化 focus 不触发 :focus-visible，所以用键盘 Tab 走到目标
    // 原生日期控件内部有多个 Tab 停靠点，多给一些步数
    for (let step = 0; step < 24; step += 1) {
      await page.keyboard.press("Tab");
      if (await button.evaluate((element) => element === document.activeElement)) {
        break;
      }
    }
    await expect(button).toBeFocused();
    const ring = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        offset: style.outlineOffset,
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
      };
    });

    expect(ring.style).toBe("solid");
    expect(ring.width).toBeGreaterThanOrEqual(3);
    expect(ring.offset).toBe("2px");
  }
});

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readTree(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      readTree(path, files);
    } else if (/\.(tsx?|css)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

const appFiles = readTree("app");

function appSource() {
  return appFiles.map((file) => readFileSync(file, "utf8")).join("\n");
}

test("uses one name for the metric everywhere, including aria labels", () => {
  const source = appSource();
  const readme = readFileSync("README.md", "utf8");

  for (const [name, text] of [
    ["app", source],
    ["README", readme],
  ]) {
    assert.doesNotMatch(text, /每万分参考价值/, `${name} 仍然出现旧指标名`);
    assert.doesNotMatch(text, /每万分价值(?!兑换)/, `${name} 仍然出现不完整指标名`);
  }

  assert.match(source, /每万分兑换价值/);
  // 市场口径的词保留：它说明的是市场水平而不是某家酒店
  assert.match(source, /市场参考中位数/);
});

test("defines light and dark tokens for every semantic role", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const roles = [
    "surface-canvas",
    "surface-raised",
    "surface-sunken",
    "surface-overlay",
    "label-primary",
    "label-secondary",
    "label-tertiary",
    "accent-text",
    "accent-fill",
    "ink-on-accent",
    "alert",
  ];

  for (const role of roles) {
    assert.match(css, new RegExp(`--${role}:`), `${role} 缺少 token 定义`);
  }

  // 浅深两套值成对给，且由 color-scheme 决定取哪一套
  assert.match(css, /color-scheme:\s*light dark/);
  assert.match(css, /light-dark\(/);
});

test("answers every system accessibility setting", () => {
  const css = readFileSync("app/globals.css", "utf8");

  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  // 降低动效时不保留位移与形变
  const reducedMotion = css.slice(
    css.indexOf("@media (prefers-reduced-motion: reduce)"),
  );
  assert.match(reducedMotion, /transform: none/);

  // 焦点环在两种底色上都可见：描边 + 偏移 + 内晕
  assert.match(css, /outline:\s*3px solid var\(--accent-text\)/);
  assert.match(css, /outline-offset:\s*2px/);
  assert.match(css, /box-shadow:\s*0 0 0 1px var\(--surface-canvas\)/);
});

test("serves every hotel image through the site proxy", () => {
  const source = appSource();

  // 前端代码里不允许出现第三方图片主机
  assert.doesNotMatch(source, /cache\.marriott\.com|marriott\.com\.cn\/content\/dam/);
  assert.match(source, /imagePath/);

  // 代理层有主机白名单与缓存策略
  const proxy = readFileSync("worker/media-proxy.ts", "utf8");
  assert.match(proxy, /ALLOWED_HOSTS/);
  assert.match(proxy, /cache-control/);
  assert.match(proxy, /ALLOWED_WIDTHS/);

  // 前端按档位请求，并区分首屏与懒加载
  const image = readFileSync("app/components/search/HotelImage.tsx", "utf8");
  assert.match(image, /srcSet=/);
  assert.match(image, /sizes=/);
  assert.match(image, /loading=\{priority \? "eager" : "lazy"\}/);
  assert.match(image, /hotel-photo-skeleton/);
  assert.match(image, /hotel-photo-fallback/);
});

test("removes engineering placeholder copy from the interface", () => {
  const source = appSource();
  assert.doesNotMatch(source, /PROTOTYPE FIXTURE|prototype fixture/i);
  assert.doesNotMatch(source, /lorem ipsum/i);

  // 数据层里的旧标签由迁移改名，不留工程措辞
  const migration = readFileSync("drizzle/0004_relabel_fixture_sources.sql", "utf8");
  assert.match(migration, /示例价格快照（人工维护）/);
});

test("keeps touch targets at the platform minimum", () => {
  const css = readFileSync("app/globals.css", "utf8");

  function minHeight(selector) {
    const block = css.match(
      new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, "s"),
    )?.[1];
    assert.ok(block, `${selector} 缺少样式块`);
    const value = block.match(/min-height:\s*(\d+)px/)?.[1];
    assert.ok(value, `${selector} 没有声明 min-height`);
    return Number(value);
  }

  // 移动端的主要操作：44×44 以上
  for (const selector of [
    ".primary-button",
    ".select-button",
    ".use-rebate-button",
    ".index-tabs button",
    ".ranking-options label",
    ".field-control",
  ]) {
    const height = minHeight(selector);
    assert.ok(height >= 44, `${selector} 的触控目标只有 ${height}px`);
  }

  // 桌面上的次要控件：28×28 以上
  for (const selector of [".theme-toggle button", ".index-currency button", ".text-button"]) {
    const height = minHeight(selector);
    assert.ok(height >= 28, `${selector} 的触控目标只有 ${height}px`);
  }
});

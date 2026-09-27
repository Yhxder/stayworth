import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(file) {
  return readFileSync(file, "utf8");
}

test("keeps the release disclosures visible in the interface source", () => {
  const component = read("app/components/trust/TrustAndSources.tsx");

  assert.match(component, /数据来源与时效/);
  assert.match(component, /不是实时库存/);
  assert.match(component, /隐私/);
  assert.match(component, /不会上传或保存到服务器/);
  assert.match(component, /独立项目声明/);
  assert.match(component, /没有隶属、赞助或背书关系/);
  assert.doesNotMatch(component, /TODO|待补/);

  const page = read("app/page.tsx");
  assert.match(page, /<TrustAndSources\s*\/>/);
});

test("keeps Next.js outside the advisories that blocked the release", () => {
  const packageJson = JSON.parse(read("package.json"));
  const declaredVersion = packageJson.dependencies.next.replace(/^[^\d]*/, "");
  const [major, minor, patch] = declaredVersion.split(".").map(Number);

  // 16.0.0 - 16.3.2 are affected by the RCE advisories fixed in 16.3.3.
  assert.ok(
    major > 16 ||
      (major === 16 && (minor > 3 || (minor === 3 && patch >= 3))),
    `next ${packageJson.dependencies.next} should be at or above 16.3.3`,
  );
  assert.equal(
    packageJson.devDependencies["eslint-config-next"],
    packageJson.dependencies.next,
    "eslint-config-next should stay on the same version as next",
  );
});

test("runs lint, unit tests, and browser tests in GitHub Actions", () => {
  const workflowPath = ".github/workflows/ci.yml";
  assert.equal(existsSync(workflowPath), true, `${workflowPath} should exist`);

  const workflow = read(workflowPath);
  assert.match(workflow, /^on:/m);
  assert.match(workflow, /pull_request/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npx playwright install --with-deps chromium/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run test:e2e/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});

test("describes the shipped scope without overstating the roadmap", () => {
  const readme = read("README.md");

  assert.match(readme, /Data Sources, Privacy, and Independence/);
  assert.match(readme, /Rank hotels by redemption value \| ⬜/);
  assert.match(readme, /GitHub Actions/);
  assert.match(readme, /not affiliated with/i);
});

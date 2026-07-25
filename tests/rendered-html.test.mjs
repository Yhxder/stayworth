import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the StayWorth low-fidelity prototype", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>StayWorth \| Marriott Points Decision Tool<\/title>/i);
  assert.match(html, /酒店对比/);
  assert.match(html, /积分回血/);
  assert.match(html, /城市或目的地/);
  assert.match(html, /入住日期/);
  assert.match(html, /退房日期/);
  assert.match(html, /品牌层级/);
  assert.match(html, /香港数码港艾美酒店/);
  assert.match(html, /37,000/);
  assert.match(html, /1,235/);
  assert.match(html, /333\.78/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("prototype includes accessible controls for the two main workflows", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /aria-label="切换到酒店对比模块"/);
  assert.match(html, /aria-label="切换到积分回血模块"/);
  assert.match(html, /aria-label="搜索匹配酒店"/);
  assert.match(html, /aria-label="选择香港数码港艾美酒店进行比较"/);
});

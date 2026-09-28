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

test("server-renders the StayWorth decision home page", async () => {
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
  assert.match(html, /酒店品牌/);
  assert.match(html, /Le Méridien/);
  assert.match(html, /系统自动应用[\s\S]{0,40}10(?:<!-- -->)?×/);
  assert.match(html, /1,235/);
  assert.match(html, /当前支持香港/);
  assert.match(html, /上海/);
  assert.match(html, /不是实时库存/);
  assert.match(html, /结算币种/);
  assert.match(html, /不计分金额/);
  assert.match(html, /入住晚数/);
  assert.match(html, /参考汇率日期：/);
  // 汇率来自每日抓取的快照，日期会随发布变化，这里只要求出现一个合法日期
  assert.match(html, /参考汇率日期：<!-- -->\d{4}-\d{2}-\d{2}/);
  assert.match(html, /信用卡选择/);
  assert.match(html, /🇨🇳 中信银行万豪旅享家联名信用卡金卡/);
  assert.match(html, /🇺🇸 Marriott Bonvoy Brilliant/);
  assert.match(html, /🇨🇦 Marriott Bonvoy.*American Express/);
  assert.match(html, /信用卡积分按发卡国家的计分币种换算/);
  assert.doesNotMatch(html, /信用卡倍率（Brilliant 为 6×）/);
  assert.match(html, /每晚有效成本/);
  assert.match(html, /回血比例/);
  assert.match(html, /积分回血不是现金退款/);
  assert.match(html, /aria-label="积分回血计算结果"/);
  assert.match(html, /aria-label="预计有效入住成本金额：¥1,061\.60"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /raw\.githubusercontent\.com\/Yhxder\/stayworth\/main\/public\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("server-renders the hero, the booking panel and the material split", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /class="hero"/);
  assert.match(html, /哪个更值/);
  assert.match(html, /StayWorth Index/);
  // 功能层玻璃只出现在吸顶栏与比较托盘
  assert.match(html, /class="glass-functional fluid-edge site-header"/);
  assert.match(html, /class="comparison-tray fluid-edge glass-functional"/);
  // 内容层是标准材料，旧版的玻璃类必须彻底消失
  assert.match(html, /class="surface-panel booking-panel"/);
  assert.doesNotMatch(html, /liquid-panel|liquid-card|liquid-quiet|liquid-edge/);
  // 外观三态入口在页头，且不靠颜色表达状态
  assert.match(html, /aria-label="外观"/);
  assert.match(html, /跟随系统/);
  assert.match(html, /stayworth-theme/);
  assert.match(html, /name="theme-color"/);
  assert.match(html, /出行人数/);
  assert.match(html, /使用万豪旅享家 Bonvoy 积分（Points）兑换/);
  assert.match(html, /role="switch"/);
  // 预订面板的行程字段与结果区共用同一份筛选条件，默认日期在服务端就已算好
  assert.match(html, /id="booking-check-in" type="date" value="\d{4}-\d{2}-\d{2}"/);
  assert.match(html, /id="booking-check-out" type="date" value="\d{4}-\d{2}-\d{2}"/);
});

test("prototype includes accessible controls for the two main workflows", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /aria-label="切换到酒店对比模块"/);
  assert.match(html, /aria-label="切换到积分回血模块"/);
  assert.match(html, /aria-label="搜索匹配酒店"/);
  assert.match(html, /aria-label="搜索匹配酒店"/);
});

test("server-renders the data-source, privacy, and independence notices", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /数据来源、隐私与独立声明/);
  assert.match(html, /数据来源与时效/);
  assert.match(html, /不是实时库存/);
  assert.match(html, /隐私/);
  assert.match(html, /不会上传或保存到服务器/);
  assert.match(html, /独立项目声明/);
  assert.match(html, /没有隶属、赞助或背书关系/);
  assert.match(html, /不构成预订、兑换、税务或财务建议/);
  assert.match(html, /open\.er-api\.com/);
});

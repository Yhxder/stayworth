"use client";

import { useState, useSyncExternalStore } from "react";

import summaryJson from "../../data/index-summary.json";

type IndexRow = {
  key: string;
  label: string;
  currencyCode: string;
  value: number | null;
  p25: number | null;
  p75: number | null;
  sampleCount: number;
  cityCount: number;
};

type IndexView = {
  id: string;
  currencyCode: string | null;
  rows: IndexRow[];
  sampleCount: number;
  cityCount: number;
  exclusions: Array<{ currencyCode: string; sampleCount: number }>;
};

type IndexSummary = {
  generatedAt: string;
  runKey: string;
  window: { daysAhead: number; nights: number };
  panelVersion: string;
  sampleCount: number;
  cityCount: number;
  currency: {
    display: string;
    options: string[];
    base?: string;
    referenceDate: string;
    sourceName: string;
    sourceUrl: string;
    nonRealTime: boolean;
    usedFallback?: boolean;
  };
  views: {
    byCurrency: Record<string, { global: IndexView; tier: IndexView }>;
    country: IndexView;
  };
  separateBrands: Array<{
    code: string;
    nameEn: string;
    reason: string;
    sampleCount: number;
    cityCount: number;
  }>;
  note: string;
};

const summary = summaryJson as unknown as IndexSummary;

type ViewId = "global" | "tier" | "country";

const VIEW_LABELS: Array<{ id: ViewId; label: string; hint: string }> = [
  { id: "global", label: "全球口径", hint: "不区分品牌档位与国家" },
  { id: "tier", label: "品牌档位", hint: "五档分层，另列单独品牌" },
  { id: "country", label: "主要国家", hint: "按当地货币呈现" },
];

const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

const noopSubscribe = () => () => {};

/** 服务器渲染时一律按「未过期」输出，挂载后再按真实时间判断，避免水合不一致。 */
function isStale(generatedAt: string): boolean {
  const generated = Date.parse(generatedAt);
  if (Number.isNaN(generated)) return false;
  return Date.now() - generated > STALE_AFTER_MS;
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null) return "样本不足";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRange(p25: number | null, p75: number | null, currency: string): string {
  if (p25 === null || p75 === null) return "-";
  return `${formatMoney(p25, currency)} - ${formatMoney(p75, currency)}`;
}

export function IndexSection({ hidden }: { hidden: boolean }) {
  const [viewId, setViewId] = useState<ViewId>("global");
  const [currency, setCurrency] = useState(summary.currency.display);
  const stale = useSyncExternalStore(
    noopSubscribe,
    () => isStale(summary.generatedAt),
    () => false,
  );

  const currencyViews =
    summary.views.byCurrency[currency] ?? summary.views.byCurrency[summary.currency.display];
  const activeView: IndexView =
    viewId === "country" ? summary.views.country : currencyViews[viewId];
  const displayCurrency = activeView.currencyCode ?? null;

  return (
    <section
      aria-labelledby="index-title"
      className="index-section"
      hidden={hidden}
      id="index"
    >
      <div className="section-heading">
        <div>
          <h2 id="index-title">StayWorth Index · 每万分兑换价值</h2>
        </div>
        <p>
          每日抽样 {summary.cityCount} 个城市、{summary.sampleCount} 家酒店，
          用含税现金价与同期积分兑换价估算 10,000 积分的兑换价值。
        </p>
      </div>

      {stale ? (
        <p className="index-stale" role="status">
          这批参考数据可能已过期：最近一次采样是 {summary.runKey}，已超过 48 小时。
        </p>
      ) : null}

      <div className="index-controls">
        <div className="index-tabs" role="group" aria-label="切换市场参考视图">
          {VIEW_LABELS.map((option) => (
            <button
              aria-pressed={viewId === option.id}
              className={viewId === option.id ? "is-active" : ""}
              key={option.id}
              onClick={() => setViewId(option.id)}
              type="button"
            >
              <span>{option.label}</span>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>

        {viewId === "country" ? (
          <p className="index-currency-note">
            国家视图使用各自当地货币，不做换算。
          </p>
        ) : (
          <div className="index-currency" role="group" aria-label="切换统一货币">
            <span>统一货币</span>
            {summary.currency.options.map((option) => (
              <button
                aria-pressed={currency === option}
                className={currency === option ? "is-active" : ""}
                key={option}
                onClick={() => setCurrency(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="index-table-scroll">
      <table className="index-table">
        <caption className="index-caption">
          {VIEW_LABELS.find((option) => option.id === viewId)?.label}
          {displayCurrency ? `（统一货币 ${displayCurrency}）` : "（当地货币）"}
          ，数据日期 {summary.runKey}
        </caption>
        <thead>
          <tr>
            <th scope="col">分组</th>
            <th scope="col">每万分兑换价值</th>
            <th scope="col">P25 - P75</th>
            <th scope="col">样本</th>
            <th scope="col">城市</th>
          </tr>
        </thead>
        <tbody>
          {activeView.rows.map((row) => (
            <tr
              className={row.key === "separate" ? "is-separate" : undefined}
              key={row.key}
            >
              <th scope="row">
                {row.label}
                {row.key === "separate" ? (
                  <small>不参与档位对比</small>
                ) : null}
              </th>
              <td>{formatMoney(row.value, row.currencyCode)}</td>
              <td>{formatRange(row.p25, row.p75, row.currencyCode)}</td>
              <td>{row.sampleCount}</td>
              <td>{row.cityCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="index-meta">
        <p>
          本次聚合纳入 {activeView.cityCount} 个城市、{activeView.sampleCount} 家酒店；
          有效样本少于 8 家的城市整城剔除（共采样 {summary.cityCount} 个城市、
          {summary.sampleCount} 家酒店）。
        </p>
        <p>
          口径：含税含费的最低可用现金价 ÷ 同期积分兑换价 × 10,000；先在城市内取中位数，
          再跨城市取中位数，避免酒店数量多的城市主导结果。
        </p>
        <p>
          统一货币换算使用{summary.currency.sourceName}（
          <a href={summary.currency.sourceUrl} rel="noreferrer" target="_blank">
            来源
          </a>
          ），参考日期 {summary.currency.referenceDate}，非实时。
          {summary.currency.usedFallback ? " 当日汇率未取到，此处使用带日期戳的兜底汇率表。" : null}
          {activeView.exclusions.length > 0 ? (
            <>
              {" "}
              因缺少汇率未计入：
              {activeView.exclusions
                .map((entry) => `${entry.currencyCode} ${entry.sampleCount} 家`)
                .join("、")}
              。
            </>
          ) : null}
        </p>
        {summary.separateBrands.length > 0 ? (
          <p>
            单独列出（不归入五档，也不计为未映射）：
            {summary.separateBrands
              .map(
                (brand) =>
                  `${brand.nameEn}（${brand.code}，样本 ${brand.sampleCount}）`,
              )
              .join("、")}
            。
          </p>
        ) : null}
        <p className="index-disclaimer">{summary.note}</p>
      </div>
    </section>
  );
}

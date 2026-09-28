import type { ReactNode } from "react";
import summaryJson from "../../data/index-summary.json";
import { GlassCard } from "../ui/GlassCard";

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

type CurrencyView = {
  currencyCode: string | null;
  global: { rows: IndexRow[]; sampleCount: number; cityCount: number };
  tier: { rows: IndexRow[] };
};

type IndexSummary = {
  runKey: string;
  sampleCount: number;
  cityCount: number;
  currency: { display: string; options: string[] };
  views: { byCurrency: Record<string, CurrencyView> };
};

const summary = summaryJson as unknown as IndexSummary;

const amountFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** 只展示有值且有样本的品牌档位，单独列出的品牌不放进这张卡。 */
function pickTierRows(view: CurrencyView) {
  return view.tier.rows.filter(
    (row) => row.value !== null && row.key !== "separate",
  );
}

type HeroSectionProps = {
  /** 首屏下方的预订面板，由页面组合进来。 */
  children: ReactNode;
};

export function HeroSection({ children }: HeroSectionProps) {
  const currencyCode =
    summary.views.byCurrency[summary.currency.display] !== undefined
      ? summary.currency.display
      : summary.currency.options[0];
  const view = summary.views.byCurrency[currencyCode];
  const global = view.global.rows[0];
  const tierRows = pickTierRows(view);
  const tierValues = tierRows.map((row) => row.value ?? 0);
  const topValue = Math.max(...tierValues);
  const bottomValue = Math.min(...tierValues);
  const snapshotDate = summary.runKey.slice(0, 10);

  /** 档位差只有两成上下，按最低到最高映射到 32% 到 100% 的长度才看得出高低。 */
  function barWidth(value: number | null) {
    if (value === null || topValue === bottomValue) return "100%";
    const ratio = (value - bottomValue) / (topValue - bottomValue);
    return `${Math.round(32 + ratio * 68)}%`;
  }

  return (
    <section className="hero" id="top">
      <div className="hero-grid">
        <div className="hero-lede">
          <p className="eyebrow">只做万豪的住宿决策工具</p>
          <h1 className="hero-title">
            <em>现金</em>
            还是
            <em>积分</em>
            ，哪个更值？
          </h1>
          <p className="hero-copy">
            用同一张快照对齐现金总价、积分价和每万分参考价值，结论留给你自己判断。
          </p>
        </div>

        <GlassCard as="aside" className="hero-visual" tone="card">
          <div className="flex items-baseline justify-between gap-4 pb-4">
            <span className="hero-stat-label">StayWorth Index</span>
            <span className="hero-stat-label">
              {global.cityCount} 城 / {global.sampleCount} 家样本
            </span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
            <span className="hero-stat-value">
              {global.value === null ? "-" : amountFormatter.format(global.value)}
              <span className="ml-2 text-[0.9rem] text-steel">{currencyCode}</span>
            </span>
            <span className="hero-stat-range">
              P25 {global.p25 === null ? "-" : amountFormatter.format(global.p25)}
              {" - "}
              P75 {global.p75 === null ? "-" : amountFormatter.format(global.p75)}
            </span>
          </div>

          <div className="hero-visual-stage">
            <div aria-hidden="true" className="hero-visual-material" />
            <div className="relative flex h-full flex-col justify-end gap-3 p-5">
              {tierRows.map((row) => (
                <div className="grid gap-2" key={row.key}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[0.8125rem] text-titanium-dim">
                      {row.label}
                      <span className="ml-2 text-steel text-[0.6875rem]">
                        {row.sampleCount} 家
                      </span>
                    </span>
                    <span className="font-mono text-[0.8125rem] text-titanium tabular-nums">
                      {row.value === null ? "-" : amountFormatter.format(row.value)}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="h-px origin-left"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(227,200,143,0.9), rgba(227,200,143,0.08))",
                      width: barWidth(row.value),
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <p className="hero-stat-foot pt-4">
            抽样日期 {snapshotDate}，每万分参考价值的中位水平，不是这家酒店的实时房价。
          </p>
        </GlassCard>
      </div>

      {children}
    </section>
  );
}

import type { ReactNode } from "react";
import summaryJson from "../../data/index-summary.json";
import { SurfaceCard } from "../ui/SurfaceCard";
import { HeroImage } from "./HeroImage";

type IndexRow = {
  key: string;
  value: number | null;
  p25: number | null;
  p75: number | null;
  sampleCount: number;
  cityCount: number;
};

type IndexSummary = {
  runKey: string;
  currency: { display: string; options: string[] };
  views: {
    byCurrency: Record<
      string,
      { global: { rows: IndexRow[]; sampleCount: number; cityCount: number } }
    >;
  };
};

const summary = summaryJson as unknown as IndexSummary;

const amountFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

type HeroSectionProps = {
  /** 首屏下方的预订面板，由页面组合进来。 */
  children: ReactNode;
};

/**
 * 首屏：主张句在左，真实酒店影像 + 一个真实数据在右，预订面板横跨底部。
 * 没有装饰性渐变光圈：奢华信号来自官方图片，数据信号来自当天的 Index 快照。
 */
export function HeroSection({ children }: HeroSectionProps) {
  const currencyCode =
    summary.views.byCurrency[summary.currency.display] !== undefined
      ? summary.currency.display
      : summary.currency.options[0];
  const view = summary.views.byCurrency[currencyCode];
  const global = view.global.rows[0];
  const snapshotDate = summary.runKey.slice(0, 10);

  return (
    <section className="hero" id="top">
      <div className="hero-grid">
        <div className="hero-lede">
          <p className="eyebrow">只做万豪的住宿决策工具</p>
          <h1 className="hero-title">
            <em>现金</em>还是<em>积分</em>，哪个更值？
          </h1>
          <p className="hero-copy">
            用同一张快照对齐现金总价、积分价和每万分兑换价值，结论留给你自己判断。
          </p>
        </div>

        <SurfaceCard as="aside" className="hero-visual" tone="card">
          <HeroImage />
          <div className="hero-stat">
            <span className="hero-stat-label">
              StayWorth Index · 每万分兑换价值（全球口径）
            </span>
            <span className="hero-stat-value">
              {global.value === null ? "-" : amountFormatter.format(global.value)}
              <span className="ml-2 text-[0.8125rem] text-label-tertiary">
                {currencyCode} / 万分
              </span>
            </span>
            <span className="hero-stat-range">
              P25 {global.p25 === null ? "-" : amountFormatter.format(global.p25)}
              {" - "}
              P75 {global.p75 === null ? "-" : amountFormatter.format(global.p75)}
            </span>
            <p className="hero-stat-foot">
              抽样日期 {snapshotDate}，覆盖 {global.cityCount} 城 /{" "}
              {global.sampleCount} 家样本，是市场参考中位数而不是某家酒店的价格。
            </p>
          </div>
        </SurfaceCard>
      </div>

      {children}
    </section>
  );
}

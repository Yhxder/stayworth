"use client";

import { HeroGlobe } from "./HeroGlobe";
import { HeroSky } from "./HeroSky";
import { useIndexSummary } from "../../lib/index-summary-client";
import type { IndexSummary } from "../../lib/index-reference";

type MarketMetric = {
  value: number | null;
  currencyCode: string;
  scopeLabel: string;
  cityCount: number;
  sampleCount: number;
  snapshotDate: string;
};

const amountFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** 首屏只放一个市场口径数字：全球中位数，并写明口径与日期。 */
function readMetric(summary: IndexSummary | null): MarketMetric | null {
  if (!summary) return null;
  const currencyCode =
    summary.views.byCurrency[summary.currency.display] !== undefined
      ? summary.currency.display
      : summary.currency.options[0];
  const global = summary.views.byCurrency[currencyCode]?.global.rows[0];
  if (!global) return null;
  return {
    value: global.value,
    currencyCode,
    scopeLabel: "全球口径",
    cityCount: global.cityCount,
    sampleCount: global.sampleCount,
    snapshotDate: summary.runKey.slice(0, 10),
  };
}

type HeroSectionProps = {
  /** 主操作：滚到搜索面板并把光标放进城市字段。 */
  onStart: () => void;
  /** 次操作：切到每万分兑换价值模块并滚过去。 */
  onOpenIndex: () => void;
};

/**
 * 首屏：左侧说明与两个入口，右侧点阵地球。
 *
 * 这一屏占满一屏（100svh），滚动时整块向后收起、下一屏从下方盖上来，
 * 但**不做滚动劫持**：劫持会让键盘、滚动条和读屏用户卡在半屏，
 * 所以"停留感"由高度和转场动画给出，滚动本身始终是原生行为。
 *
 * 这一屏只放一个数字（全球口径的市场参考值），它的作用与日期都写在旁边；
 * 不再放"随机某一家酒店"的展示卡——那种摆法会让人以为它是这家酒店的价值。
 */
export function HeroSection({ onStart, onOpenIndex }: HeroSectionProps) {
  const indexState = useIndexSummary();
  const metric = readMetric(
    indexState.status === "ready" ? indexState.summary : null,
  );
  // 加载中与读不到要分开说：接口失败时还写「加载中」是在骗人，
  // 而且徽标不能在没有数据时硬报一个城市数。
  const marketLine =
    metric && metric.value !== null
      ? `市场参考 ${amountFormatter.format(metric.value)} ${metric.currencyCode} / 万分 · ${metric.scopeLabel} · ${metric.snapshotDate}`
      : indexState.status === "loading"
        ? "市场参考值加载中…"
        : "市场参考值暂时读不到——界面只展示有来源与日期的数字";

  return (
    <section className="hero" id="top">
      <HeroSky />

      <div className="hero-grid">
        <div className="hero-copy">
          <p className="hero-badge">
            <span aria-hidden="true" className="hero-badge-dot" />
            StayWorth Index · 每日抽样
            {metric ? ` ${metric.cityCount} 城 / ${metric.sampleCount} 家样本` : ""}
          </p>

          <h1 className="hero-title">现金还是积分，哪个更值？</h1>

          <p className="hero-lede">
            一张快照对齐现金价、积分价与每万分兑换价值，结论留给你。
          </p>

          <div className="hero-actions">
            <button
              className="hero-cta hero-cta-primary"
              onClick={onStart}
              type="button"
            >
              开始比价
              <svg aria-hidden="true" className="hero-cta-arrow" viewBox="0 0 16 16">
                <path
                  d="M2.5 8h10.5M9.5 4.5 13 8l-3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
            <button
              className="hero-cta hero-cta-secondary"
              onClick={onOpenIndex}
              type="button"
            >
              查看市场参考值
            </button>
          </div>

          <div className="hero-trust">
            <span aria-hidden="true" className="hero-trust-dot" />
            <div className="hero-trust-body">
              <strong>数据可追溯 · 输入不外传 · 与万豪无隶属关系</strong>
              <small>{marketLine}</small>
            </div>
            <span className="hero-trust-tag">示例快照</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <HeroGlobe />
      </div>
    </section>
  );
}

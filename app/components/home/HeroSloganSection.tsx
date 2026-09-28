import summaryJson from "../../data/index-summary.json";
import {
  HotelShowcaseCard,
  type ShowcaseMetric,
} from "./HotelShowcaseCard";

type IndexRow = {
  key: string;
  value: number | null;
  p25: number | null;
  p75: number | null;
  sampleCount: number;
  cityCount: number;
  currencyCode: string;
};

type IndexSummary = {
  runKey: string;
  currency: { display: string; options: string[] };
  views: {
    byCurrency: Record<string, { global: { rows: IndexRow[] } }>;
  };
};

const summary = summaryJson as unknown as IndexSummary;

/** 市场口径指标：全球中位数，界面必须写明口径与日期。 */
function readMetric(): ShowcaseMetric {
  const currencyCode =
    summary.views.byCurrency[summary.currency.display] !== undefined
      ? summary.currency.display
      : summary.currency.options[0];
  const global = summary.views.byCurrency[currencyCode].global.rows[0];

  return {
    label: "每万分兑换价值",
    value: global.value,
    currencyCode,
    p25: global.p25,
    p75: global.p75,
    scopeLabel: "全球口径 · 市场参考中位数",
    sampleCount: global.sampleCount,
    cityCount: global.cityCount,
    snapshotDate: summary.runKey.slice(0, 10),
  };
}

/**
 * 巨幅 Slogan 区：左侧文字是第一落点，右侧真实酒店卡是观点的佐证。
 *
 * 版式是非对称 3fr / 2fr，右卡整体下沉 40px，刻意不与左列共用基线；
 * 纵向 py-24（桌面 py-32）留出发布会式的呼吸感。
 * 底色走 `--surface-oled`：深色是 OLED 黑，浅色跟随画布，避免页面出现反色区块。
 */
export function HeroSloganSection() {
  return (
    <section className="hero-slogan" id="top">
      <div className="hero-slogan-grid">
        <div>
          <p className="hero-slogan-topline">只做万豪的住宿决策工具</p>
          <h1 className="hero-slogan-title">
            现金还是积分，
            <em>哪个更值？</em>
          </h1>
          <p className="hero-slogan-copy">
            用同一张快照对齐现金总价、积分价和每万分兑换价值，结论留给你自己判断。
          </p>
        </div>
        <HotelShowcaseCard metric={readMetric()} />
      </div>
    </section>
  );
}

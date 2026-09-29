import type { ReactNode } from "react";
import {
  HotelShowcaseCard,
  type ShowcaseMetric,
} from "./HotelShowcaseCard";
import { useIndexSummary } from "../../lib/index-summary-client";

/** 数据缺失时给一个「没有数字」的占位，界面照样写明口径与日期。 */
const EMPTY_METRIC: ShowcaseMetric = {
  label: "每万分兑换价值",
  value: null,
  currencyCode: "CNY",
  p25: null,
  p75: null,
  scopeLabel: "全球口径",
  sampleCount: 0,
  cityCount: 0,
  snapshotDate: "—",
};

/** 市场口径指标：全球中位数，界面必须写明口径与日期。 */
function readMetric(
  summary: import("../../lib/index-reference").IndexSummary | null,
): ShowcaseMetric {
  if (!summary) return EMPTY_METRIC;
  const currencyCode =
    summary.views.byCurrency[summary.currency.display] !== undefined
      ? summary.currency.display
      : summary.currency.options[0];
  const global = summary.views.byCurrency[currencyCode]?.global.rows[0];
  if (!global) return EMPTY_METRIC;
  return {
    label: "每万分兑换价值",
    value: global.value,
    currencyCode,
    p25: global.p25,
    p75: global.p75,
    scopeLabel: "全球口径",
    sampleCount: global.sampleCount,
    cityCount: global.cityCount,
    snapshotDate: summary.runKey.slice(0, 10),
  };
}

type TaskFirstSectionProps = {
  /** 预订面板由页面持有状态，作为子节点放进来。 */
  children: ReactNode;
};

/**
 * 首屏（Operate 版式）。
 *
 * 这一屏的访问者是来完成一次比价的，不是来读海报的，所以顺序是
 * 「一句话说明 → 搜索条件」：标题降到产品尺度，任务紧跟在同一条视线上，
 * 首屏之内就能按到主操作。市场参考与真实酒店图收成右侧一张小卡，
 * 它提供判断依据，但不与主操作争夺注意力。
 *
 * 标题不再使用渐变文字：强调交给字号与字重，颜色留给主操作与状态。
 */
export function TaskFirstSection({ children }: TaskFirstSectionProps) {
  const indexState = useIndexSummary();
  return (
    <section className="task-first" id="top">
      <div className="task-first-head">
        <h1 className="task-first-title">现金还是积分，哪个更值？</h1>
        <p className="task-first-copy">
          一张快照对齐现金价、积分价与每万分兑换价值，结论留给你。
        </p>
      </div>
      {children}
      <HotelShowcaseCard
        metric={readMetric(indexState.status === "ready" ? indexState.summary : null)}
      />
    </section>
  );
}

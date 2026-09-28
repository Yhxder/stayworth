// 从最近若干批次里挑出「应当对外展示」的那一批。
//
// 为什么不能只按 id 取最新：开发期跑过只有一两个城市的验证批次（例如 --cities=tokyo），
// 它同样是 status=ok 的合法记录，却只覆盖一个城市。如果按 id 取最新，
// 页面上的「全球参考值」就会从一个城市的样本算出来，看起来像数据坏了。
//
// 规则：按时间倒序找第一个覆盖到面板绝大多数城市的批次；
// 一个都没有时退回最新的一批（宁可显示一份小而完整的样本，也不显示空白）。

export type RunCandidate = {
  id: number;
  citiesOk: number;
};

/** 认为「覆盖合格」的比例：面板 20 城时要求至少 16 城。 */
export const RUN_COVERAGE_RATIO = 0.8;

export function pickDisplayRun(
  candidates: RunCandidate[],
  panelSize: number,
): RunCandidate | null {
  if (candidates.length === 0) return null;
  const floor = Math.max(1, Math.ceil(panelSize * RUN_COVERAGE_RATIO));
  return candidates.find((run) => run.citiesOk >= floor) ?? candidates[0];
}

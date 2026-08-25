import type { Hotel, SearchResultsState } from "../types/hotel";

const STALE_AFTER_DAYS = 7;

const stateContent = {
  loading: {
    title: "正在查询示例酒店…",
    message: "正在根据城市、日期和品牌层级整理结果。",
  },
  empty: {
    title: "暂无数据",
    message: "当前只覆盖香港、上海和有限日期；未覆盖范围不会返回伪造价格。",
  },
  error: {
    title: "查询失败",
    message: "数据暂时无法读取，请稍后重试。",
  },
  stale: {
    title: "数据已过期",
    message: "这些价格快照仅用于验证流程，请前往 Marriott 官方渠道重新核验。",
  },
} as const;

export type VisibleSearchState = keyof typeof stateContent;

export function getSearchStateContent(status: VisibleSearchState) {
  return stateContent[status];
}

export function isHotelDataStale(
  updatedAt: string,
  now = new Date(),
  staleAfterDays = STALE_AFTER_DAYS,
) {
  const updatedTime = new Date(updatedAt).getTime();
  const ageInMilliseconds = now.getTime() - updatedTime;

  if (!Number.isFinite(updatedTime)) return true;
  return ageInMilliseconds > staleAfterDays * 24 * 60 * 60 * 1000;
}

export function getResultsState(
  hotels: Hotel[],
  query: string,
  now = new Date(),
): SearchResultsState {
  if (hotels.length === 0) return { status: "empty", query };

  return {
    status: hotels.some((hotel) => isHotelDataStale(hotel.updatedAt, now))
      ? "stale"
      : "success",
    query,
    hotels,
  };
}

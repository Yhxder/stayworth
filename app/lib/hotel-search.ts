import type {
  Hotel,
  SearchFilters,
  SearchResultsState,
} from "../types/hotel";

const STALE_AFTER_DAYS = 7;

const stateContent = {
  loading: {
    title: "正在查询示例酒店…",
    message: "正在根据城市、日期和品牌层级整理结果。",
  },
  empty: {
    title: "暂无数据",
    message: "当前原型仅覆盖香港；未覆盖的城市和日期不会返回伪造价格。",
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

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase().replaceAll(/\s+/g, " ");
}

export function filterPrototypeHotels(
  hotels: Hotel[],
  filters: Pick<SearchFilters, "city" | "tier">,
) {
  const normalizedCity = normalizeSearchText(filters.city);

  return hotels.filter((hotel) => {
    const matchesCity = hotel.cityAliases.some(
      (alias) => normalizeSearchText(alias) === normalizedCity,
    );
    const matchesTier =
      filters.tier === "全部等级" || hotel.tier === filters.tier;

    return matchesCity && matchesTier;
  });
}

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

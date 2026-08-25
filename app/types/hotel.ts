export type PortfolioTier =
  | "Luxury"
  | "Premium"
  | "Select"
  | "Longer Stays"
  | "Collections";

export type TierFilter = PortfolioTier | "全部等级";

export type Hotel = {
  id: string;
  nameZh: string;
  nameEn: string;
  brand: string;
  tier: PortfolioTier;
  city: string;
  cityAliases: string[];
  district: string;
  cashPrice: number;
  pointsRequired: number;
  currency: "CNY";
  sourceLabel: "你的真实入住" | "原型模拟数据";
  updatedAt: string;
};

export type SearchFilters = {
  city: string;
  checkIn: string;
  checkOut: string;
  tier: TierFilter;
};

export type SearchResultsState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "empty"; query: string }
  | { status: "error"; query: string; message: string }
  | {
      status: "success" | "stale";
      query: string;
      hotels: Hotel[];
    };

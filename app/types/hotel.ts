import type { CurrencyCode } from "../lib/currencies";
import type { CityCoverage } from "../lib/hotel-api";

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
  brandId: string;
  brand: string;
  tier: PortfolioTier;
  city: string;
  /** 城市在采样面板里的标识，如 hong-kong；用于查 StayWorth Index */
  citySlug: string;
  /** 国家/地区代码，如 HK；城市口径缺失时退到国家口径 */
  countryCode: string;
  district: string;
  cashPrice: number;
  pointsRequired: number;
  currency: CurrencyCode;
  sourceLabel: string;
  sourceUrl: string | null;
  updatedAt: string;
  /** 官方图片的代理路径（/media/hotel?...）；目录没有匹配到酒店时为 null。 */
  imagePath?: string | null;
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
  | { status: "empty"; query: string; coverage: CityCoverage | null }
  | { status: "error"; query: string; message: string }
  | {
      status: "success" | "stale";
      query: string;
      hotels: Hotel[];
    };

export type RebatePrefill = {
  revision: number;
  hotelName: string;
  cashPrice: number;
  currency: CurrencyCode;
  nights: number;
  brandId: string;
  /** 用于查 StayWorth Index 市场参考值；手动输入时为 null */
  citySlug: string | null;
  countryCode: string | null;
};

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
  district: string;
  cashPrice: number;
  pointsRequired: number;
  currency: CurrencyCode;
  sourceLabel: string;
  sourceUrl: string | null;
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
};

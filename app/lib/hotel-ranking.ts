import type { Hotel } from "../types/hotel";
import { calculateCashValuePerTenThousand } from "./points.ts";

export type RankingCriterion = "value" | "cash" | "points";

export type RankingOption = {
  id: RankingCriterion;
  label: string;
  hint: string;
};

export const RANKING_OPTIONS: readonly RankingOption[] = [
  {
    id: "value",
    label: "兑换价值最高",
    hint: "按每万分兑换价值从高到低排列。价值越高，说明这一家的积分越值钱。",
  },
  {
    id: "cash",
    label: "现金价最低",
    hint: "按现金总价从低到高排列，适合打算直接付现的情况。",
  },
  {
    id: "points",
    label: "所需积分最少",
    hint: "按积分总价从少到多排列，适合积分余额有限的情况。",
  },
];

export const RANKING_SCOPE_NOTE =
  "排名只针对本次返回的快照，不含税费、库存和会员优惠，也不构成预订建议。";

export type RankedHotel = {
  hotel: Hotel;
  rank: number;
  valuePerTenThousand: number;
};

export function getRankingOption(criterion: RankingCriterion) {
  const option = RANKING_OPTIONS.find((candidate) => candidate.id === criterion);

  if (!option) {
    throw new RangeError(`Unsupported ranking criterion: ${criterion}`);
  }

  return option;
}

export function getCashValuePerTenThousand(hotel: Hotel) {
  return calculateCashValuePerTenThousand(hotel.cashPrice, hotel.pointsRequired);
}

const primaryMetrics: Record<RankingCriterion, (hotel: Hotel) => number> = {
  value: (hotel) => getCashValuePerTenThousand(hotel),
  cash: (hotel) => hotel.cashPrice,
  points: (hotel) => hotel.pointsRequired,
};

/**
 * Direction of the primary metric: -1 keeps larger values first, 1 keeps
 * smaller values first. Value is "higher is better"; price and points are not.
 */
const primaryDirections: Record<RankingCriterion, -1 | 1> = {
  value: -1,
  cash: 1,
  points: 1,
};

function compareByCriterion(
  a: Hotel,
  b: Hotel,
  criterion: RankingCriterion,
) {
  const direction = primaryDirections[criterion];
  const primaryDifference =
    (primaryMetrics[criterion](a) - primaryMetrics[criterion](b)) * direction;

  if (primaryDifference !== 0) return primaryDifference;

  // Deterministic, explainable tie-breakers so the same input always renders
  // the same order.
  const valueDifference =
    getCashValuePerTenThousand(b) - getCashValuePerTenThousand(a);
  if (valueDifference !== 0) return valueDifference;

  const cashDifference = a.cashPrice - b.cashPrice;
  if (cashDifference !== 0) return cashDifference;

  const pointsDifference = a.pointsRequired - b.pointsRequired;
  if (pointsDifference !== 0) return pointsDifference;

  return a.id.localeCompare(b.id);
}

/**
 * Orders hotels by the chosen criterion and assigns competition ranks, so
 * hotels with an identical primary metric share the better rank.
 */
export function rankHotels(
  hotels: readonly Hotel[],
  criterion: RankingCriterion,
): RankedHotel[] {
  const sorted = [...hotels].sort((a, b) => compareByCriterion(a, b, criterion));
  let rank = 0;
  let previousMetric: number | null = null;

  return sorted.map((hotel, index) => {
    const metric = primaryMetrics[criterion](hotel);

    if (previousMetric === null || metric !== previousMetric) {
      rank = index + 1;
      previousMetric = metric;
    }

    return {
      hotel,
      rank,
      valuePerTenThousand: getCashValuePerTenThousand(hotel),
    };
  });
}

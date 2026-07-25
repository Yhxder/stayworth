export type NetStayCostInput = {
  cashPrice: number;
  basePoints: number;
  eliteBonusPoints: number;
  cardPoints: number;
  welcomePoints: number;
  promotionalPoints: number;
  valuePerTenThousand: number;
};

export type EarnedPointsInput = {
  cashPrice: number;
  eligibleSpend: number;
  exchangeRate: number;
  baseRate: number;
  eliteBonusRate: number;
  cardMultiplier: number;
  welcomePoints: number;
  promotionalPoints: number;
};

function assertGreaterThanZero(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }
}

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateCashValuePerTenThousand(
  cashPrice: number,
  pointsRequired: number,
) {
  assertGreaterThanZero(cashPrice, "Cash price");
  assertGreaterThanZero(pointsRequired, "Points required");
  return roundToTwo((cashPrice / pointsRequired) * 10_000);
}

export function calculatePointsPerCurrencyUnit(
  cashPrice: number,
  pointsRequired: number,
) {
  assertGreaterThanZero(cashPrice, "Cash price");
  assertGreaterThanZero(pointsRequired, "Points required");
  return roundToTwo(pointsRequired / cashPrice);
}

export function calculateEarnedPoints(input: EarnedPointsInput) {
  assertGreaterThanZero(input.cashPrice, "Cash price");
  assertGreaterThanZero(input.exchangeRate, "Exchange rate");

  const eligibleUsd = Math.max(input.eligibleSpend, 0) / input.exchangeRate;
  const chargedUsd = input.cashPrice / input.exchangeRate;
  const basePoints = Math.round(eligibleUsd * Math.max(input.baseRate, 0));
  const eliteBonusPoints = Math.round(
    basePoints * Math.max(input.eliteBonusRate, 0),
  );
  const cardPoints = Math.round(
    chargedUsd * Math.max(input.cardMultiplier, 0),
  );

  return {
    basePoints,
    eliteBonusPoints,
    cardPoints,
    welcomePoints: Math.max(Math.round(input.welcomePoints), 0),
    promotionalPoints: Math.max(Math.round(input.promotionalPoints), 0),
  };
}

export function calculateNetStayCost(input: NetStayCostInput) {
  assertGreaterThanZero(input.cashPrice, "Cash price");
  assertGreaterThanZero(
    input.valuePerTenThousand,
    "Value per ten thousand points",
  );

  const totalPoints =
    input.basePoints +
    input.eliteBonusPoints +
    input.cardPoints +
    input.welcomePoints +
    input.promotionalPoints;
  const rebateValue = roundToTwo(
    (totalPoints / 10_000) * input.valuePerTenThousand,
  );

  return {
    totalPoints,
    rebateValue,
    netStayCost: roundToTwo(input.cashPrice - rebateValue),
  };
}

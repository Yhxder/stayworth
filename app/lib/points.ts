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

export type RebateEstimateInput = {
  cashPrice: number;
  ineligibleSpend: number;
  nights: number;
  exchangeRate: number;
  baseRate: number;
  eliteBonusRate: number;
  cardMultiplier: number;
  welcomePoints: number;
  promotionalPoints: number;
  valuePerTenThousand: number;
};

function assertGreaterThanZero(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }
}

function assertNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} cannot be negative.`);
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
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

export function calculateRebateEstimate(input: RebateEstimateInput) {
  assertGreaterThanZero(input.cashPrice, "Cash price");
  assertNonNegative(input.ineligibleSpend, "Ineligible spend");
  assertPositiveInteger(input.nights, "Nights");
  assertGreaterThanZero(input.exchangeRate, "Exchange rate");
  assertNonNegative(input.baseRate, "Base rate");
  assertNonNegative(input.eliteBonusRate, "Elite bonus rate");
  assertNonNegative(input.cardMultiplier, "Card multiplier");
  assertNonNegative(input.welcomePoints, "Welcome points");
  assertNonNegative(input.promotionalPoints, "Promotional points");
  assertGreaterThanZero(
    input.valuePerTenThousand,
    "Value per ten thousand points",
  );

  if (input.ineligibleSpend > input.cashPrice) {
    throw new RangeError("Ineligible spend cannot exceed cash price.");
  }

  const eligibleSpend = roundToTwo(
    input.cashPrice - input.ineligibleSpend,
  );
  const earnedPoints = calculateEarnedPoints({
    cashPrice: input.cashPrice,
    eligibleSpend,
    exchangeRate: input.exchangeRate,
    baseRate: input.baseRate,
    eliteBonusRate: input.eliteBonusRate,
    cardMultiplier: input.cardMultiplier,
    welcomePoints: input.welcomePoints,
    promotionalPoints: input.promotionalPoints,
  });
  const netCost = calculateNetStayCost({
    cashPrice: input.cashPrice,
    ...earnedPoints,
    valuePerTenThousand: input.valuePerTenThousand,
  });

  return {
    eligibleSpend,
    ...earnedPoints,
    ...netCost,
    netCostPerNight: roundToTwo(netCost.netStayCost / input.nights),
    rebatePercentage: roundToTwo(
      (netCost.rebateValue / input.cashPrice) * 100,
    ),
    isNetReturn: netCost.netStayCost < 0,
  };
}

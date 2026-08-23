export const CALCULATOR_LIMITS = {
  cashPrice: { min: 0.01, max: 100_000_000 },
  ineligibleSpend: { min: 0, max: 100_000_000 },
  nights: { min: 1, max: 365 },
  exchangeRate: { min: 0.0001, max: 1_000_000 },
  points: { min: 0, max: 100_000_000 },
  pointValuation: { min: 0.01, max: 1_000_000 },
} as const;

export function parseNumericInput(rawValue: string) {
  if (rawValue.trim() === "") return Number.NaN;
  return Number(rawValue);
}

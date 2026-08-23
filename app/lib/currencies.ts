export const EXCHANGE_RATE_REFERENCE_DATE = "2026-08-21";
export const EXCHANGE_RATE_SOURCE_URL =
  "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";

export const currencyOptions = [
  {
    code: "CNY",
    label: "人民币",
    symbol: "¥",
    unitsPerUsd: 6.7206,
    fractionDigits: 2,
  },
  {
    code: "HKD",
    label: "港币",
    symbol: "HK$",
    unitsPerUsd: 7.8405,
    fractionDigits: 2,
  },
  {
    code: "USD",
    label: "美元",
    symbol: "US$",
    unitsPerUsd: 1,
    fractionDigits: 2,
  },
  {
    code: "JPY",
    label: "日元",
    symbol: "JP¥",
    unitsPerUsd: 158.7,
    fractionDigits: 0,
  },
  {
    code: "KRW",
    label: "韩元",
    symbol: "₩",
    unitsPerUsd: 1384.23,
    fractionDigits: 0,
  },
  {
    code: "SGD",
    label: "新加坡元",
    symbol: "S$",
    unitsPerUsd: 1.2683,
    fractionDigits: 2,
  },
  {
    code: "THB",
    label: "泰铢",
    symbol: "฿",
    unitsPerUsd: 32.6746,
    fractionDigits: 2,
  },
  {
    code: "EUR",
    label: "欧元",
    symbol: "€",
    unitsPerUsd: 0.8548,
    fractionDigits: 2,
  },
  {
    code: "GBP",
    label: "英镑",
    symbol: "£",
    unitsPerUsd: 0.7323,
    fractionDigits: 2,
  },
] as const;

export type CurrencyCode = (typeof currencyOptions)[number]["code"];

export function getCurrencyConfig(code: string) {
  const currency = currencyOptions.find((option) => option.code === code);

  if (!currency) {
    throw new RangeError(`Unsupported currency: ${code}`);
  }

  return currency;
}

export function formatCurrencyAmount(value: number, code: CurrencyCode) {
  const currency = getCurrencyConfig(code);
  const sign = value < 0 ? "-" : "";
  const formattedNumber = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: currency.fractionDigits,
    maximumFractionDigits: currency.fractionDigits,
  }).format(Math.abs(value));

  return `${sign}${currency.symbol}${formattedNumber}`;
}

export function convertCurrencyAmount(
  value: number,
  fromCode: CurrencyCode,
  toCode: CurrencyCode,
) {
  const fromCurrency = getCurrencyConfig(fromCode);
  const toCurrency = getCurrencyConfig(toCode);
  const convertedValue =
    (value / fromCurrency.unitsPerUsd) * toCurrency.unitsPerUsd;
  const roundingFactor = 10 ** toCurrency.fractionDigits;

  return (
    Math.round((convertedValue + Number.EPSILON) * roundingFactor) /
    roundingFactor
  );
}

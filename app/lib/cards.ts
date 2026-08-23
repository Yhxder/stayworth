export const CARD_RULE_REFERENCE_DATE = "2026-08-23";
export const NO_CARD_ID = "none";

export type CardEarningCurrency = "CNY" | "USD" | "CAD";

export type MarriottCard = {
  id: string;
  optionLabel: string;
  countryCode: "CN" | "US" | "CA";
  segment: "个人卡" | "商业卡";
  earningCurrency: CardEarningCurrency;
  pointsPerCurrencyUnit: number;
  earningDescription: string;
  stayBonusPoints: number;
  sourceUrl: string;
  note: string;
};

export const marriottCards: MarriottCard[] = [
  {
    id: "cn-citic-gold",
    optionLabel: "🇨🇳 中信银行万豪旅享家联名信用卡金卡",
    countryCode: "CN",
    segment: "个人卡",
    earningCurrency: "CNY",
    pointsPerCurrencyUnit: 2 / 18,
    earningDescription: "万豪酒店合格消费每 18 CNY 赚 2 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://creditcard.ecitic.com/h5/shenqing/wanhao/images/xize.pdf?sid=SJZLWH196",
    note: "加速积分要求使用实体卡刷卡或插卡；绑定第三方移动支付通常不适用。",
  },
  {
    id: "cn-citic-preferred-platinum",
    optionLabel: "🇨🇳 中信银行万豪旅享家联名信用卡精逸白金卡",
    countryCode: "CN",
    segment: "个人卡",
    earningCurrency: "CNY",
    pointsPerCurrencyUnit: 2 / 10,
    earningDescription: "万豪酒店合格消费每 10 CNY 赚 2 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://creditcard.ecitic.com/h5/shenqing/wanhao/images/xize.pdf?sid=SJZLWH196",
    note: "加速积分要求使用实体卡刷卡或插卡；绑定第三方移动支付通常不适用。",
  },
  {
    id: "cn-citic-platinum",
    optionLabel: "🇨🇳 中信银行万豪旅享家联名信用卡白金卡",
    countryCode: "CN",
    segment: "个人卡",
    earningCurrency: "CNY",
    pointsPerCurrencyUnit: 3 / 10,
    earningDescription: "万豪酒店合格消费每 10 CNY 赚 3 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://creditcard.ecitic.com/h5/shenqing/wanhao/images/xize.pdf?sid=SJZLWH196",
    note: "加速积分要求使用实体卡刷卡或插卡；绑定第三方移动支付通常不适用。",
  },
  {
    id: "us-amex-bevy",
    optionLabel: "🇺🇸 Marriott Bonvoy Bevy® American Express® Card",
    countryCode: "US",
    segment: "个人卡",
    earningCurrency: "USD",
    pointsPerCurrencyUnit: 6,
    earningDescription: "万豪酒店合格消费每 1 USD 赚 6 分",
    stayBonusPoints: 1000,
    sourceUrl:
      "https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-bevy/",
    note: "每次符合条件且通过万豪直接预订的付费入住另有 1,000 分；需在下方确认后才计入。",
  },
  {
    id: "us-amex-brilliant",
    optionLabel: "🇺🇸 Marriott Bonvoy Brilliant® American Express® Card",
    countryCode: "US",
    segment: "个人卡",
    earningCurrency: "USD",
    pointsPerCurrencyUnit: 6,
    earningDescription: "万豪酒店合格消费每 1 USD 赚 6 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-brilliant/",
    note: "仅按参与万豪旅享家计划酒店的合格刷卡消费估算。",
  },
  {
    id: "us-chase-bold",
    optionLabel: "🇺🇸 Marriott Bonvoy Bold® Credit Card",
    countryCode: "US",
    segment: "个人卡",
    earningCurrency: "USD",
    pointsPerCurrencyUnit: 3,
    earningDescription: "万豪酒店合格消费每 1 USD 赚 3 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/bold",
    note: "仅按参与万豪旅享家计划酒店的合格刷卡消费估算。",
  },
  {
    id: "us-chase-boundless",
    optionLabel: "🇺🇸 Marriott Bonvoy Boundless® Credit Card",
    countryCode: "US",
    segment: "个人卡",
    earningCurrency: "USD",
    pointsPerCurrencyUnit: 6,
    earningDescription: "万豪酒店合格消费每 1 USD 赚 6 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/boundless",
    note: "仅按参与万豪旅享家计划酒店的合格刷卡消费估算。",
  },
  {
    id: "us-chase-bountiful",
    optionLabel: "🇺🇸 Marriott Bonvoy Bountiful® Credit Card",
    countryCode: "US",
    segment: "个人卡",
    earningCurrency: "USD",
    pointsPerCurrencyUnit: 6,
    earningDescription: "万豪酒店合格消费每 1 USD 赚 6 分",
    stayBonusPoints: 1000,
    sourceUrl:
      "https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/bountiful",
    note: "每次符合条件且通过万豪直接预订的付费入住另有 1,000 分；需在下方确认后才计入。",
  },
  {
    id: "us-chase-ritz-carlton",
    optionLabel: "🇺🇸 The Ritz-Carlton® Credit Card",
    countryCode: "US",
    segment: "个人卡",
    earningCurrency: "USD",
    pointsPerCurrencyUnit: 6,
    earningDescription: "万豪酒店合格消费每 1 USD 赚 6 分",
    stayBonusPoints: 0,
    sourceUrl: "https://marriott.chase.com/ritz-carlton",
    note: "该卡主要面向现有持卡人，本工具保留选项供其计算。",
  },
  {
    id: "us-amex-bonvoy-business",
    optionLabel: "🇺🇸 Marriott Bonvoy Business® American Express® Card",
    countryCode: "US",
    segment: "商业卡",
    earningCurrency: "USD",
    pointsPerCurrencyUnit: 6,
    earningDescription: "万豪酒店合格消费每 1 USD 赚 6 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/amex-marriott-bonvoy-business-credit-card/",
    note: "仅按参与万豪旅享家计划酒店的合格刷卡消费估算。",
  },
  {
    id: "ca-amex-bonvoy",
    optionLabel: "🇨🇦 Marriott Bonvoy® American Express® Card",
    countryCode: "CA",
    segment: "个人卡",
    earningCurrency: "CAD",
    pointsPerCurrencyUnit: 5,
    earningDescription: "万豪酒店合格消费每 1 CAD 赚 5 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://www.americanexpress.com/en-ca/credit-cards/marriott-bonvoy-card/",
    note: "刷卡金额会先按参考汇率换算为 CAD，再估算信用卡积分。",
  },
  {
    id: "ca-amex-bonvoy-business",
    optionLabel: "🇨🇦 Marriott Bonvoy® Business American Express® Card",
    countryCode: "CA",
    segment: "商业卡",
    earningCurrency: "CAD",
    pointsPerCurrencyUnit: 5,
    earningDescription: "万豪酒店合格消费每 1 CAD 赚 5 分",
    stayBonusPoints: 0,
    sourceUrl:
      "https://www.americanexpress.com/ca/en/business/small-business/benefits/marriott-bonvoy-business-card/",
    note: "刷卡金额会先按参考汇率换算为 CAD，再估算信用卡积分。",
  },
];

export function getMarriottCard(id: string) {
  if (id === NO_CARD_ID) return null;

  const card = marriottCards.find((candidate) => candidate.id === id);

  if (!card) {
    throw new RangeError(`Unsupported Marriott card: ${id}`);
  }

  return card;
}

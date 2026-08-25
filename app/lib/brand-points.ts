export const BRAND_RULE_REFERENCE_DATE = "2026-08-25";
export const BRAND_RULE_SOURCE_URL =
  "https://www.marriott.com/loyalty/earn/hotels.mi";

export type MarriottBrandRule = {
  id: string;
  name: string;
  baseRate: 4 | 5 | 10;
  eliteBonusEligible: boolean;
  note?: string;
};

const tenPointBrands = [
  ["ritz-carlton", "The Ritz-Carlton"],
  ["luxury-collection", "The Luxury Collection"],
  ["st-regis", "St. Regis"],
  ["w-hotels", "W Hotels"],
  ["jw-marriott", "JW Marriott"],
  ["marriott-hotels", "Marriott Hotels"],
  ["sheraton", "Sheraton"],
  ["marriott-vacation-club", "Marriott Vacation Club"],
  ["delta-hotels", "Delta Hotels by Marriott"],
  ["westin", "Westin"],
  ["le-meridien", "Le Méridien"],
  ["renaissance", "Renaissance Hotels"],
  ["autograph-collection", "Autograph Collection"],
  ["tribute-portfolio", "Tribute Portfolio"],
  ["design-hotels", "Design Hotels"],
  ["gaylord-hotels", "Gaylord Hotels"],
  ["mgm-collection", "MGM Collection with Marriott Bonvoy"],
  ["courtyard", "Courtyard by Marriott"],
  ["four-points", "Four Points by Sheraton"],
  ["springhill-suites", "SpringHill Suites by Marriott"],
  ["fairfield", "Fairfield by Marriott"],
  ["ac-hotels", "AC Hotels by Marriott"],
  ["aloft", "Aloft"],
  ["moxy", "Moxy Hotels"],
  ["outdoor-collection", "Outdoor Collection by Marriott Bonvoy"],
  ["citizenm", "citizenM"],
] as const;

const fivePointBrands = [
  ["residence-inn", "Residence Inn by Marriott"],
  ["towneplace-suites", "TownePlace Suites by Marriott"],
  ["element", "Element by Westin"],
  ["homes-villas", "Homes & Villas by Marriott Bonvoy"],
  ["apartments", "Apartments by Marriott Bonvoy"],
  ["protea-hotels", "Protea Hotels by Marriott"],
  ["city-express", "City Express by Marriott"],
  ["four-points-flex", "Four Points Flex by Sheraton"],
] as const;

export const marriottBrandRules: MarriottBrandRule[] = [
  ...tenPointBrands.map(([id, name]) => ({
    id,
    name,
    baseRate: 10 as const,
    eliteBonusEligible: true,
  })),
  {
    id: "series-greater-china",
    name: "Series by Marriott（美国、加拿大及大中华区）",
    baseRate: 10,
    eliteBonusEligible: true,
    note: "大中华区包括中国大陆、香港、澳门和台湾。",
  },
  ...fivePointBrands.map(([id, name]) => ({
    id,
    name,
    baseRate: 5 as const,
    eliteBonusEligible: true,
  })),
  {
    id: "marriott-executive-apartments",
    name: "Marriott Executive Apartments",
    baseRate: 5,
    eliteBonusEligible: true,
    note: "仅合资格房价赚取基础积分，其他合资格消费不赚积分。",
  },
  {
    id: "series-other",
    name: "Series by Marriott（其他地区）",
    baseRate: 5,
    eliteBonusEligible: true,
  },
  {
    id: "studiores",
    name: "StudioRes",
    baseRate: 4,
    eliteBonusEligible: false,
    note: "StudioRes 不赚取会员等级加成积分。",
  },
];

export function getMarriottBrandRule(id: string) {
  const brand = marriottBrandRules.find((candidate) => candidate.id === id);

  if (!brand) {
    throw new RangeError(`Unsupported Marriott brand: ${id}`);
  }

  return brand;
}

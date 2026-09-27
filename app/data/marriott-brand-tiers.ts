import type { PortfolioTier } from "../types/hotel";

/**
 * Marriott 品牌代号 → StayWorth 品牌标识与品牌层级
 *
 * 用途：把万豪房价接口返回的品牌代号（property.basicInformation.brand.id）
 * 转换为 StayWorth 内部使用的品牌 slug 与 PortfolioTier。
 *
 * 规则：
 * 1. 一律用品牌代号匹配，不用品牌名。品牌名存在中英混排、历史改名和地区差异。
 * 2. brandSlug 尽量与 app/lib/brand-points.ts 的 id 保持一致，便于积分倍率复用。
 * 3. 只在真实接口响应中观察到的代号才写入 marriottBrandMappings。
 *    未能验证的品牌放在 pendingBrands，核对前不得参与计算。
 * 4. 未映射的品牌计入「其他」；未映射比例超过 5% 时当日结果标记为不可信。
 *
 * 详见 docs/DATA_SAMPLING_SPEC.md 第七节。
 */

export const BRAND_TIER_REFERENCE_DATE = "2026-09-27";

export type MarriottBrandMapping = {
  /** 接口品牌代号，如 JW、CY、XF */
  code: string;
  /** StayWorth 内部品牌标识，对应 app/lib/brand-points.ts 的 id */
  brandSlug: string;
  /** 接口返回的英文品牌名 */
  nameEn: string;
  /** StayWorth 组合层级 */
  tier: PortfolioTier;
  /** 是否已在真实接口响应中验证过该代号 */
  verified: boolean;
};

/**
 * 已通过真实响应验证的品牌映射（2026-09-27，样本覆盖上海、东京）。
 * 共 22 个代号。
 */
export const marriottBrandMappings: MarriottBrandMapping[] = [
  // Luxury
  { code: "RZ", brandSlug: "ritz-carlton", nameEn: "The Ritz-Carlton", tier: "Luxury", verified: true },
  { code: "XR", brandSlug: "st-regis", nameEn: "St. Regis", tier: "Luxury", verified: true },
  { code: "LC", brandSlug: "luxury-collection", nameEn: "Luxury Collection", tier: "Luxury", verified: true },
  { code: "WH", brandSlug: "w-hotels", nameEn: "W Hotels", tier: "Luxury", verified: true },
  { code: "JW", brandSlug: "jw-marriott", nameEn: "JW Marriott", tier: "Luxury", verified: true },
  { code: "BG", brandSlug: "bvlgari", nameEn: "Bvlgari Hotels and Resorts", tier: "Luxury", verified: true },
  { code: "EB", brandSlug: "edition", nameEn: "EDITION", tier: "Luxury", verified: true },

  // Premium
  { code: "MC", brandSlug: "marriott-hotels", nameEn: "Marriott Hotels & Resorts", tier: "Premium", verified: true },
  { code: "SI", brandSlug: "sheraton", nameEn: "Sheraton", tier: "Premium", verified: true },
  { code: "WI", brandSlug: "westin", nameEn: "Westin Hotels & Resorts", tier: "Premium", verified: true },
  { code: "MD", brandSlug: "le-meridien", nameEn: "Le Meridien", tier: "Premium", verified: true },
  { code: "BR", brandSlug: "renaissance", nameEn: "Renaissance Hotels", tier: "Premium", verified: true },
  { code: "DE", brandSlug: "delta-hotels", nameEn: "Delta Hotels", tier: "Premium", verified: true },

  // Select
  { code: "CY", brandSlug: "courtyard", nameEn: "Courtyard", tier: "Select", verified: true },
  { code: "FP", brandSlug: "four-points", nameEn: "Four Points by Sheraton", tier: "Select", verified: true },
  { code: "XF", brandSlug: "four-points-flex", nameEn: "Four Points Flex by Sheraton", tier: "Select", verified: true },
  { code: "FI", brandSlug: "fairfield", nameEn: "Fairfield Inn & Suites", tier: "Select", verified: true },
  { code: "AR", brandSlug: "ac-hotels", nameEn: "AC Hotels", tier: "Select", verified: true },
  { code: "AL", brandSlug: "aloft", nameEn: "Aloft by Marriott", tier: "Select", verified: true },
  { code: "OX", brandSlug: "moxy", nameEn: "Moxy Hotels", tier: "Select", verified: true },
  { code: "SH", brandSlug: "springhill-suites", nameEn: "SpringHill Suites", tier: "Select", verified: true },
  { code: "XE", brandSlug: "city-express", nameEn: "City Express by Marriott", tier: "Select", verified: true },

  // Longer Stays
  { code: "ER", brandSlug: "marriott-executive-apartments", nameEn: "Marriott Executive Apartments", tier: "Longer Stays", verified: true },
  { code: "RI", brandSlug: "residence-inn", nameEn: "Residence Inn", tier: "Longer Stays", verified: true },
  { code: "TS", brandSlug: "towneplace-suites", nameEn: "TownePlace Suites", tier: "Longer Stays", verified: true },
  { code: "EL", brandSlug: "element", nameEn: "Element by Marriott", tier: "Longer Stays", verified: true },

  // Collections
  { code: "AK", brandSlug: "autograph-collection", nameEn: "Autograph Collection", tier: "Collections", verified: true },
  { code: "DS", brandSlug: "design-hotels", nameEn: "Design Hotels", tier: "Collections", verified: true },
  { code: "TX", brandSlug: "tribute-portfolio", nameEn: "Tribute", tier: "Collections", verified: true },
  { code: "CM", brandSlug: "citizenm", nameEn: "citizenM", tier: "Collections", verified: true },
];

/**
 * 层级已确定、但 API 代号尚未在真实响应中观察到的品牌。
 * 首次抓取出现时，从响应里读出代号并移入 marriottBrandMappings，同时更新参考日期。
 */
export const pendingBrands: Array<{
  brandSlug: string;
  nameEn: string;
  tier: PortfolioTier;
  note?: string;
}> = [
  // Luxury
  { brandSlug: "ritz-carlton-reserve", nameEn: "Ritz-Carlton Reserve", tier: "Luxury" },

  // Premium
  { brandSlug: "gaylord-hotels", nameEn: "Gaylord Hotels", tier: "Premium" },

  // Select
  { brandSlug: "protea-hotels", nameEn: "Protea Hotels by Marriott", tier: "Select" },
  { brandSlug: "apartments", nameEn: "Apartments by Marriott Bonvoy", tier: "Longer Stays" },
  { brandSlug: "homes-villas", nameEn: "Homes & Villas by Marriott Bonvoy", tier: "Longer Stays" },

  // Collections
  { brandSlug: "mgm-collection", nameEn: "MGM Collection with Marriott Bonvoy", tier: "Collections" },
  { brandSlug: "outdoor-collection", nameEn: "Outdoor Collection by Marriott Bonvoy", tier: "Collections" },
];

/**
 * 已识别、但明确不归入五档的独立品牌（单独列出）。
 *
 * 处理方式：样本仍然保留，并参与「全球参考值」与「主要国家」两个视图；
 * 只是不进入「品牌档位」视图，避免把跨档品牌硬塞进单一档位造成失真。
 * 页面与报告需要把它们单独成行，不能并进任何一档，也不能计为「未映射」。
 */
export type SeparateBrand = {
  /** 接口品牌代号 */
  code: string;
  /** StayWorth 品牌标识 */
  brandSlug: string;
  nameEn: string;
  /** 为什么要单独列出，便于审计 */
  reason: string;
};

export const separateBrands: SeparateBrand[] = [
  {
    code: "SE",
    brandSlug: "series-by-marriott",
    nameEn: "Series by Marriott",
    reason:
      "横跨多个档位的转换品牌（见 brand-points.ts 的大中华区与其它地区分支），归入单一档位会失真。",
  },
  {
    code: "MV",
    brandSlug: "marriott-vacation-club",
    nameEn: "Marriott Vacation Club",
    reason: "度假所有权品牌，不属于标准五档中的任何一档。",
  },
];

const byCode = new Map<string, MarriottBrandMapping>(
  marriottBrandMappings.map((mapping) => [mapping.code, mapping]),
);

const bySlug = new Map<string, MarriottBrandMapping>(
  marriottBrandMappings.map((mapping) => [mapping.brandSlug, mapping]),
);

/** 按接口品牌代号查询映射；未知代号返回 null，调用方需计入「其他」。 */
export function brandMappingForCode(code: string): MarriottBrandMapping | null {
  return byCode.get(code.trim().toUpperCase()) ?? null;
}

/** 按 StayWorth 品牌 slug 查询映射。 */
export function brandMappingForSlug(slug: string): MarriottBrandMapping | null {
  return bySlug.get(slug) ?? null;
}

/** 按接口品牌代号直接取得组合层级；未知代号返回 null。 */
export function portfolioTierForCode(code: string): PortfolioTier | null {
  return brandMappingForCode(code)?.tier ?? null;
}

const separateByCode = new Map<string, SeparateBrand>(
  separateBrands.map((brand) => [brand.code, brand]),
);

/**
 * 查询「单独列出」的品牌。
 * 返回非空表示该品牌已识别、但不应归入五档，样本需保留且层级为 null。
 */
export function separateBrandForCode(code: string): SeparateBrand | null {
  return separateByCode.get(code.trim().toUpperCase()) ?? null;
}

/**
 * StayWorth Index 聚合层：把清洗后的样本聚合成三个视图。
 *
 * 三条铁律（见 docs/DATA_SAMPLING_SPEC.md 第六节）：
 * 1. 两步聚合：先在城市内取中位数，再跨城市取中位数。绝不直接对所有酒店求平均。
 * 2. 城市有效样本少于 MIN_CITY_SAMPLES 家时整城剔除，不参与任何上层聚合。
 * 3. 汇率只用于展示层换算；缺汇率的样本被排除并单独计数，不猜测、不静默丢弃。
 */

import type { PortfolioTier } from "../types/hotel";
// 运行时被 Node 直接执行的模块之间必须带扩展名（见 DEVELOPMENT_NOTES 的既有结论）。
import { median, quantile, type IndexSample } from "./index-sampling.ts";

/** 城市有效样本下限（规格 6.3）。 */
export const MIN_CITY_SAMPLES = 8;

/**
 * 档位单元格下限：某个城市在某个档位上的样本数。
 *
 * 比城市下限低得多，原因见规格附录 E：面板收敛到「每个国家一个代表城市」后，
 * 单个城市的高端酒店本来就少（华盛顿 2 家、西雅图 2 家、明尼阿波利斯 3 家）。
 * 如果继续套用 8 家，整个 Luxury 档会被剔空、页面直接无数字。
 *
 * 这不放弃城市级下限：城市仍须先用全部品牌合计达到 MIN_CITY_SAMPLES 家，
 * 才有资格进入任何分组；这里只放宽「城市 × 档位」这一格。
 */
export const MIN_TIER_CELL_SAMPLES = 2;

export const PORTFOLIO_TIER_ORDER: PortfolioTier[] = [
  "Luxury",
  "Premium",
  "Select",
  "Longer Stays",
  "Collections",
];

/** 单独列出品牌的展示名（不参与档位对比）。 */
export const SEPARATE_TIER_LABEL = "单独列出";

/** 把 amount 从 from 换算到 to；无法换算时返回 null（不猜汇率）。 */
export type ConvertCurrency = (
  amount: number,
  from: string,
  to: string,
) => number | null;

export type IndexViewRow = {
  /** 分组键：城市 slug、档位名或国家代码 */
  key: string;
  label: string;
  /** 该行使用的计价币种 */
  currencyCode: string;
  /** 两步聚合后的中位数 */
  value: number | null;
  p25: number | null;
  p75: number | null;
  /** 参与聚合的样本数（剔除了样本不足的城市） */
  sampleCount: number;
  /** 参与聚合的城市数 */
  cityCount: number;
};

export type IndexViewExclusion = {
  currencyCode: string;
  sampleCount: number;
};

export type IndexView = {
  id: "global" | "tier" | "country";
  /** 该视图的计价币种；全球与档位视图为统一货币，国家视图为「各自当地货币」 */
  currencyCode: string | null;
  rows: IndexViewRow[];
  sampleCount: number;
  cityCount: number;
  /** 因缺少汇率而未能计入的样本 */
  exclusions: IndexViewExclusion[];
};

export type CityBucket = {
  citySlug: string;
  values: number[];
  median: number;
  sampleCount: number;
};

/**
 * 第一步：按城市取中位数。
 * 换算失败或样本不足的城市会被剔除并计数。
 */
export function cityMedians(
  samples: IndexSample[],
  target: string | null,
  convert: ConvertCurrency,
  groupKey: (sample: IndexSample) => string,
  minSamples: number = MIN_CITY_SAMPLES,
): { buckets: CityBucket[]; skippedCities: number; exclusions: Map<string, number> } {
  const byCity = new Map<string, IndexSample[]>();
  for (const sample of samples) {
    const key = groupKey(sample);
    const list = byCity.get(key) ?? [];
    list.push(sample);
    byCity.set(key, list);
  }

  const exclusions = new Map<string, number>();
  const buckets: CityBucket[] = [];
  let skippedCities = 0;

  for (const [cityKey, citySamples] of byCity) {
    const values: number[] = [];
    for (const sample of citySamples) {
      if (target === null || sample.currencyCode === target) {
        values.push(sample.valuePerTenThousand);
        continue;
      }
      const converted = convert(
        sample.valuePerTenThousand,
        sample.currencyCode,
        target,
      );
      if (converted === null) {
        exclusions.set(
          sample.currencyCode,
          (exclusions.get(sample.currencyCode) ?? 0) + 1,
        );
        continue;
      }
      values.push(converted);
    }

    if (values.length < minSamples) {
      skippedCities += 1;
      continue;
    }

    const center = median(values);
    if (center === null || center <= 0) {
      skippedCities += 1;
      continue;
    }
    buckets.push({
      citySlug: cityKey,
      values,
      median: center,
      sampleCount: values.length,
    });
  }

  return { buckets, skippedCities, exclusions };
}

function exclusionsToRows(exclusions: Map<string, number>): IndexViewExclusion[] {
  return [...exclusions.entries()]
    .map(([currencyCode, sampleCount]) => ({ currencyCode, sampleCount }))
    .sort((a, b) => b.sampleCount - a.sampleCount);
}

/**
 * 先用全部品牌合计筛出合格城市（≥ MIN_CITY_SAMPLES 家），
 * 再让这些城市进入各个分组。这样「城市」始终是第一层抽样单位，
 * 分组内再按城市取中位数，不会因为某档酒店少就整档消失。
 */
function qualifyingCityKeys(
  samples: IndexSample[],
  target: string,
  convert: ConvertCurrency,
): Set<string> {
  const { buckets } = cityMedians(samples, target, convert, (sample) => sample.citySlug);
  return new Set(buckets.map((bucket) => bucket.citySlug));
}

/** 视图一：全球参考值（不区分档位与国家），统一货币口径。 */
export function globalView(
  samples: IndexSample[],
  targetCurrency: string,
  convert: ConvertCurrency,
): IndexView {
  const { buckets, exclusions } = cityMedians(
    samples,
    targetCurrency,
    convert,
    (sample) => sample.citySlug,
  );
  const cityValues = buckets.map((bucket) => bucket.median);
  const row: IndexViewRow = {
    key: "global",
    label: "全部品牌",
    currencyCode: targetCurrency,
    value: median(cityValues),
    p25: quantile(cityValues, 0.25),
    p75: quantile(cityValues, 0.75),
    sampleCount: buckets.reduce((sum, bucket) => sum + bucket.sampleCount, 0),
    cityCount: buckets.length,
  };
  return {
    id: "global",
    currencyCode: targetCurrency,
    rows: [row],
    sampleCount: row.sampleCount,
    cityCount: row.cityCount,
    exclusions: exclusionsToRows(exclusions),
  };
}

/**
 * 视图二：品牌档位。
 * 五档各一行；层级为空的样本（Series by Marriott、Marriott Vacation Club）
 * 单独成行，不并进任何一档。
 */
export function tierView(
  samples: IndexSample[],
  targetCurrency: string,
  convert: ConvertCurrency,
): IndexView {
  const rows: IndexViewRow[] = [];
  const exclusions = new Map<string, number>();
  let sampleCount = 0;
  // 同一城市可能同时出现在多个档位里，城市数必须去重后再报，否则会被重复计数。
  const contributingCities = new Set<string>();

  // 第一层：城市是否合格，只看该城市全部品牌的合计样本量。
  const cityKeys = qualifyingCityKeys(samples, targetCurrency, convert);
  const eligible = samples.filter((sample) => cityKeys.has(sample.citySlug));

  const groups: Array<{ key: string; label: string; tier: PortfolioTier | null }> = [
    ...PORTFOLIO_TIER_ORDER.map((tier) => ({ key: tier, label: tier, tier })),
    { key: "separate", label: SEPARATE_TIER_LABEL, tier: null },
  ];

  for (const group of groups) {
    const groupSamples = eligible.filter((sample) =>
      group.tier === null
        ? sample.portfolioTier === null
        : sample.portfolioTier === group.tier,
    );
    const { buckets, exclusions: groupExclusions } = cityMedians(
      groupSamples,
      targetCurrency,
      convert,
      (sample) => sample.citySlug,
      MIN_TIER_CELL_SAMPLES,
    );
    for (const [currencyCode, count] of groupExclusions) {
      exclusions.set(currencyCode, (exclusions.get(currencyCode) ?? 0) + count);
    }
    const cityValues = buckets.map((bucket) => bucket.median);
    const groupSampleCount = buckets.reduce(
      (sum, bucket) => sum + bucket.sampleCount,
      0,
    );
    sampleCount += groupSampleCount;
    for (const bucket of buckets) contributingCities.add(bucket.citySlug);
    rows.push({
      key: group.key,
      label: group.label,
      currencyCode: targetCurrency,
      value: median(cityValues),
      p25: quantile(cityValues, 0.25),
      p75: quantile(cityValues, 0.75),
      sampleCount: groupSampleCount,
      cityCount: buckets.length,
    });
  }

  return {
    id: "tier",
    currencyCode: targetCurrency,
    rows,
    sampleCount,
    cityCount: contributingCities.size,
    exclusions: exclusionsToRows(exclusions),
  };
}

/**
 * 视图三：主要国家。
 * 每个国家用当地货币口径（同一国家在面板中只有一种币种），不做隐式换算。
 */
export function countryView(
  samples: IndexSample[],
  countryOf: (sample: IndexSample) => { code: string; label: string } | null,
): IndexView {
  const byCountry = new Map<string, { label: string; samples: IndexSample[] }>();
  for (const sample of samples) {
    const country = countryOf(sample);
    if (!country) continue;
    const entry = byCountry.get(country.code) ?? { label: country.label, samples: [] };
    entry.samples.push(sample);
    byCountry.set(country.code, entry);
  }

  const rows: IndexViewRow[] = [];
  for (const [code, entry] of byCountry) {
    // 防卫：同一国家在面板里只有一种当地货币。若仍有别的币种混入（例如半径搜索带进来的邻国酒店），
    // 按多数派取币种、其余剔除，绝不做跨币种混合的中位数。
    const currencyCounts = new Map<string, number>();
    for (const sample of entry.samples) {
      currencyCounts.set(
        sample.currencyCode,
        (currencyCounts.get(sample.currencyCode) ?? 0) + 1,
      );
    }
    const currency =
      [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const currencySamples = entry.samples.filter(
      (sample) => sample.currencyCode === currency,
    );
    const { buckets } = cityMedians(
      currencySamples,
      null,
      () => null,
      (sample) => sample.citySlug,
    );
    const cityValues = buckets.map((bucket) => bucket.median);
    rows.push({
      key: code,
      label: entry.label,
      currencyCode: currency,
      value: median(cityValues),
      p25: quantile(cityValues, 0.25),
      p75: quantile(cityValues, 0.75),
      sampleCount: buckets.reduce((sum, bucket) => sum + bucket.sampleCount, 0),
      cityCount: buckets.length,
    });
  }

  rows.sort((a, b) => b.sampleCount - a.sampleCount);

  return {
    id: "country",
    currencyCode: null,
    rows,
    sampleCount: rows.reduce((sum, row) => sum + row.sampleCount, 0),
    cityCount: rows.reduce((sum, row) => sum + row.cityCount, 0),
    exclusions: [],
  };
}

// StayWorth Index 的在线接口：运行时直接从 D1 聚合，不再依赖本地导出的 JSON。
//
// 这样每日抓取只需要写 D1，页面刷新就能拿到当天数据，
// 不需要「导出 -> 提交 -> 部署」这条人工链，整个服务可以留在 Cloudflare 上。
//
// 聚合逻辑复用 app/lib/index-aggregation.ts（同一份纯函数，已单测），
// 因此接口与本地导出不会出现两套口径。

import { CITY_PANEL_VERSION, cityPanel, displayOnlyCitySlugs } from "../app/data/city-panel.ts";
import { separateBrands } from "../app/data/marriott-brand-tiers.ts";
import {
  FX_BASE,
  FX_FALLBACK_RATES,
  FX_FALLBACK_REFERENCE_DATE,
  FX_FALLBACK_SOURCE_NAME,
  FX_FALLBACK_SOURCE_URL,
  makeConverter,
} from "../app/data/index-fx.ts";
import {
  cityView,
  countryView,
  globalView,
  tierView,
} from "../app/lib/index-aggregation.ts";
import type { IndexSample } from "../app/lib/index-sampling.ts";
import { pickDisplayRun } from "../app/lib/index-run-selection.ts";
import type { HotelDatabase } from "./hotels-api.ts";

type RunRow = {
  id: number;
  run_key: string;
  panel_version: string | null;
  days_ahead: number;
  nights: number;
  cities_ok: number;
};

type SampleRow = {
  citySlug: string;
  checkIn: string;
  checkOut: string;
  capturedAt: string;
  hotelCode: string;
  hotelName: string;
  brandCode: string;
  brandSlug: string | null;
  portfolioTier: string | null;
  currencyCode: string;
  cashTotalMinor: number;
  cashTotalDecimalPoint: number;
  cashAmountMinor: number;
  cashAmountDecimalPoint: number;
  feesMinor: number;
  taxesMinor: number;
  points: number;
  membersOnly: number;
  valuePer10k: number;
};

type FxRow = {
  currencyCode: string;
  rate: number;
  sourceName: string;
  sourceUrl: string;
  providerUpdatedAt: string | null;
  fetchedAt: string;
};

function toIndexSample(row: SampleRow): IndexSample {
  return {
    citySlug: row.citySlug,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    capturedAt: row.capturedAt,
    hotelCode: row.hotelCode,
    hotelName: row.hotelName,
    brandCode: row.brandCode,
    brandSlug: row.brandSlug,
    portfolioTier: row.portfolioTier as IndexSample["portfolioTier"],
    currencyCode: row.currencyCode,
    cash: {
      totalMinor: row.cashTotalMinor,
      totalDecimalPoint: row.cashTotalDecimalPoint,
      amountMinor: row.cashAmountMinor,
      amountDecimalPoint: row.cashAmountDecimalPoint,
      feesMinor: row.feesMinor,
      feesDecimalPoint: row.cashAmountDecimalPoint,
      taxesMinor: row.taxesMinor,
      taxesDecimalPoint: row.cashAmountDecimalPoint,
    },
    points: row.points,
    membersOnly: row.membersOnly === 1,
    valuePerTenThousand: row.valuePer10k,
  };
}

// 组装 Index 响应。没有任何可用批次时返回 status: empty，
// 由前端显示「暂无数据」，而不是编造数字。
export async function buildIndexPayload(database: HotelDatabase) {
  // 取最近 10 个已完成批次，再挑出覆盖足够城市的那一个。
  // 只按 id 取最新会选中开发期的一城验证批次，让「全球参考值」由一个城市算出来。
  const runResult = await database
    .prepare(
      `SELECT id, run_key, panel_version, days_ahead, nights, cities_ok
       FROM index_runs
       WHERE status IN ('ok', 'partial')
       ORDER BY id DESC LIMIT 10`,
    )
    .all<RunRow>();
  const run = pickDisplayRun(
    (runResult.results ?? []).map((row) => ({
      ...row,
      citiesOk: Number(row.cities_ok),
    })),
    cityPanel.length,
  ) as RunRow | null;
  if (!run) return { status: "empty" as const };

  const sampleResult = await database
    .prepare(
      `SELECT
         city_slug AS "citySlug", check_in AS "checkIn", check_out AS "checkOut",
         captured_at AS "capturedAt", hotel_code AS "hotelCode", hotel_name AS "hotelName",
         brand_code AS "brandCode", brand_slug AS "brandSlug",
         portfolio_tier AS "portfolioTier", currency_code AS "currencyCode",
         cash_total_minor AS "cashTotalMinor",
         cash_total_decimal_point AS "cashTotalDecimalPoint",
         cash_amount_minor AS "cashAmountMinor",
         cash_amount_decimal_point AS "cashAmountDecimalPoint",
         fees_minor AS "feesMinor", taxes_minor AS "taxesMinor",
         points, members_only AS "membersOnly", value_per_10k AS "valuePer10k"
       FROM index_samples
       WHERE run_id = ?
       ORDER BY city_slug, hotel_code`,
    )
    .bind(run.id)
    .all<SampleRow>();

  const stored = (sampleResult.results ?? []).map(toIndexSample);
  if (stored.length === 0) return { status: "empty" as const };

  // 仅作展示的城市不进入任何聚合层
  const displayOnly = new Set(displayOnlyCitySlugs);
  const samples = stored.filter((sample) => !displayOnly.has(sample.citySlug));

  // 当日汇率；取不到就退回带日期戳的兜底表，并在响应里标 usedFallback
  let fxSourceName = FX_FALLBACK_SOURCE_NAME;
  let fxSourceUrl = FX_FALLBACK_SOURCE_URL;
  let fxReferenceDate = FX_FALLBACK_REFERENCE_DATE;
  let rates: Record<string, number> = { ...FX_FALLBACK_RATES };
  let usedFallback = true;
  try {
    const fxResult = await database
      .prepare(
        `SELECT currency_code AS "currencyCode", rate,
                source_name AS "sourceName", source_url AS "sourceUrl",
                provider_updated_at AS "providerUpdatedAt", fetched_at AS "fetchedAt"
         FROM fx_rates
         WHERE base = ?
           AND fetched_at = (SELECT MAX(fetched_at) FROM fx_rates WHERE base = ?)`,
      )
      .bind(FX_BASE, FX_BASE)
      .all<FxRow>();
    const fxRows = fxResult.results ?? [];
    if (fxRows.length > 0) {
      rates = Object.fromEntries(fxRows.map((row) => [row.currencyCode, Number(row.rate)]));
      fxSourceName = fxRows[0].sourceName;
      fxSourceUrl = fxRows[0].sourceUrl;
      const providerDate = fxRows[0].providerUpdatedAt
        ? new Date(fxRows[0].providerUpdatedAt)
        : null;
      const reference =
        providerDate && !Number.isNaN(providerDate.getTime())
          ? providerDate
          : new Date(fxRows[0].fetchedAt);
      fxReferenceDate = reference.toISOString().slice(0, 10);
      usedFallback = false;
    }
  } catch {
    // 汇率表读不到不影响参考值本身，保留兜底表并如实标记
  }

  const convert = makeConverter(rates);
  const displayCurrencies = ["CNY", "USD"];
  const cityBySlug = new Map(cityPanel.map((city) => [city.slug, city]));

  const byCurrency = Object.fromEntries(
    displayCurrencies.map((currency) => [
      currency,
      {
        global: globalView(samples, currency, convert),
        tier: tierView(samples, currency, convert),
      },
    ]),
  );

  const country = countryView(samples, (sample) => {
    const city = cityBySlug.get(sample.citySlug);
    return city ? { code: city.countryCode, label: city.countryNameZh } : null;
  });
  const city = cityView(samples, (slug) => cityBySlug.get(slug)?.nameZh ?? slug);

  const separateRows = separateBrands.map((brand) => {
    const brandSamples = samples.filter((sample) => sample.brandCode === brand.code);
    return {
      code: brand.code,
      nameEn: brand.nameEn,
      brandSlug: brand.brandSlug,
      reason: brand.reason,
      sampleCount: brandSamples.length,
      cityCount: new Set(brandSamples.map((sample) => sample.citySlug)).size,
      currencies: [...new Set(brandSamples.map((sample) => sample.currencyCode))].sort(),
    };
  });

  return {
    status: "ok" as const,
    payload: {
      generatedAt: new Date().toISOString(),
      runKey: run.run_key,
      window: { daysAhead: run.days_ahead, nights: run.nights },
      panelVersion: run.panel_version ?? CITY_PANEL_VERSION,
      sampleCount: samples.length,
      cityCount: new Set(samples.map((sample) => sample.citySlug)).size,
      currency: {
        display: "CNY",
        options: displayCurrencies,
        base: FX_BASE,
        referenceDate: fxReferenceDate,
        sourceName: fxSourceName,
        sourceUrl: fxSourceUrl,
        nonRealTime: true,
        usedFallback,
        // 供前端做当地货币换算，与 Index 自身同源
        rates,
      },
      views: { byCurrency, country, city },
      separateBrands: separateRows,
      note:
        "参考值来自抽样估算，使用各酒店含税含费的最低可用现金价与同期积分兑换价，" +
        "非官方报价，也不代表可预订。",
    },
  };
}

export async function handleIndexRequest(database: HotelDatabase) {
  try {
    const result = await buildIndexPayload(database);
    if (result.status === "empty") {
      return Response.json(
        { status: "empty", message: "暂无采样数据" },
        { headers: { "cache-control": "no-store" } },
      );
    }
    return Response.json(
      { status: "ok", ...result.payload },
      {
        headers: {
          // 每天只更新一次，短缓存足够，也省 D1 读取
          "cache-control": "public, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("Index aggregation failed", error);
    return Response.json(
      { status: "error", message: "参考值计算失败。" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

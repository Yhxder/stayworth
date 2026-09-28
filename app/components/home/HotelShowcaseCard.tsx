"use client";

import { useEffect, useState } from "react";
import { HotelImage } from "../search/HotelImage";

/** 卡片下方的统一业务指标：全站唯一命名「每万分兑换价值」。 */
export type ShowcaseMetric = {
  /** 指标名，固定为「每万分兑换价值」。 */
  label: string;
  /** 中位数，缺失时为 null。 */
  value: number | null;
  currencyCode: string;
  p25: number | null;
  p75: number | null;
  /** 口径说明：市场参考中位数 / 覆盖范围。 */
  scopeLabel: string;
  sampleCount: number;
  cityCount: number;
  /** 抽样日期，YYYY-MM-DD。 */
  snapshotDate: string;
};

type FeaturedHotel = {
  code: string;
  nameZh: string;
  nameEn: string;
  cityNameZh: string;
  imagePath: string | null;
  imageSourceLabel: string;
};

type HotelShowcaseCardProps = {
  metric: ShowcaseMetric;
};

const amountFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/**
 * 首屏右侧的市场参考小卡（内容层，Operate 版式）。
 *
 * 三件事必须同时成立才算合格：
 * 1. 图是真实酒店 Banner，且只经 IMAGE_PROXY_URL 代理加载（浏览器不直连第三方 CDN），
 *    来源标注始终可见；
 * 2. 面板是近乎实心的深色高档面，不是"玻璃叠玻璃"；
 * 3. 指标名与全站一致（每万分兑换价值），并写明这是市场口径而不是这家酒店的成交价。
 *
 * 它只是判断依据，不是首屏主角：横向排布、照片收窄，主操作留给下方的搜索面板。
 */
export function HotelShowcaseCard({ metric }: HotelShowcaseCardProps) {
  const [hotel, setHotel] = useState<FeaturedHotel | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/catalog/featured", {
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { hotel?: FeaturedHotel | null };
        if (!cancelled) setHotel(body.hotel ?? null);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !hotel) {
    return (
      <article className="market-card">
        <div className="market-card-figure is-empty">
          <span>官方图片暂不可用</span>
        </div>
        <div className="market-card-body">
          <p className="market-card-city">真实酒店目录</p>
          <h2 className="market-card-name">酒店示例暂不可用</h2>
          <MarketMetric metric={metric} />
        </div>
      </article>
    );
  }

  return (
    <article className="market-card">
      <figure className="market-card-figure">
        <HotelImage
          imagePath={hotel.imagePath}
          nameZh={hotel.nameZh}
          priority
        />
      </figure>
      <div className="market-card-body">
        <p className="market-card-city">{hotel.cityNameZh}</p>
        <h2 className="market-card-name">{hotel.nameZh}</h2>
        <MarketMetric metric={metric} />
        <p className="market-card-credit">
          图片：{hotel.imageSourceLabel}，经本站代理加载
        </p>
      </div>
    </article>
  );
}

/**
 * 市场参考区块。它和上面那家酒店不是一回事：一个单店，一个市场，
 * 所以单独成块并写明口径，避免大数字被读成「这家酒店值多少」。
 */
function MarketMetric({ metric }: { metric: ShowcaseMetric }) {
  return (
    <div className="market-metric">
      <span className="market-metric-label">
        市场参考 · {metric.label}（{metric.scopeLabel}）
      </span>
      <span className="market-metric-value">
        {metric.value === null ? "-" : amountFormatter.format(metric.value)}
        <small>{metric.currencyCode} / 万分</small>
      </span>
      <span className="market-metric-range">
        P25 {metric.p25 === null ? "-" : amountFormatter.format(metric.p25)}
        {" - "}
        P75 {metric.p75 === null ? "-" : amountFormatter.format(metric.p75)}
      </span>
      <p className="market-metric-note">
        抽样日期 {metric.snapshotDate}，覆盖 {metric.cityCount} 城 /{" "}
        {metric.sampleCount} 家样本；市场口径，不是这家酒店的成交价。
      </p>
    </div>
  );
}

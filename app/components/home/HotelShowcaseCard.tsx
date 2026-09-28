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
 * 真实酒店展示卡（内容层）。
 *
 * 三件事必须同时成立才算合格：
 * 1. 图是真实酒店 Banner，且只经 IMAGE_PROXY_URL 代理加载（浏览器不直连第三方 CDN）；
 * 2. 面板是近乎实心的深色高档面，不是"玻璃叠玻璃"；
 * 3. 指标名与全站一致（每万分兑换价值），并写明这是市场口径而不是这家酒店的成交价。
 *
 * 悬停只淡入一层金色环境光并让 1px 发丝线提亮，不做 scale 放大。
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
      <article className="showcase-card">
        <div className="showcase-figure">
          <div className="hotel-photo-fallback">
            <strong>官方图片暂不可用</strong>
            <span>指标数据不受影响</span>
          </div>
        </div>
        <div className="showcase-body">
          <p className="showcase-meta">真实酒店目录</p>
          <h2 className="showcase-name">酒店示例暂不可用</h2>
          <MetricBlock metric={metric} />
        </div>
      </article>
    );
  }

  return (
    <article className="showcase-card">
      <figure className="showcase-figure">
        <HotelImage
          imagePath={hotel.imagePath}
          nameZh={hotel.nameZh}
          priority
        />
        <figcaption>图片：{hotel.imageSourceLabel}，经本站代理加载</figcaption>
      </figure>
      <div className="showcase-body">
        <p className="showcase-meta">{hotel.cityNameZh}</p>
        <h2 className="showcase-name">{hotel.nameZh}</h2>
        <MetricBlock metric={metric} />
      </div>
    </article>
  );
}

/**
 * 市场参考区块。它和上面那家酒店不是一回事：一个单店，一个市场，
 * 所以用分隔线与标题把它独立出来，避免大数字被读成「这家酒店值多少」。
 */
function MetricBlock({ metric }: { metric: ShowcaseMetric }) {
  return (
    <div className="showcase-metric">
      <p className="showcase-metric-title">市场参考</p>
      <span className="showcase-metric-label">
        {metric.label} · {metric.scopeLabel}
      </span>
      <span className="showcase-metric-value">
        {metric.value === null ? "-" : amountFormatter.format(metric.value)}
        <small>{metric.currencyCode} / 万分</small>
      </span>
      <span className="showcase-metric-range">
        P25 {metric.p25 === null ? "-" : amountFormatter.format(metric.p25)}
        {" - "}
        P75 {metric.p75 === null ? "-" : amountFormatter.format(metric.p75)}
      </span>
      <p className="showcase-note">
        抽样日期 {metric.snapshotDate}，覆盖 {metric.cityCount} 城 /{" "}
        {metric.sampleCount} 家样本。这是{metric.scopeLabel}的市场参考中位数，
        不是这家酒店的成交价。
      </p>
    </div>
  );
}

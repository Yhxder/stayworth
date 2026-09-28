"use client";

import { useEffect, useState } from "react";
import { IMAGE_WIDTHS, imageUrlAtWidth } from "../../lib/image-proxy";

type FeaturedHotel = {
  code: string;
  nameZh: string;
  nameEn: string;
  cityNameZh: string;
  imagePath: string | null;
  imageSourceLabel: string;
};

/**
 * 首页唯一的「奢华信号」：目录里真实酒店的官方图片，经本站 Worker 代理加载。
 *
 * 不是装饰图：下面写着酒店名与来源，加载失败或目录为空时给出同形状的图文回退，
 * 不会出现破图或空白盒子。图片由 /api/catalog/featured 决定，排序固定所以每次同一家。
 */
export function HeroImage() {
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

  const showPhoto = Boolean(hotel?.imagePath) && !failed;

  return (
    <figure className="hero-figure">
      {showPhoto && hotel?.imagePath ? (
        // 同上：图片来自本站代理，尺寸与缓存由 worker/media-proxy.ts 负责
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${hotel.nameZh} 官方图片`}
          decoding="async"
          fetchPriority="high"
          height={480}
          loading="eager"
          onError={() => setFailed(true)}
          sizes="(max-width: 1024px) 100vw, 420px"
          src={imageUrlAtWidth(hotel.imagePath, 1200)}
          srcSet={IMAGE_WIDTHS.map(
            (width) => `${imageUrlAtWidth(hotel.imagePath!, width)} ${width}w`,
          )
            .join(", ")}
          width={640}
        />
      ) : (
        <div className="hotel-photo-fallback">
          {failed || hotel === null ? (
            <>
              <strong>官方图片暂不可用</strong>
              <span>价格与积分数据不受影响</span>
            </>
          ) : (
            <>
              <strong>{hotel.nameZh}</strong>
              <span>官方图库暂无这家酒店的图片</span>
            </>
          )}
        </div>
      )}

      {hotel && showPhoto ? (
        <figcaption>
          <strong>{hotel.nameZh}</strong>
          图片：{hotel.imageSourceLabel}，经本站代理加载
        </figcaption>
      ) : null}
    </figure>
  );
}

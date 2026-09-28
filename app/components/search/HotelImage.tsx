"use client";

import { useState } from "react";
import { IMAGE_WIDTHS, imageUrlAtWidth } from "../../lib/image-proxy";

type HotelImageProps = {
  /** /media/hotel?src=... 的代理路径；null 表示目录里没有这家酒店。 */
  imagePath: string | null;
  nameZh: string;
  /** 结果里的第一家优先加载（loading.md：先给占位，再替换）。 */
  priority?: boolean;
};

/**
 * 酒店图片：加载中显示与最终形状一致的骨架，失败或没有图时给出图文回退，
 * 两种情况都保留酒店名与数字可读，不出现破图标。
 */
export function HotelImage({
  imagePath,
  nameZh,
  priority = false,
}: HotelImageProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    imagePath ? "loading" : "failed",
  );

  if (!imagePath || status === "failed") {
    return (
      <div
        aria-label={`${nameZh} 暂无官方图片`}
        className="hotel-photo-fallback"
        role="img"
      >
        <strong>{nameZh}</strong>
        <span>暂无官方图片，价格与积分仍可比较</span>
      </div>
    );
  }

  return (
    <>
      {status === "loading" ? (
        <span aria-hidden="true" className="hotel-photo-skeleton" />
      ) : null}
      {/* 图片走本站 Worker 代理（缓存与宽度压缩在代理层做），所以不用 next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${nameZh} 官方图片`}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        height={360}
        loading={priority ? "eager" : "lazy"}
        onError={() => setStatus("failed")}
        onLoad={() => setStatus("ready")}
        sizes="(max-width: 560px) 100vw, (max-width: 1024px) 50vw, 360px"
        src={imageUrlAtWidth(imagePath, 800)}
        srcSet={IMAGE_WIDTHS.map(
          (width) => `${imageUrlAtWidth(imagePath, width)} ${width}w`,
        ).join(", ")}
        width={640}
      />
    </>
  );
}

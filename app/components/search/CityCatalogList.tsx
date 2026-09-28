"use client";

import { useEffect, useState } from "react";

import { HotelImage } from "./HotelImage";

// 该城市在目录里有哪些酒店。价格与目录解耦：即使没有所选日期的采样价，
// 也要先把「这个地区有什么」列出来，只是明确标注没有价格。

type CatalogHotel = {
  code: string;
  nameZh: string;
  nameEn: string;
  brand: string;
  tier: string | null;
  cityNameZh: string;
  rating: number | null;
  reviewCount: number | null;
  imagePath: string | null;
};

export function CityCatalogList({ city }: { city: string }) {
  // 只记录「结果属于哪个城市」，加载态由 city 与结果是否匹配推导。
  // 这样 effect 里不需要同步 setState（会触发级联渲染，且被 lint 拦截）。
  const [entry, setEntry] = useState<{
    city: string;
    hotels: CatalogHotel[];
  } | null>(null);
  const [resolved, setResolved] = useState<{ city: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/catalog?city=${encodeURIComponent(city)}`, {
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          status?: string;
          city?: string;
          hotels?: CatalogHotel[];
        };
        if (cancelled) return;
        if (body.status !== "ok" || !body.hotels?.length) {
          setResolved({ city });
          return;
        }
        setEntry({
          city: body.city ?? city,
          hotels: body.hotels,
        });
        setResolved({ city });
      })
      .catch(() => {
        if (!cancelled) setResolved({ city });
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  const settled = resolved?.city === city;
  const ready = entry?.city === city ? entry : null;

  if (!settled) {
    return (
      <p className="catalog-note" role="status">
        正在读取酒店目录…
      </p>
    );
  }
  if (!ready) return null;

  return (
    <section aria-labelledby="city-catalog-title" className="city-catalog">
      <div className="city-catalog-head">
        <h3 id="city-catalog-title">
          {ready.city} · 目录里的 {ready.hotels.length} 家万豪酒店
        </h3>
        <p>
          这些是酒店目录里的名称与官方图片，与日期无关；
          <strong>不是价格</strong>。所选日期没有采样价格，所以这里不显示金额。
        </p>
      </div>
      <ul className="city-catalog-grid">
        {ready.hotels.map((hotel) => (
          <li key={hotel.code}>
            <HotelImage imagePath={hotel.imagePath} nameZh={hotel.nameZh} />
            <strong>{hotel.nameZh}</strong>
            <small>
              {hotel.brand}
              {hotel.tier ? ` · ${hotel.tier}` : ""}
              {hotel.rating ? ` · 评分 ${hotel.rating}` : ""}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 酒店目录的解析层：从房价接口响应里抽出**与日期无关**的酒店信息。
 *
 * 为什么复用同一个接口：实测 sitemap 不含酒店页面，而房价接口的每家酒店自带
 * 代号、中英文名、品牌、坐标、官方文案、评分和三种比例的 banner（曼谷 33/33 全带图）。
 * 目录因此可以「抓一次、长期用」，与每天变化的价格彻底解耦。
 *
 * 本文件是纯函数，不联网、不落库，便于单测。
 */

export type CatalogEntry = {
  hotelCode: string;
  nameZh: string;
  nameEn: string;
  brandCode: string;
  brandName: string;
  latitude: number | null;
  longitude: number | null;
  bannerClassicUrl: string | null;
  bannerWideUrl: string | null;
  bannerSquareUrl: string | null;
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  seoSlug: string | null;
  bookable: boolean;
};

/** 站点 CDN 主机：实测该主机返回 200 image/jpeg。 */
export const MARRIOTT_IMAGE_HOST = "https://www.marriott.com.cn";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** 把接口返回的相对图片路径补成可直接放进 <img> 的绝对地址。 */
export function absoluteImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${MARRIOTT_IMAGE_HOST}${path.startsWith("/") ? "" : "/"}${path}`;
}

function readImages(property: Record<string, unknown>): {
  classic: string | null;
  wide: string | null;
  square: string | null;
} {
  const media = asRecord(property.media);
  const primary = asRecord(media?.primaryImage);
  const node = asRecord(asRecord(asArray(primary?.edges)[0])?.node);
  const urls = asRecord(node?.imageUrls);
  return {
    classic: absoluteImageUrl(asString(urls?.classicHorizontal)),
    wide: absoluteImageUrl(asString(urls?.wideHorizontal)),
    square: absoluteImageUrl(asString(urls?.square)),
  };
}

function readDescription(basic: Record<string, unknown>): string | null {
  for (const entry of asArray(basic.descriptions)) {
    const text = asString(asRecord(entry)?.text);
    if (text) return text;
  }
  return null;
}

/**
 * 解析响应，抽出目录条目。
 * 兼容 searchByDestination（按城市名）与 searchByGeolocation（按坐标）两种结构。
 */
export function parseCatalogEntries(payload: unknown): CatalogEntry[] {
  const search = asRecord(asRecord(asRecord(payload)?.data)?.search);
  const lowest = asRecord(search?.lowestAvailableRates);
  if (!lowest) return [];
  const connection =
    asRecord(lowest.searchByDestination) ?? asRecord(lowest.searchByGeolocation);

  const entries: CatalogEntry[] = [];
  for (const edge of asArray(connection?.edges)) {
    const property = asRecord(asRecord(asRecord(edge)?.node)?.property);
    if (!property) continue;
    const basic = asRecord(property.basicInformation);
    if (!basic) continue;
    const brand = asRecord(basic.brand);

    const hotelCode = asString(property.id);
    const brandCode = asString(brand?.id);
    if (!hotelCode || !brandCode) continue;

    const images = readImages(property);
    const reviews = asRecord(property.reviews);
    const stars = asRecord(reviews?.stars);
    const numberOfReviews = asRecord(reviews?.numberOfReviews);
    const nameZh = asString(basic.name) ?? "";
    const nameEn = asString(basic.nameInDefaultLanguage) ?? nameZh;

    entries.push({
      hotelCode,
      nameZh,
      nameEn,
      brandCode,
      brandName: asString(brand?.name) ?? brandCode,
      latitude: asNumber(basic.latitude),
      longitude: asNumber(basic.longitude),
      bannerClassicUrl: images.classic,
      bannerWideUrl: images.wide,
      bannerSquareUrl: images.square,
      description: readDescription(basic),
      rating: asNumber(stars?.count),
      reviewCount: asNumber(numberOfReviews?.count),
      seoSlug: asString(property.seoNickname),
      bookable: basic.bookable === true,
    });
  }
  return entries;
}

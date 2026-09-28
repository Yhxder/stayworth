import assert from "node:assert/strict";
import test from "node:test";

import {
  MARRIOTT_IMAGE_HOST,
  absoluteImageUrl,
  parseCatalogEntries,
} from "../app/lib/hotel-catalog.ts";

/** 结构取自 2026-09-28 真实响应（曼谷），字段名与嵌套层级保持一致。 */
function payloadFor(nodes) {
  return {
    data: {
      search: {
        lowestAvailableRates: {
          searchByDestination: { edges: nodes.map((node) => ({ node })) },
        },
      },
    },
  };
}

const bangkokHotel = {
  property: {
    id: "BKKWO",
    seoNickname: "bangkok-w-hotel",
    basicInformation: {
      name: "曼谷 W 酒店",
      nameInDefaultLanguage: "W Bangkok",
      currency: "THB",
      latitude: 13.729265,
      longitude: 100.513758,
      bookable: true,
      brand: { __typename: "Brand", id: "WH", name: "W Hotels" },
      descriptions: [{ text: "酒店坐落于曼谷市中心", type: { code: "HOTEL MARKETING CAPTION" } }],
    },
    media: {
      primaryImage: {
        edges: [
          {
            node: {
              imageUrls: {
                classicHorizontal: "/content/dam/marriott-renditions/BKKWO/a.jpg",
                wideHorizontal: "/content/dam/marriott-renditions/BKKWO/b.jpg",
                square: "/content/dam/marriott-renditions/BKKWO/c.jpg",
              },
            },
          },
        ],
      },
    },
    reviews: {
      stars: { count: 4.6 },
      numberOfReviews: { count: 2225 },
    },
  },
};

test("turns relative DAM paths into absolute image URLs on the China host", () => {
  assert.equal(
    absoluteImageUrl("/content/dam/x.jpg"),
    `${MARRIOTT_IMAGE_HOST}/content/dam/x.jpg`,
  );
  assert.equal(absoluteImageUrl("https://cdn.example/x.jpg"), "https://cdn.example/x.jpg");
  assert.equal(absoluteImageUrl(null), null);
});

test("extracts every field the catalog needs from one response", () => {
  const [entry] = parseCatalogEntries(payloadFor([bangkokHotel]));
  assert.equal(entry.hotelCode, "BKKWO");
  assert.equal(entry.nameZh, "曼谷 W 酒店");
  assert.equal(entry.nameEn, "W Bangkok");
  assert.equal(entry.brandCode, "WH");
  assert.equal(entry.latitude, 13.729265);
  assert.equal(entry.rating, 4.6);
  assert.equal(entry.reviewCount, 2225);
  assert.equal(entry.seoSlug, "bangkok-w-hotel");
  assert.equal(entry.description, "酒店坐落于曼谷市中心");
  assert.equal(entry.bookable, true);
  assert.equal(entry.bannerClassicUrl, `${MARRIOTT_IMAGE_HOST}/content/dam/marriott-renditions/BKKWO/a.jpg`);
  assert.equal(entry.bannerWideUrl, `${MARRIOTT_IMAGE_HOST}/content/dam/marriott-renditions/BKKWO/b.jpg`);
  assert.equal(entry.bannerSquareUrl, `${MARRIOTT_IMAGE_HOST}/content/dam/marriott-renditions/BKKWO/c.jpg`);
});

test("keeps entries usable when optional fields are missing", () => {
  const bare = {
    property: {
      id: "XXX01",
      basicInformation: {
        name: "样例酒店",
        brand: { id: "MC", name: "Marriott Hotels & Resorts" },
      },
    },
  };
  const [entry] = parseCatalogEntries(payloadFor([bare]));
  assert.equal(entry.hotelCode, "XXX01");
  assert.equal(entry.nameEn, "样例酒店", "缺少英文名时回退到中文名");
  assert.equal(entry.bannerClassicUrl, null);
  assert.equal(entry.latitude, null);
  assert.equal(entry.bookable, false, "bookable 缺失时按 false 处理");
});

test("skips entries without a hotel code or brand", () => {
  assert.deepEqual(parseCatalogEntries(payloadFor([{ property: {} }])), []);
  assert.deepEqual(parseCatalogEntries({ data: {} }), []);
});

/**
 * 酒店图片代理。
 *
 * 为什么不让浏览器直连第三方 CDN：`hotel_catalog` 里的 banner 来自万豪官方图片主机，
 * 直连会把访客的 IP 与 Referer 交给第三方，也让图片缓存不受本站控制。
 * 代理层做三件事：主机白名单、Cache-Control、可选的宽度压缩。
 * 数据仍属万豪，页面必须标明来源，本站不转存、不转售。
 */

/** 只有这些主机允许被代理，且必须走 https。 */
const ALLOWED_HOSTS = new Set([
  "cache.marriott.com",
  "www.marriott.com.cn",
  "www.marriott.com",
]);

/** 只接受固定档位，避免被当成任意尺寸的图片服务。 */
const ALLOWED_WIDTHS = new Set([400, 800, 1200]);

const CACHE_SECONDS = 60 * 60 * 24 * 7;

type ImageBinding = {
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): {
      output(options: { format: string; quality: number }): Promise<{
        response(): Response;
      }>;
    };
  };
};

function badRequest(message: string, status = 400) {
  return new Response(message, {
    headers: { "cache-control": "no-store" },
    status,
  });
}

export async function handleHotelImageRequest(
  request: Request,
  images?: ImageBinding,
): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const source = params.get("src");
  if (!source) return badRequest("Missing src");

  let target: URL;
  try {
    target = new URL(source);
  } catch {
    return badRequest("Invalid src");
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return badRequest("Host not allowed", 403);
  }

  const widthParam = Number(params.get("w") ?? "0");
  const width = ALLOWED_WIDTHS.has(widthParam) ? widthParam : 0;

  const upstream = await fetch(target.toString(), {
    headers: { accept: "image/*" },
  });
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.startsWith("image/") || !upstream.body) {
    return badRequest("Upstream unavailable", 502);
  }

  const cacheHeaders = {
    "cache-control": `public, max-age=${CACHE_SECONDS}, immutable`,
    "x-content-type-options": "nosniff",
  };

  // 有 IMAGES 绑定时按档位压一版；压缩失败就退回原图，功能不受影响。
  // 本地预览（miniflare）没有图片转换绑定时会走回退，日志里能看见原因。
  if (width > 0 && images) {
    try {
      const transformed = await images
        .input(upstream.body)
        .transform({ width })
        .output({ format: "image/webp", quality: 78 });
      const response = transformed.response();
      return new Response(response.body, {
        headers: {
          ...cacheHeaders,
          "content-type": response.headers.get("content-type") ?? "image/webp",
        },
        status: 200,
      });
    } catch (error) {
      console.warn(
        `Hotel image resize skipped (width=${width})`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return new Response(upstream.body, {
    headers: { ...cacheHeaders, "content-type": contentType },
    status: 200,
  });
}

/**
 * 图片代理入口（预留接口）。
 *
 * 默认指向本站 Worker 的 `/media/hotel`：它做主机白名单、7 天不可变缓存，
 * 并按宽度输出 WebP（见 `worker/media-proxy.ts`）。
 * 未来换成自建 CDN 或别的代理，只改这一个常量，前端与接口一起生效。
 */
export const IMAGE_PROXY_URL = "/media/hotel";

/** 允许的宽度档位，前端 srcset 与 Worker 的校验保持一致。 */
export const IMAGE_WIDTHS = [400, 800, 1200] as const;

export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/** 拼出某个宽度的代理地址。 */
export function imageUrlAtWidth(
  proxyPath: string,
  width: ImageWidth,
): string {
  return `${proxyPath}&w=${width}`;
}

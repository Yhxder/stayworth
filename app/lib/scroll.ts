/**
 * 跳转定位的统一入口。
 *
 * 站内有三处「把视线带到别处」的动作：搜索完成后聚焦结果标题、
 * 并排比较后跳到比较表、带入回血计算器后跳到「不计分金额」。
 * 三处都走这里，桌面与手机、普通与降低动效下才是同一套行为。
 */

export type ScrollBlockPosition = "start" | "center";

export type ScrollTargetOptions = {
  block?: ScrollBlockPosition;
  /**
   * 需要让开的吸顶功能层（顶栏、比较托盘）。
   * 高度在跳转那一刻量：托盘会随选中酒店名的长度换行变高，写死数字迟早错位。
   */
  clear?: string[];
  /** 让开之后额外留出的呼吸距离。 */
  gap?: number;
};

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 只滚动必要的距离（scroll-views.md › Best practices：自动滚动要帮人保住上下文）。
 * 不指定功能层时按 CSS 的 scroll-margin-top 落位；
 * 指定了就让目标落在这些功能层下方，免得标题被吸顶的玻璃岛或托盘压住。
 * 降低动效时不播放平滑滚动，直接落位。
 */
export function scrollToElement(
  element: Element | null,
  { block = "start", clear = [], gap = 16 }: ScrollTargetOptions = {},
) {
  if (!element) return;

  const behavior = prefersReducedMotion() ? "auto" : "smooth";

  if (block === "center" || clear.length === 0) {
    element.scrollIntoView({ behavior, block });
    return;
  }

  const viewportHeight = window.innerHeight;
  const reserved = clear.reduce((bottom, selector) => {
    const node = document.querySelector(selector);
    if (!node) return bottom;

    const rect = node.getBoundingClientRect();
    // 只让开此刻确实停在视口里的功能层；还没滚到的元素不该把页面拉走
    if (rect.bottom <= 0 || rect.bottom >= viewportHeight) return bottom;

    return Math.max(bottom, rect.bottom);
  }, 0);

  window.scrollTo({
    behavior,
    top: Math.max(
      element.getBoundingClientRect().top + window.scrollY - reserved - gap,
      0,
    ),
  });
}

"use client";

import { useEffect, useRef } from "react";

import { isCanvasColor } from "../../lib/globe";

/**
 * 首屏背景：缓慢漂移的发光节点网络（照着 caylet.com 移动端 hero 做的）。
 *
 * 两个坑记在这里：
 * 1. 漂移幅度必须用**屏幕像素**，不能乘 viewBox 的缩放系数。乘了之后手机上的
 *    系数只有 0.25，幅度被压到几像素、周期又长，看起来就是静止的——桌面系数是 1
 *    所以看不出问题。节点位置按容器尺寸生成，漂移量直接加在屏幕坐标上。
 * 2. 动画循环不挂在 IntersectionObserver 上：hero 是 sticky 且外面有 overflow，
 *    观察回调在真机上可能报 not intersecting，一旦报 false 循环就停了。
 */

const DESKTOP_NODES = 34;
const MOBILE_NODES = 20;
/** 归一化坐标的池子：切换节点数时只增删，不会整体跳位。 */
const POOL_SIZE = DESKTOP_NODES;

/** 带标签的节点：窄屏没有地球，这几个名字就是"我们抽样了哪些城市"的视觉交代。 */
const LABELS: Record<number, string> = {
  2: "香港",
  7: "东京",
  13: "新加坡",
  18: "伦敦",
};

type SkyNode = {
  label?: string;
  phase: number;
  speed: number;
  swingX: number;
  swingY: number;
  /** 归一化基准位置（0–1） */
  nx: number;
  ny: number;
};

/** 幅度用屏幕像素、角速度用弧度/秒：约 20–45px 幅度、20–40 秒一个来回，肉眼可见。 */
const POOL: SkyNode[] = (() => {
  let seed = 20261002;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: POOL_SIZE }, (_, index) => ({
    label: LABELS[index],
    nx: 0.04 + next() * 0.92,
    ny: 0.05 + next() * 0.9,
    phase: next() * Math.PI * 2,
    speed: 0.16 + next() * 0.22,
    swingX: 16 + next() * 30,
    swingY: 12 + next() * 26,
  }));
})();

type Palette = {
  glow: string;
  label: string;
  labelBg: string;
  line: string;
  node: string;
};

const FALLBACK: Palette = {
  glow: "#e3c88f",
  label: "#c7cdd8",
  labelBg: "#08090c",
  line: "#8a6a1d",
  node: "#ebd5a7",
};

/**
 * 与地球组件同一套取色方式：把变量挂到真实属性上交给浏览器解析，再用 canvas 归一化。
 * 生产压缩会把颜色改写成 8 位十六进制，`light-dark()` 在自定义属性里又不会求值，
 * 自己解析字符串迟早出错。
 */
function readPalette(
  element: HTMLElement,
  context: CanvasRenderingContext2D,
): Palette {
  const resolve = (name: string, fallback: string) => {
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:var(${name})`;
    element.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();

    context.save();
    context.fillStyle = fallback;
    if (isCanvasColor(resolved)) context.fillStyle = resolved;
    const normalized = context.fillStyle;
    context.restore();
    return normalized;
  };

  return {
    glow: resolve("--sky-dot", FALLBACK.glow),
    label: resolve("--sky-label", FALLBACK.label),
    labelBg: resolve("--globe-label-bg", FALLBACK.labelBg),
    line: resolve("--sky-line", FALLBACK.line),
    node: resolve("--sky-flow", FALLBACK.node),
  };
}

/** 节点光晕只画一次缓存成贴图，避免每帧给每个节点建渐变。 */
function makeGlowSprite(color: string): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  if (!g) return sprite;

  const gradient = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return sprite;
}

export function HeroSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wideScreen = window.matchMedia("(min-width: 1024px)");
    let palette = readPalette(canvas, context);
    let glow = makeGlowSprite(palette.glow);
    let width = 0;
    let height = 0;
    let frame = 0;
    let origin = performance.now();

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      palette = readPalette(canvas, context);
      glow = makeGlowSprite(palette.glow);
    }

    function draw(now: number) {
      const t = (now - origin) / 1000;
      context.clearRect(0, 0, width, height);

      // 节点数按宽度选：手机上少一些，密度和桌面接近
      const count = wideScreen.matches ? DESKTOP_NODES : MOBILE_NODES;
      const nodes = POOL.slice(0, count);
      const points = nodes.map((node) => ({
        node,
        x: node.nx * width + Math.sin(t * node.speed + node.phase) * node.swingX,
        y:
          node.ny * height +
          Math.cos(t * node.speed * 0.82 + node.phase) * node.swingY,
      }));

      // 连线：近的才连，越近越亮；端点会漂移，所以每帧重算
      const limit = Math.min(140, Math.min(width, height) * 0.34);
      context.lineWidth = 1;
      context.strokeStyle = palette.line;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const distance = Math.hypot(
            points[i].x - points[j].x,
            points[i].y - points[j].y,
          );
          if (distance > limit) continue;
          context.globalAlpha = (1 - distance / limit) * 0.55;
          context.beginPath();
          context.moveTo(points[i].x, points[i].y);
          context.lineTo(points[j].x, points[j].y);
          context.stroke();
        }
      }
      context.globalAlpha = 1;

      // 节点：光晕 + 实心点；窄屏上带标签的再补一枚胶囊标签
      context.font =
        '500 12px -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif';
      context.textBaseline = "middle";
      for (const point of points) {
        const label = wideScreen.matches ? undefined : point.node.label;

        context.globalAlpha = label ? 0.45 : 0.28;
        context.drawImage(glow, point.x - 15, point.y - 15, 30, 30);
        context.globalAlpha = label ? 1 : 0.78;
        context.fillStyle = palette.node;
        context.beginPath();
        context.arc(point.x, point.y, label ? 3 : 2.2, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;

        if (!label) continue;
        const textWidth = context.measureText(label).width;
        const boxWidth = textWidth + 20;
        // 靠右的节点把标签放到左边，别让画布边缘把字切掉
        const boxX =
          point.x + 12 + boxWidth > width
            ? point.x - 12 - boxWidth
            : point.x + 12;
        context.beginPath();
        if (typeof context.roundRect === "function") {
          context.roundRect(boxX, point.y - 11, boxWidth, 22, 11);
        } else {
          context.rect(boxX, point.y - 11, boxWidth, 22);
        }
        context.globalAlpha = 0.72;
        context.fillStyle = palette.labelBg;
        context.fill();
        context.globalAlpha = 1;
        context.fillStyle = palette.label;
        context.fillText(label, boxX + 10, point.y);
      }
    }

    function loop(now: number) {
      draw(now);
      if (!reduceMotion.matches) frame = requestAnimationFrame(loop);
    }

    function startMotion() {
      cancelAnimationFrame(frame);
      origin = performance.now();
      if (reduceMotion.matches) {
        draw(performance.now());
        return;
      }
      frame = requestAnimationFrame(loop);
    }

    resize();
    startMotion();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion.matches) draw(performance.now());
    });
    resizeObserver.observe(canvas);

    // 只按标签页可见性暂停；不用 IntersectionObserver 决定循环是否继续
    const onVisibilityChange = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else startMotion();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onPreferenceChange = () => startMotion();
    reduceMotion.addEventListener("change", onPreferenceChange);
    wideScreen.addEventListener("change", onPreferenceChange);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reduceMotion.removeEventListener("change", onPreferenceChange);
      wideScreen.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return <canvas aria-hidden="true" className="hero-sky" ref={canvasRef} />;
}

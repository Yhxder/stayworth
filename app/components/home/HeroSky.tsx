"use client";

import { useEffect, useRef } from "react";

import { isCanvasColor } from "../../lib/globe";

/**
 * 首屏背景：缓慢漂移的发光节点网络。
 *
 * 照着 caylet.com 移动端 hero 做的。我把它的 hero 连拍几帧做成运动差异图，
 * 看到动的是**会漂移的发光圆点**（带文字标签），点与点之间的连线跟着一起动，
 * 而不是"沿固定线段跑的光段"——所以这里画漂移的节点，不做虚线动画。
 *
 * 节点坐标来自固定种子的线性同余发生器，服务端与客户端算出来一致，不会水合不一致。
 */

const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 820;
const NODE_COUNT = 34;
const LINK_DISTANCE = 172;

/** 带标签的节点：窄屏没有地球，这几个名字就是"我们抽样了哪些城市"的视觉交代。 */
const LABELLED: Record<number, string> = {
  2: "香港",
  7: "东京",
  19: "新加坡",
  28: "伦敦",
};

type SkyNode = {
  label?: string;
  phase: number;
  speed: number;
  swingX: number;
  swingY: number;
  x: number;
  y: number;
};

function buildNodes(): SkyNode[] {
  let seed = 20261002;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  return Array.from({ length: NODE_COUNT }, (_, index) => ({
    label: LABELLED[index],
    phase: next() * Math.PI * 2,
    speed: 0.05 + next() * 0.11,
    swingX: 14 + next() * 30,
    swingY: 10 + next() * 26,
    x: next() * VIEW_WIDTH,
    y: next() * VIEW_HEIGHT,
  }));
}

const NODES = buildNodes();

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
 * 与地球组件同一套取色方式：把变量挂到真实属性上交给浏览器解析，
 * 再用 canvas 归一化。生产压缩会把颜色改写成 8 位十六进制、`light-dark()`
 * 在自定义属性里也不会求值，自己解析字符串迟早出错。
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
    let scaleX = 1;
    let scaleY = 1;
    let frame = 0;
    let running = true;
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
      scaleX = width / VIEW_WIDTH;
      scaleY = height / VIEW_HEIGHT;
      palette = readPalette(canvas, context);
      glow = makeGlowSprite(palette.glow);
    }

    function draw(now: number) {
      const t = (now - origin) / 1000;
      context.clearRect(0, 0, width, height);

      const points = NODES.map((node) => ({
        node,
        x: (node.x + Math.sin(t * node.speed + node.phase) * node.swingX) * scaleX,
        y:
          (node.y +
            Math.cos(t * node.speed * 0.82 + node.phase) * node.swingY) *
          scaleY,
      }));

      // 连线：近的才连，越近越亮；端点会漂移，所以每帧重算
      const limit = LINK_DISTANCE * Math.min(scaleX, scaleY);
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
          point.x + 12 + boxWidth > width ? point.x - 12 - boxWidth : point.x + 12;
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
      if (running && !reduceMotion.matches) frame = requestAnimationFrame(loop);
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

    const intersectionObserver = new IntersectionObserver((entries) => {
      running = entries.some((entry) => entry.isIntersecting);
      if (running) startMotion();
      else cancelAnimationFrame(frame);
    });
    intersectionObserver.observe(canvas);

    const onPreferenceChange = () => startMotion();
    reduceMotion.addEventListener("change", onPreferenceChange);
    wideScreen.addEventListener("change", onPreferenceChange);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reduceMotion.removeEventListener("change", onPreferenceChange);
      wideScreen.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return <canvas aria-hidden="true" className="hero-sky" ref={canvasRef} />;
}

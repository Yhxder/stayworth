"use client";

import { useEffect, useRef } from "react";

import {
  LAND_MASK_BASE64,
  LAND_MASK_HEIGHT,
  LAND_MASK_WIDTH,
} from "../../data/globe-land-mask";
import {
  decodeLandMask,
  greatCirclePoints,
  project,
  rotate,
  splitVisibleRuns,
  toVector,
  type LatLng,
} from "../../lib/globe";

/** 只标出面板里真正采样的城市，加几个洲际枢纽用来画航线。 */
const CITIES: Array<LatLng & { name: string; labelled: boolean }> = [
  { name: "香港", lat: 22.32, lng: 114.17, labelled: true },
  { name: "东京", lat: 35.68, lng: 139.69, labelled: true },
  { name: "首尔", lat: 37.57, lng: 126.98, labelled: false },
  { name: "上海", lat: 31.23, lng: 121.47, labelled: true },
  { name: "台北", lat: 25.03, lng: 121.57, labelled: false },
  { name: "曼谷", lat: 13.76, lng: 100.5, labelled: false },
  { name: "新加坡", lat: 1.35, lng: 103.82, labelled: true },
  { name: "悉尼", lat: -33.87, lng: 151.21, labelled: false },
  { name: "迪拜", lat: 25.2, lng: 55.27, labelled: false },
  { name: "伦敦", lat: 51.51, lng: -0.13, labelled: true },
  { name: "纽约", lat: 40.71, lng: -74.01, labelled: true },
  { name: "洛杉矶", lat: 34.05, lng: -118.24, labelled: false },
  { name: "圣保罗", lat: -23.55, lng: -46.63, labelled: false },
];

/** 航线：香港是本站第一个城市，所以以它为枢纽向外连。 */
const ARC_PAIRS: Array<[number, number]> = [
  [0, 1],
  [0, 6],
  [0, 8],
  [0, 9],
  [0, 10],
  [0, 11],
  [6, 7],
];

const TAU = Math.PI * 2;
const TILT = -18 * (Math.PI / 180);
const SPIN_PER_SECOND = 0.075;
const HOVER_SPIN_MULTIPLIER = 2.6;
/**
 * 陆地点的半径。caylet.com 的点实测约 4px 宽（截屏连通块中位数），
 * 原来是 1.1（2.2px），两套主题下大陆都糊成一片，所以按实测放大。
 */
const DOT_RADIUS = 1.9;
/** 弧线上的光点：位置与速度，用一个循环的进度驱动。 */
const ARC_PULSES = [0.18, 0.55, 0.82];

type Palette = {
  dot: string;
  dotFront: string;
  arc: string;
  node: string;
  label: string;
  labelBg: string;
  limb: string;
};

function readPalette(element: HTMLElement): Palette {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    dot: read("--globe-dot", "rgba(227, 200, 143, 0.34)"),
    dotFront: read("--globe-dot-front", "rgba(235, 213, 167, 0.9)"),
    arc: read("--globe-arc", "rgba(227, 200, 143, 0.55)"),
    node: read("--globe-node", "#ebd5a7"),
    label: read("--globe-label", "#f7f8fa"),
    labelBg: read("--globe-label-bg", "rgba(8, 9, 12, 0.72)"),
    limb: read("--globe-limb", "rgba(227, 200, 143, 0.28)"),
  };
}

function withAlpha(color: string, alpha: number): string {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return color;
  const parts = match[1].split(/[,\s/]+/).filter(Boolean);
  const [r, g, b] = parts;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 首屏右侧的点阵地球。
 *
 * 自己画而不是装 three.js / cobe：陆地掩码已经离线栅格化并内联，
 * 投影和航线是 app/lib/globe.ts 里的纯函数，整块没有任何运行时依赖。
 * 尊重 prefers-reduced-motion：那样只画一帧，不跑动画循环。
 */
export function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const land = decodeLandMask(
      LAND_MASK_BASE64,
      LAND_MASK_WIDTH,
      LAND_MASK_HEIGHT,
    ).map((point) => toVector(point));
    const cityVectors = CITIES.map((city) => ({ city, vector: toVector(city) }));
    const arcs = ARC_PAIRS.map(([from, to]) =>
      greatCirclePoints(CITIES[from], CITIES[to], 72).map((point) =>
        toVector(point),
      ),
    );

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 窄屏只保留少量标签，否则文字会糊成一团
    const narrowScreen = window.matchMedia("(max-width: 720px)");
    let palette = readPalette(canvas);
    let width = 0;
    let height = 0;
    let radius = 0;
    let spin = 0.6;
    let frame = 0;
    let last = performance.now();
    let visible = true;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(width, height) * 0.42;
    }

    function draw(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduceMotion.matches) {
        spin += dt * SPIN_PER_SECOND * (hoverRef.current ? HOVER_SPIN_MULTIPLIER : 1);
      }

      const cx = width / 2;
      const cy = height / 2;
      context.clearRect(0, 0, width, height);

      // 球体边缘的暖光：由外向内叠四圈，越贴轮廓越亮，
      // 这样即使球被右边缘裁掉一半，露出的那半圈轮廓也立得住。
      for (const rim of [
        { alpha: 0.06, spread: 26, width: 24 },
        { alpha: 0.1, spread: 12, width: 13 },
        { alpha: 0.18, spread: 3, width: 5 },
        { alpha: 0.55, spread: 0, width: 1.2 },
      ]) {
        context.beginPath();
        context.arc(cx, cy, radius + rim.spread, 0, TAU);
        context.strokeStyle = withAlpha(palette.limb, rim.alpha);
        context.lineWidth = rim.width;
        context.stroke();
      }

      // 陆地：按深度分成 5 档透明度批量绘制，避免每个点一次 fill
      const buckets: Array<Array<{ x: number; y: number }>> = [[], [], [], [], []];
      for (const vector of land) {
        const rotated = rotate(vector, spin, TILT);
        if (rotated.z <= 0) continue;
        const point = project(rotated, radius);
        const bucket = Math.min(4, Math.floor(rotated.z * 5));
        buckets[bucket].push({ x: cx + point.x, y: cy + point.y });
      }
      for (let index = 0; index < buckets.length; index += 1) {
        const depth = (index + 0.5) / buckets.length;
        context.fillStyle = withAlpha(
          index >= 3 ? palette.dotFront : palette.dot,
          0.25 + depth * 0.75,
        );
        context.beginPath();
        for (const point of buckets[index]) {
          context.moveTo(point.x + DOT_RADIUS, point.y);
          context.arc(point.x, point.y, DOT_RADIUS, 0, TAU);
        }
        context.fill();
      }

      // 航线：只画正面半球的连续段
      context.lineWidth = 1;
      for (const [arcIndex, arc] of arcs.entries()) {
        const projected = arc.map((vector) =>
          project(rotate(vector, spin, TILT), radius),
        );
        const screen = projected.map((point) => ({
          visible: point.visible,
          x: cx + point.x,
          y: cy + point.y,
          z: point.z,
        }));
        for (const run of splitVisibleRuns(screen)) {
          context.beginPath();
          context.moveTo(run[0].x, run[0].y);
          for (const point of run.slice(1)) context.lineTo(point.x, point.y);
          context.strokeStyle = withAlpha(palette.arc, 0.2);
          context.stroke();

          // 每条弧线上跑一个光点
          const progress = (now / 4200 + ARC_PULSES[arcIndex % ARC_PULSES.length]) % 1;
          const pulse = run[Math.min(run.length - 1, Math.floor(progress * run.length))];
          context.beginPath();
          context.arc(pulse.x, pulse.y, 2.4, 0, TAU);
          context.fillStyle = withAlpha(palette.node, 0.95);
          context.fill();
        }
      }

      // 城市节点与标签
      context.font =
        '500 11px -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif';
      context.textBaseline = "middle";
      for (const { city, vector } of cityVectors) {
        const rotated = rotate(vector, spin, TILT);
        if (rotated.z <= 0.12) continue;
        const point = project(rotated, radius);
        const x = cx + point.x;
        const y = cy + point.y;
        const strength = Math.min(1, rotated.z * 1.6);

        context.beginPath();
        context.arc(x, y, 5, 0, TAU);
        context.fillStyle = withAlpha(palette.node, 0.28 * strength);
        context.fill();
        context.beginPath();
        context.arc(x, y, 2.4, 0, TAU);
        context.fillStyle = withAlpha(palette.node, strength);
        context.fill();

        if (!city.labelled || (narrowScreen.matches && rotated.z < 0.5)) continue;

        // 标签给一个不透明度下限：球被裁掉一半后，能露出来的标签本来就少，
        // 再按深度衰减到接近透明就白画了
        const labelStrength = Math.max(0.62, strength);
        const textWidth = context.measureText(city.name).width;
        const padX = 6;
        const boxWidth = textWidth + padX * 2;
        // 地球被视口右边缘裁掉一半，靠右的节点把标签改画在左边，否则会被裁掉
        const boxX = x > cx - 110 ? x - 9 - boxWidth : x + 9;
        const boxY = y;
        context.beginPath();
        if (typeof context.roundRect === "function") {
          context.roundRect(boxX, boxY - 9, boxWidth, 18, 9);
        } else {
          context.rect(boxX, boxY - 9, boxWidth, 18);
        }
        context.fillStyle = withAlpha(palette.labelBg, 0.72 * labelStrength);
        context.fill();
        context.fillStyle = withAlpha(palette.label, labelStrength);
        context.fillText(city.name, boxX + padX, boxY);
      }
    }

    function loop(now: number) {
      draw(now);
      if (!reduceMotion.matches && visible) {
        frame = requestAnimationFrame(loop);
      }
    }

    function start() {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (reduceMotion.matches) {
        draw(performance.now());
        return;
      }
      frame = requestAnimationFrame(loop);
    }

    resize();
    start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion.matches) draw(performance.now());
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
      else cancelAnimationFrame(frame);
    });
    intersectionObserver.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      palette = readPalette(canvas);
      if (reduceMotion.matches) draw(performance.now());
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });

    const onPreferenceChange = () => {
      palette = readPalette(canvas);
      start();
    };
    reduceMotion.addEventListener("change", onPreferenceChange);
    narrowScreen.addEventListener("change", onPreferenceChange);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      reduceMotion.removeEventListener("change", onPreferenceChange);
      narrowScreen.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return (
    <div
      className="hero-globe"
      onPointerEnter={() => {
        hoverRef.current = true;
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
    >
      <canvas
        aria-hidden="true"
        className="hero-globe-canvas"
        ref={canvasRef}
      />
    </div>
  );
}

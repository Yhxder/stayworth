/**
 * 点阵地球的纯计算层：解码陆地掩码、经纬度与三维向量互转、旋转、正交投影、
 * 大圆航线插值。全部是纯函数，不碰 DOM，方便单测。
 *
 * 渲染在 app/components/home/HeroGlobe.tsx，只负责把这些结果画到 canvas 上。
 */

export type LatLng = { lat: number; lng: number };
export type Vec3 = { x: number; y: number; z: number };
export type Projected = { x: number; y: number; z: number; visible: boolean };

const DEG = Math.PI / 180;

/**
 * canvas 只接受具体颜色。`light-dark()`、`var()`、`color-mix()` 这类要看使用场景
 * 才能定值，直接塞给 `fillStyle` 会被忽略——而且失败是静默的，画布退回上一次的
 * 颜色（首次就是默认黑）。生产构建的压缩会把 `rgba(...)` 改写成 8 位十六进制，
 * 再把颜色塞进 `light-dark()`，所以这个判断必须留在取色链路上当闸门。
 */
export function isCanvasColor(value: string): boolean {
  return !/(?:light-dark|color-mix|var)\(/.test(value);
}

/** 等距圆柱投影的掩码 → 陆地点列表。位序：行优先、低位在前。 */
export function decodeLandMask(
  base64: string,
  width: number,
  height: number,
): LatLng[] {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const points: LatLng[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      const bit = (bytes[index >> 3] >> (index & 7)) & 1;
      if (!bit) continue;
      points.push({
        lat: 90 - (row + 0.5) * (180 / height),
        lng: -180 + (col + 0.5) * (360 / width),
      });
    }
  }
  return points;
}

export function toVector({ lat, lng }: LatLng): Vec3 {
  const phi = lat * DEG;
  const lambda = lng * DEG;
  const cosPhi = Math.cos(phi);
  return {
    x: cosPhi * Math.cos(lambda),
    y: Math.sin(phi),
    z: cosPhi * Math.sin(lambda),
  };
}

export function toLatLng({ x, y, z }: Vec3): LatLng {
  const clamped = Math.max(-1, Math.min(1, y));
  return {
    lat: Math.asin(clamped) / DEG,
    lng: Math.atan2(z, x) / DEG,
  };
}

/** 先绕地轴自转（spin），再绕屏幕横轴倾斜（tilt）。 */
export function rotate(vec: Vec3, spin: number, tilt: number): Vec3 {
  const cosSpin = Math.cos(spin);
  const sinSpin = Math.sin(spin);
  const x1 = vec.x * cosSpin - vec.z * sinSpin;
  const z1 = vec.x * sinSpin + vec.z * cosSpin;

  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  return {
    x: x1,
    y: vec.y * cosTilt - z1 * sinTilt,
    z: vec.y * sinTilt + z1 * cosTilt,
  };
}

/** 正交投影：z > 0 表示朝向观察者，也就是在正面半球上。 */
export function project(vec: Vec3, radius: number): Projected {
  return {
    x: vec.x * radius,
    y: -vec.y * radius,
    z: vec.z,
    visible: vec.z > 0,
  };
}

/** 两点之间的大圆航线，用球面线性插值取样。 */
export function greatCirclePoints(
  from: LatLng,
  to: LatLng,
  steps: number,
): LatLng[] {
  const a = toVector(from);
  const b = toVector(to);
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);

  if (omega < 1e-6) return [from, to];

  const sinOmega = Math.sin(omega);
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const scaleA = Math.sin((1 - t) * omega) / sinOmega;
    const scaleB = Math.sin(t * omega) / sinOmega;
    points.push(
      toLatLng({
        x: a.x * scaleA + b.x * scaleB,
        y: a.y * scaleA + b.y * scaleB,
        z: a.z * scaleA + b.z * scaleB,
      }),
    );
  }
  return points;
}

/** 由一条折线里连续可见的段组成的分段（用于只画正面半球的弧线）。 */
export function splitVisibleRuns(points: Projected[]): Projected[][] {
  const runs: Projected[][] = [];
  let run: Projected[] = [];
  for (const point of points) {
    if (point.visible) {
      run.push(point);
    } else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 0) runs.push(run);
  return runs.filter((item) => item.length > 1);
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  LAND_MASK_BASE64,
  LAND_MASK_HEIGHT,
  LAND_MASK_WIDTH,
} from "../app/data/globe-land-mask.ts";
import {
  decodeLandMask,
  greatCirclePoints,
  project,
  rotate,
  splitVisibleRuns,
  toLatLng,
  toVector,
} from "../app/lib/globe.ts";

test("decodes the land mask into a plausible amount of land", () => {
  const land = decodeLandMask(
    LAND_MASK_BASE64,
    LAND_MASK_WIDTH,
    LAND_MASK_HEIGHT,
  );

  // 地球陆地约占 29%，掩码是 128×64；放宽到 20%–40% 只用来抓"解错了"这类错误
  const ratio = land.length / (LAND_MASK_WIDTH * LAND_MASK_HEIGHT);
  assert.ok(ratio > 0.2 && ratio < 0.4, `陆地占比异常：${ratio}`);

  // 经纬度必须落在合法范围内
  for (const point of land) {
    assert.ok(point.lat >= -90 && point.lat <= 90);
    assert.ok(point.lng >= -180 && point.lng <= 180);
  }

  // 香港附近应该有陆地（掩码分辨率是 2.8°，只检查大致半球）
  assert.ok(
    land.some(
      (point) =>
        Math.abs(point.lat - 22) < 6 && Math.abs(point.lng - 114) < 6,
    ),
    "香港附近应当落在陆地里",
  );
});

test("round-trips between latitude/longitude and unit vectors", () => {
  for (const point of [
    { lat: 0, lng: 0 },
    { lat: 22.32, lng: 114.17 },
    { lat: -33.87, lng: 151.21 },
    { lat: 51.51, lng: -0.13 },
  ]) {
    const back = toLatLng(toVector(point));
    assert.ok(Math.abs(back.lat - point.lat) < 1e-9);
    assert.ok(Math.abs(back.lng - point.lng) < 1e-9);
  }
});

test("rotation is identity at zero and keeps unit length", () => {
  const vector = toVector({ lat: 35.68, lng: 139.69 });
  const same = rotate(vector, 0, 0);
  assert.ok(Math.abs(same.x - vector.x) < 1e-12);
  assert.ok(Math.abs(same.z - vector.z) < 1e-12);

  const turned = rotate(vector, 1.234, -0.3);
  const length = Math.hypot(turned.x, turned.y, turned.z);
  assert.ok(Math.abs(length - 1) < 1e-12);
});

test("projection only shows the hemisphere facing the viewer", () => {
  // 默认自转与倾斜下，正对观察者的点应当可见，背面不可见
  const front = project(rotate(toVector({ lat: 0, lng: 0 }), 0, 0), 100);
  assert.equal(front.visible, false, "经度 0 在默认朝向下位于侧面");

  const facing = project(rotate(toVector({ lat: 0, lng: 0 }), Math.PI / 2, 0), 100);
  assert.equal(facing.visible, true);
  assert.ok(Math.abs(facing.x) < 1e-9);
});

test("great-circle sampling starts and ends at the requested cities", () => {
  const points = greatCirclePoints(
    { lat: 22.32, lng: 114.17 },
    { lat: 51.51, lng: -0.13 },
    16,
  );

  assert.equal(points.length, 17);
  assert.ok(Math.abs(points[0].lat - 22.32) < 1e-9);
  assert.ok(Math.abs(points.at(-1).lng - -0.13) < 1e-9);
  // 每条取样点都必须是单位向量对应的合法经纬度
  for (const point of points) {
    assert.ok(Math.abs(toVector(point).x) <= 1 + 1e-12);
  }
});

test("splits an arc into the runs that face the viewer", () => {
  const runs = splitVisibleRuns([
    { x: 0, y: 0, z: 0.5, visible: true },
    { x: 1, y: 0, z: 0.5, visible: true },
    { x: 2, y: 0, z: -0.5, visible: false },
    { x: 3, y: 0, z: 0.5, visible: true },
  ]);

  // 第二段只有 1 个点，画不出线，必须被丢掉
  assert.equal(runs.length, 1);
  assert.equal(runs[0].length, 2);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  area,
  subtractTriangle,
  ribbon,
  RoadMask,
} from "../web/road-surface.js";
test("negative-side and positive-side shoulder ribbons both face upwards", () => {
  const track = {
    points: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
    heights: [0, 2, 4, 2],
    width: 12,
  };
  for (const [a, b] of [
    [-6, -8],
    [6, 8],
  ])
    for (const [p, q, r] of ribbon(track, a, b))
      assert.ok(
        (q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]) > 0,
      );
});
test("polygon difference preserves area and linearly interpolates surface height", () => {
  const p = [
      [-10, 0, -10],
      [10, 20, -10],
      [0, 10, 10],
    ],
    q = [
      [-2, 0, -2],
      [2, 0, -2],
      [0, 0, 2],
    ];
  const parts = subtractTriangle(p, q);
  assert.ok(
    Math.abs(parts.reduce((sum, p) => sum + area(p), 0) - (area(p) - area(q))) <
      1e-7,
  );
  for (const v of parts.flat()) assert.ok(Math.abs(v[1] - (v[0] + 10)) < 1e-7);
});
test("road masks remove high triangle interiors, not only road-near vertices", () => {
  const track = {
      points: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      heights: [0, 2, 4, 2],
      width: 12,
    },
    mask = new RoadMask(track);
  const input = [
      [40, 70, -30],
      [60, 90, -30],
      [50, 80, 30],
    ],
    parts = mask.cutAll([input]);
  assert.ok(parts.length > 0);
  const original = area(input),
    remaining = parts.reduce((sum, p) => sum + area(p), 0);
  assert.ok(remaining < original - 50);
  for (const p of parts)
    for (const q of mask.triangles) {
      const exterior = subtractTriangle(p, q).reduce(
        (sum, p) => sum + area(p),
        0,
      );
      assert.ok(area(p) - exterior < 1e-7);
    }
});

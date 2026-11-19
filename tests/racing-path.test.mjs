import { roadPoint } from "../web/road-surface.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { racingPath, pathCurvature } from "../web/racing-path.js";
import {
  racingGuide,
  guideColour,
  GUIDE_GREEN,
  GUIDE_RED,
  GUIDE_SPECS,
} from "../web/racing-guide.js";
const tracks = JSON.parse(fs.readFileSync("data/tracks.json"));
test("optimized paths improve integrated curvature on all 13 mapped tracks and stay in the car-safe corridor", () => {
  for (const t of tracks) {
    const p = racingPath(t),
      n = t.points.length;
    const energy = (a) =>
      a.reduce(
        (s, k, i) =>
          s +
          k *
            k *
            Math.hypot(
              t.points[i][0] - t.points[(i + 1) % n][0],
              t.points[i][1] - t.points[(i + 1) % n][1],
            ),
        0,
      );
    assert.ok(energy(p.curvature) < energy(pathCurvature(t.points)), t.name);
    assert.ok(Math.max(...p.offsets.map(Math.abs)) > 1, t.name);
    for (let i = 0; i < n; i++) {
      assert.ok(Number.isFinite(p.offsets[i]));
      assert.ok(Math.abs(p.offsets[i]) <= t.width / 2 - 1.7 + 1e-9);
      const j = (i + 1) % n,
        ds = Math.hypot(
          t.points[j][0] - t.points[i][0],
          t.points[j][1] - t.points[i][1],
        );
      assert.ok(
        Math.abs(p.offsets[i] - p.offsets[j]) <= 0.18 * ds + 1e-6,
        `${t.name} ${i}`,
      );
    }
  }
});
test("Hugenholtz uses outside entry, inside apex and outside exit, rather than the old centre-road guide", () => {
  const p = racingPath(tracks[11]);
  assert.ok(p.offsets[140] < -3);
  assert.ok(p.offsets[172] > 3);
  assert.ok(p.offsets[200] < -3);
});
test("stopped and slow cars are not told to brake just because a later target falls", () => {
  for (const d of [0, 5, 50, 150, 220]) {
    assert.deepEqual(guideColour(0, 40, 30, { distance: d }), GUIDE_GREEN);
  }
  assert.deepEqual(guideColour(15, 40, 38), GUIDE_GREEN);
  assert.deepEqual(guideColour(40, 40, 40), GUIDE_GREEN);
  assert.deepEqual(guideColour(50, 40, 40), GUIDE_RED);
  assert.deepEqual(guideColour(50, 20, 20, { distance: 80 }), GUIDE_GREEN);
  assert.deepEqual(guideColour(40, 40, 38), GUIDE_RED);
});
test("normal-pace 220m previews localize red to genuine braking areas, not the whole approaching corner", () => {
  for (const t of tracks) {
    const g = racingGuide(t),
      n = t.points.length;
    let red = 0,
      total = 0;
    for (let start = 0; start < n; start += 11) {
      let distance = 0;
      const speed = g.targets[start] * 0.95;
      for (let k = 0; distance < 220; k++) {
        const i = (start + k) % n,
          rgb = guideColour(speed, g.targets[i], g.targets[(i + 1) % n], {
            distance,
            ds: g.distances[i],
            decel: g.brakeAt(g.targets[i]),
            accel: g.accelAt(speed),
          });
        red += +(rgb === GUIDE_RED);
        total++;
        distance += g.distances[i];
      }
    }
    assert.ok(red / total < 0.35, `${t.name}: ${red / total}`);
    assert.ok(red / total > 0.03, t.name);
  }
});
test("guidance accepts actual team-adjusted specs rather than the previous fixed conservative era speeds", () => {
  const t = tracks[2],
    base = GUIDE_SPECS[3],
    front = racingGuide(t, 3, false, base),
    lower = racingGuide(t, 3, false, {
      ...base,
      grip: base.grip * 0.8,
      power: base.power * 0.85,
      brake: base.brake * 0.8,
    });
  assert.ok(lower.targets.some((v, i) => v < front.targets[i] - 1));
  for (let i = 0; i < front.targets.length; i++)
    assert.ok(lower.targets[i] <= front.targets[i] + 1e-6);
});

test("every rendered chevron footprint stays inside the actual road ribbon on all venues", () => {
  const cross = (a, b, c) =>
    (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
  const inside = (p, tri) => {
    const v = [
      cross(tri[0], tri[1], p),
      cross(tri[1], tri[2], p),
      cross(tri[2], tri[0], p),
    ];
    return v.every((v) => v >= -1e-6) || v.every((v) => v <= 1e-6);
  };
  const mid = (a, b, f) => a.map((v, k) => v + (b[k] - v) * f);
  for (const t of tracks) {
    const path = racingPath(t),
      n = t.points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n,
        a = roadPoint(t, i, path.offsets[i] - 0.2),
        b = roadPoint(t, j, path.offsets[j] - 0.2),
        c = roadPoint(t, i, path.offsets[i] + 0.2),
        d = roadPoint(t, j, path.offsets[j] + 0.2);
      const quad = [
        roadPoint(t, i, -t.width / 2),
        roadPoint(t, j, -t.width / 2),
        roadPoint(t, i, t.width / 2),
        roadPoint(t, j, t.width / 2),
      ];
      const triangles = [
        [quad[0], quad[1], quad[2]],
        [quad[2], quad[1], quad[3]],
      ];
      for (const p of [
        mid(a, b, 0.12),
        mid(c, d, 0.12),
        mid(mid(a, c, 0.5), mid(b, d, 0.5), 0.88),
      ])
        assert.ok(
          triangles.some((tri) => inside(p, tri)),
          `${t.name} ${i}`,
        );
    }
  }
});

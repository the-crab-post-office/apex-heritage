import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CircuitClearance, pointSegmentDistance } from "../web/scenery.js";
const tracks = JSON.parse(
  fs.readFileSync(new URL("../data/tracks.json", import.meta.url)),
);
const buildings = JSON.parse(
  fs.readFileSync(new URL("../data/buildings.json", import.meta.url)),
);
test("continuous corridor rejects objects between distant vertices and at closing segment", () => {
  const c = new CircuitClearance({
    width: 10,
    points: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
  });
  assert.equal(c.circleClear(50, 1, 0), false);
  assert.equal(c.circleClear(-1, 50, 0), false);
  assert.equal(c.circleClear(50, 14, 7), false);
  assert.equal(c.circleClear(50, 30, 7), true);
  assert.equal(
    c.polygonClear([
      [40, -20],
      [60, -20],
      [60, 20],
      [40, 20],
    ]),
    false,
  );
  assert.equal(
    c.polygonClear([
      [-20, -20],
      [120, -20],
      [120, 120],
      [-20, 120],
    ]),
    false,
  );
  assert.equal(
    c.polygonClear([
      [30, 30],
      [70, 30],
      [70, 70],
      [30, 70],
    ]),
    true,
  );
  assert.equal(pointSegmentDistance([50, 10], [0, 0], [100, 0]), 10);
});
for (const t of tracks)
  test(`${t.name}: every mapped footprint clears the whole circuit`, () => {
    const layer = buildings.tracks.find((b) => b.id === t.id),
      c = new CircuitClearance(t);
    assert.ok(layer.buildings.length > 0);
    for (const b of layer.buildings) {
      assert.ok(c.polygonClear(b.footprint), `OSM ${b.osm_id}`);
      assert.ok(b.height >= 3 && b.height <= 150);
      assert.ok(b.height_source);
    }
  });
test("corrected markers retain height alignment, direction and shared browser/native data", () => {
  assert.match(
    fs.readFileSync(new URL("../web/main.js", import.meta.url), "utf8"),
    /\.\.\/data\/tracks.json/,
  );
  assert.match(
    fs.readFileSync(new URL("../web/graphics.js", import.meta.url), "utf8"),
    /\.\.\/data\/buildings.json/,
  );
  const corrected = tracks.filter(
    (t) => t.start_reference.status === "snapped to mapped marker",
  );
  assert.equal(corrected.length, 5);
  for (const t of corrected) {
    assert.ok(t.start_reference.snap_distance < 2);
    assert.equal(t.heights.length, t.points.length);
    assert.equal(t.ground_heights.length, t.points.length);
  }
  const m = tracks[1];
  assert.equal(m.start_reference.osm_node, 4937755860);
  assert.ok(m.heights[0] < 12);
  assert.ok(m.points[1][0] < m.points[0][0]);
  assert.ok(m.points[1][1] < m.points[0][1]);
});

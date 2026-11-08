import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) =>
  JSON.parse(readFileSync(new URL("../" + p, import.meta.url)));
const lanes = read("data/pit-lanes.json").tracks,
  raw = read("data/pit-lanes-osm.json").tracks,
  tracks = read("data/tracks.json");
const segment = (p, a, b) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    f = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1),
      ),
    );
  return Math.hypot(p[0] - a[0] - f * dx, p[1] - a[1] - f * dz);
};
for (const [i, t] of tracks.entries())
  test(`${t.name}: real mapped pit ways, bounded registration and monotonic race progress`, () => {
    const p = lanes[i],
      r = raw[i];
    assert.equal(p.id, t.id);
    assert.equal(p.name, t.name);
    assert.ok(p.source.startsWith("OSM mapped"));
    assert.ok(p.osm_way_ids.length);
    assert.ok(p.length > 300 && p.length < 1600);
    assert.deepEqual([p.points[0][0], p.points[0][2]], t.points[p.entry_index]);
    assert.deepEqual(
      [p.points.at(-1)[0], p.points.at(-1)[2]],
      t.points[p.exit_index],
    );
    assert.ok(p.box_distance > 60 && p.box_distance < p.length - 60);
    assert.equal(p.track_indices.length, p.points.length);
    let previous = 0;
    for (const idx of p.track_indices) {
      const f = (idx - p.entry_index + t.points.length) % t.points.length;
      assert.ok(f >= previous);
      previous = f;
    }
    const c = Math.cos((t.origin.latitude * Math.PI) / 180),
      project = ([lon, lat]) => [
        (lon - t.origin.longitude) * 111320 * c,
        -(lat - t.origin.latitude) * 111320,
      ];
    const source = r.ways.flatMap((w) =>
      w.coordinates
        .slice(1)
        .map((b, j) => [project(w.coordinates[j]), project(b)]),
    );
    if (r.connector)
      source.push(
        ...r.connector.coordinates
          .slice(1)
          .map((b, j) => [project(r.connector.coordinates[j]), project(b)]),
      );
    for (const a of p.points) {
      assert.ok(a.every(Number.isFinite));
      const d = Math.min(
        ...source.map(([b, c]) => segment([a[0], a[2]], b, c)),
      );
      assert.ok(d < 11, `unexplained source departure ${d}m`);
    }
    assert.ok(
      p.osm_way_ids.every(
        (id) =>
          r.ways.some((w) => w.id === id) || r.connector?.way_ids.includes(id),
      ),
    );
  });
test("specific F1 pit variants, not national/west/karting lanes", () => {
  assert.deepEqual(lanes[3].osm_way_ids, [227902927]);
  assert.deepEqual(lanes[4].osm_way_ids, [120917578]);
  assert.deepEqual(lanes[7].osm_way_ids, [30815119]);
  assert.ok(lanes[1].osm_way_ids.includes(1388331347));
  assert.ok(Math.abs(lanes[1].limit * 3.6 - 60) < 0.001);
});

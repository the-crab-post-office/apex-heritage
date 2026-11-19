import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bankOffset, bankedGround, roadPoint } from "../web/road-surface.js";
import { ElevationField } from "../web/elevation.js";
const read = (p) => JSON.parse(fs.readFileSync(p));
const tracks = read("data/tracks.json"),
  looks = read("data/building-appearance.json");
test("all 4419 mapped buildings have stable explicit appearances and locally shipped original textures", () => {
  let count = 0;
  for (const t of read("data/buildings.json").tracks) {
    const venue = looks.tracks.find((v) => v.id === t.id),
      map = new Map(venue.buildings.map((b) => [b.osm_id, b]));
    assert.equal(venue.buildings.length, t.buildings.length);
    assert.equal(map.size, new Set(t.buildings.map((b) => b.osm_id)).size);
    for (const b of t.buildings) {
      const a = map.get(b.osm_id);
      assert.ok(a);
      assert.ok(a.facade >= 0 && a.facade < 6);
      assert.ok(a.height > 0 && a.height < 151);
      assert.ok([0, 1, 2].includes(a.roof));
      count++;
      for (const part of a.safe_footprints || []) assert.ok(part.length >= 3);
      for (const tri of a.roof_facets || [])
        assert.ok(tri.flat().every(Number.isFinite));
    }
    for (const type of looks.types)
      assert.ok(
        fs.statSync(`web/assets/facades/${t.id}-${type}.jpg`).size > 1000,
      );
  }
  assert.equal(count, 4419);
  assert.equal(looks.tracks.length, 13);
  const refs = read("data/building-photo-references.json");
  assert.equal(refs.photos.length, 13);
  assert.ok(
    refs.photos.every(
      (p) => !p.redistributed && p.source_page.startsWith("https:"),
    ),
  );
});
test("banking stays on pavement, then fades continuously into the earth bed", () => {
  const width = 12,
    start = width / 2 + 1.5;
  for (const x of [-start, -4, 0, 4, start])
    assert.equal(bankOffset(width, x), x);
  for (const sign of [-1, 1]) {
    assert.equal(Math.abs(bankOffset(width, sign * (start + 12))), 0);
    for (const x of [start, start + 12]) {
      const e = 0.00001;
      assert.ok(
        Math.abs(
          bankOffset(width, sign * (x + e)) - bankOffset(width, sign * (x - e)),
        ) < 0.00003,
      );
    }
  }
});
test("gentler T3 and retimed final bank are bounded and do not wrap onto the start straight", () => {
  const t = tracks[11],
    angle = (x) => (Math.atan(x) * 180) / Math.PI;
  assert.ok(Math.abs(angle(t.banking[166]) + 10) < 0.001);
  assert.ok(Math.abs(angle(t.banking[766]) - 18) < 0.001);
  assert.ok(t.banking.slice(802).every((x) => x === 0));
  assert.ok(t.banking.slice(0, 147).every((x) => x === 0));
  assert.ok(
    Math.max(
      ...t.banking.map((b, i) =>
        Math.abs(b - t.banking[(i + 1) % t.banking.length]),
      ),
    ) < 0.04,
  );
});
test("banked earth is finite, has welded shared stations, and rejoins geographic ground", () => {
  const t = tracks[11],
    field = new ElevationField(t),
    tris = bankedGround(t, (x, z) => field.height(x, z)),
    seen = new Map();
  assert.equal(tris.length, t.points.length * 36);
  for (const tri of tris)
    for (const p of tri) {
      assert.ok(p.every(Number.isFinite));
      const key = `${p[0]},${p[2]}`;
      if (seen.has(key)) assert.equal(p[1], seen.get(key));
      else seen.set(key, p[1]);
    }
  for (const side of [-1, 1])
    for (let i = 0; i < t.points.length; i += 11) {
      const p = roadPoint(t, i, side * (t.width / 2 + 38), 0),
        y = seen.get(`${p[0]},${p[2]}`);
      assert.ok(Math.abs(y - (field.height(p[0], p[2]) - 1.24)) < 1e-8);
    }
  assert.deepEqual(
    bankedGround(tracks[0], () => 0),
    [],
  );
});

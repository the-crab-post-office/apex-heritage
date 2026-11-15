import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (n) => JSON.parse(fs.readFileSync("data/" + n + ".json"));
const cars = read("car-shapes");
test("photo-guided chassis distinguish open 1967 monocoque from 2023 ground-effect car", () => {
  const classic = cars.models["0"].flatMap((b) => b.components),
    modern = cars.models["3"].flatMap((b) => b.components);
  for (const name of [
    "rounded cigar nose",
    "yellow oval radiator surround",
    "radiator cavity",
    "exposed exhaust header",
    "chrome roll hoop",
  ])
    assert.ok(classic.includes(name));
  assert.ok(!classic.some((s) => /wing|halo|sidepod/.test(s)));
  for (const name of [
    "halo centre pillar",
    "undercut sidepod",
    "spoon front mainplane",
    "rear DRS flap",
    "airbox dark opening",
  ])
    assert.ok(modern.includes(name));
  for (const [e, batches] of Object.entries(cars.models))
    for (const b of batches) {
      assert.equal(b.positions.length, b.uvs.length);
      assert.ok(b.indices.every((i) => i >= 0 && i < b.positions.length));
      assert.ok(b.positions.flat().every(Number.isFinite));
      assert.ok(b.indices.length <= 32768);
    }
  assert.deepEqual(cars.layouts, read("car-layouts"));
  assert.ok(cars.layouts["0"].rear_width > cars.layouts["0"].front_width * 1.4);
  assert.ok(cars.layouts["3"].front - cars.layouts["3"].rear > 3.3);
});
test("Eau Rouge shared all-era reference has a 40 m climb and local modern kerbs/aprons", () => {
  const t = read("tracks")[0],
    v = read("corner-details").tracks[0],
    c = t.road_corrections.find((c) => c.name === "Eau Rouge / Raidillon");
  assert.ok(c);
  assert.ok(
    Math.abs(t.heights[c.crest_index] - t.heights[c.compression_index] - 40) <
      0.002,
  );
  let peak = 0;
  for (let i = c.compression_index; i < c.crest_index; i++)
    peak = Math.max(
      peak,
      (t.heights[i + 1] - t.heights[i]) /
        Math.hypot(
          t.points[i + 1][0] - t.points[i][0],
          t.points[i + 1][1] - t.points[i][1],
        ),
    );
  assert.ok(peak > 0.16 && peak < 0.18);
  const local = (p) =>
    p.kerbs.filter((k) => /Raidillon|Eau Rouge/.test(k.name));
  for (const p of v.profiles) {
    assert.deepEqual(local(p), local(v.profiles[3]));
    assert.ok(p.runoffs.some((r) => r.kind === "red_paint"));
    assert.ok(p.runoffs.some((r) => r.kind === "green_paint"));
    assert.match(p.notes, /every era/);
  }
  assert.ok(
    v.grandstands.some((s) => s.name === "Tribune Raidillon" && s.roof),
  );
  assert.ok(
    v.barriers
      .filter((b) => b.index >= 140 && b.index <= 248)
      .every((b) => b.fence),
  );
});

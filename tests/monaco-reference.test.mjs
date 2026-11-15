import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CircuitClearance } from "../web/scenery.js";
const read = (p) =>
  JSON.parse(fs.readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const track = read("data/tracks.json")[1],
  buildings = read("data/buildings.json").tracks[1].buildings,
  venue = read("data/corner-details.json").tracks[1];
test("Monaco recovers all three sourced landmarks without placing buildings on roads", () => {
  const clear = new CircuitClearance(track);
  const landmarks = buildings.filter((b) => b.monaco_reference_part);
  assert.ok(landmarks.length >= 3);
  for (const name of [
    "Casino de Monte-Carlo",
    "Fairmont Monte Carlo",
    "Hôtel de Paris Monte-Carlo",
  ])
    assert.ok(landmarks.some((b) => b.name === name));
  for (const b of landmarks) {
    assert.ok(clear.polygonClear(b.footprint));
    assert.match(b.height_source, /photo-estimated/);
    assert.ok(b.osm_id > 0);
    assert.ok(
      b.roof_height >= track.heights[b.roof_anchor_index] + b.height - 0.01,
    );
  }
  assert.ok(buildings.some((b) => b.name === "Le Mirabeau" && b.height === 81));
});
test("Monaco temporary barrier estimates are named, labelled and road-clear", () => {
  const clear = new CircuitClearance(track, 0.12),
    barriers = venue.barriers.filter((b) => b.evidence?.includes("±1 m"));
  assert.ok(barriers.length > 500);
  assert.ok(new Set(barriers.map((b) => b.name)).size >= 6);
  for (const b of barriers)
    for (const f of [0, 0.25, 0.5, 0.75, 1])
      assert.ok(
        clear.circleClear(
          b.a[0] + (b.b[0] - b.a[0]) * f,
          b.a[1] + (b.b[1] - b.a[1]) * f,
          b.radius,
        ),
      );
  for (const p of venue.profiles)
    assert.match(p.label, /MODERN MONACO SCENERY ALL ERAS/);
});
test("all 47 scan slots remain honest about unverified geometry", () => {
  const roster = read("data/roster.json").eras.flatMap((e) => e.teams),
    assets = read("data/car-asset-status.json");
  assert.equal(assets.cars.length, 47);
  assert.equal(new Set(assets.cars.map((c) => c.id)).size, 47);
  assert.equal(assets.integrated_scan_count, 0);
  assert.deepEqual(
    new Set(assets.cars.map((c) => c.id)),
    new Set(roster.map((c) => c.id)),
  );
  for (const c of assets.cars) {
    assert.equal(c.scan_asset, null);
    assert.equal(c.status, "awaiting_verified_scan");
    assert.equal(c.capture_method, null);
  }
  assert.ok(
    assets.candidates.some(
      (c) =>
        c.kind === "scale_model_photogrammetry" &&
        c.status === "rejected_wrong_season",
    ),
  );
});

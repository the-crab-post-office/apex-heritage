import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const roster = JSON.parse(fs.readFileSync("data/roster.json"));
const manifest = JSON.parse(
  fs.readFileSync("web/assets/liveries/manifest.json"),
);
test("complete season constructor counts, unique ids and local original atlases", () => {
  assert.deepEqual(
    roster.eras.map((e) => e.teams.length),
    [9, 18, 10, 10, 10, 11],
  );
  const teams = roster.eras.flatMap((e) => e.teams);
  assert.equal(new Set(teams.map((t) => t.id)).size, 68);
  assert.equal(manifest.teams.length, 90);
  assert.equal(manifest.photo_pixels, false);
  for (const t of teams) {
    const png = fs.readFileSync(`web/assets/liveries/${t.id}.png`);
    assert.equal(png.readUInt32BE(16), 2048);
    assert.equal(png.readUInt32BE(20), 1024);
    assert.match(t.reference, /^https:/);
    assert.ok(t.sponsor && t.minor && t.wing && t.engine);
  }
});
test("single authoritative map databases and no obsolete hero", () => {
  for (const name of ["tracks.json", "buildings.json", "heritage-hero.jpg"])
    assert.equal(fs.existsSync("web/assets/" + name), false);
  assert.match(fs.readFileSync("web/catalog.js", "utf8"), /roster.json/);
  assert.match(fs.readFileSync("src/roster.rs", "utf8"), /data\/roster.json/);
});

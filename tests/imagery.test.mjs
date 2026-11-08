import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { imageryFor, photoUV, forestAt } from "../web/imagery.js";
const tracks = JSON.parse(
  fs.readFileSync(new URL("../data/tracks.json", import.meta.url)),
);
for (const t of tracks)
  test(`${t.name}: actual local photographic asset covers the complete circuit`, () => {
    const a = imageryFor(t.id);
    assert.ok(a.source_url.startsWith("https://sentinel-cogs.s3."));
    assert.equal(a.source_resolution_m, 10);
    assert.equal(a.forest_mask.length, 4096);
    for (const [x, z] of t.points) {
      const [u, v] = photoUV(a, x, z);
      assert.ok(u > 0 && u < 1 && v > 0 && v < 1);
    }
    const jpg = fs.readFileSync(
      new URL(`../web/assets/imagery/${a.file}`, import.meta.url),
    );
    assert.equal(jpg[0], 255);
    assert.equal(jpg[1], 216);
    assert.equal(typeof forestAt(a, 0, 0), "boolean");
    assert.ok(!forestAt(a, 1e8, 1e8));
  });
test("geographic UV is north-up: north-west image corner is UV 0,1", () => {
  assert.deepEqual(photoUV({ bounds: [-20, -30, 80, 70] }, -20, -30), [0, 1]);
  assert.deepEqual(photoUV({ bounds: [-20, -30, 80, 70] }, 80, 70), [1, 0]);
});

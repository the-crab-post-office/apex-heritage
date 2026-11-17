import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { triangleHeight } from "../web/corners.js";
const read = (p) => JSON.parse(fs.readFileSync(p));
const sha = (b) => createHash("sha256").update(b).digest("hex");
test("Monaco is explicit overhead architecture, not a road-clearance exemption", () => {
  const scene = read("data/reference-scenes.json").scenes.find(
    (s) => s.track === "Monaco",
  );
  const track = read("data/tracks.json")[1];
  assert.deepEqual(scene.eras, [0, 1, 2, 3, 4]);
  const floors = scene.facets.filter((f) => f.tag === "hotel-overhead-floor");
  let covered = 0;
  for (let i = 303; i < 340; i++) {
    const [x, z] = track.points[i];
    const y = floors
      .map((f) => triangleHeight(f.p, x, z))
      .find((y) => y !== null);
    if (y !== undefined) {
      covered++;
      assert.ok(y - track.heights[i] >= 4.64);
    }
  }
  assert.ok(covered >= 25);
  assert.ok(
    scene.facets.filter((f) => f.tag === "hotel-windows").length > 1000,
  );
  assert.ok(
    scene.facets.filter((f) => f.tag === "retaining-wall").length >= 100,
  );
  assert.ok(
    fs
      .readFileSync("web/graphics.js", "utf8")
      .includes("this.clearance.polygonClear(b.footprint)"),
  );
  assert.deepEqual(
    read("data/reference-scenes.json").scenes.find((s) =>
      s.track.startsWith("Spa"),
    ).eras,
    [3, 4],
  );
});
test("seven-view report contains actual capture bytes and matching source inputs", () => {
  const html = fs.readFileSync("web/public/spa-monaco-update.html", "utf8"),
    m = read("data/spa-monaco-captures.json");
  const images = [
    ...html.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g),
  ].map((x) => Buffer.from(x[1], "base64"));
  assert.equal(images.length, 7);
  assert.equal(m.captures.length, 7);
  assert.equal(m.version, read("package.json").version);
  for (const [p, hash] of Object.entries(m.inputs))
    assert.equal(sha(fs.readFileSync(p)), hash, p);
  for (const [i, c] of m.captures.entries()) {
    assert.equal(c.version, m.version);
    assert.equal(sha(images[i]), c.sha256);
  }
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/i.test(html));
});

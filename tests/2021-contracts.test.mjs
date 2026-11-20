import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { variantPoint } from "../web/car-variants.js";
import { ENGINE_PROFILES } from "../web/audio/engine-dsp.js";
const read = (p) => JSON.parse(fs.readFileSync(p));
const cars = read("data/car-shapes.json"),
  roster = read("data/roster.json");
test("2021 is additive: stable old season IDs and all ten distinct teams", () => {
  assert.deepEqual(
    roster.eras.slice(0, 5).map((e) => e.year),
    ["1967", "1988", "2004", "2023", "2021"],
  );
  assert.equal(roster.eras[4].teams.length, 10);
  assert.equal(new Set(roster.eras[4].teams.map((t) => t.number)).size, 10);
  assert.equal(
    roster.eras[4].teams.find((t) => t.name === "Red Bull").number,
    33,
  );
  assert.equal(
    roster.eras[3].teams.find((t) => t.name === "Red Bull").number,
    1,
  );
});
test("2021 and 2023 have genuinely different tyre and aero geometry", () => {
  const names = (e) => cars.models[e].flatMap((b) => b.components);
  assert.ok(names(4).includes("2021 bargeboard cascade"));
  assert.ok(names(4).includes("2021 flat stepped reference floor"));
  assert.ok(!names(4).some((n) => n.includes("aerodynamic wheel cover")));
  assert.ok(names(3).some((n) => n.includes("aerodynamic wheel cover")));
  assert.equal(cars.layouts[4].radius, 0.335);
  assert.equal(cars.layouts[3].radius, 0.36);
  assert.ok(
    Math.abs(cars.layouts[4].front - cars.layouts[4].rear - 3.6) < 1e-5,
  );
  for (const e of [3, 4])
    for (const b of cars.models[e])
      assert.ok(b.positions.flat().every(Number.isFinite));
});
test("team variants actually alter body geometry and conformal decals consistently", () => {
  const p = [0.8, 0.45, -0.4];
  assert.notDeepEqual(
    variantPoint("2021-mercedes", "pods", p),
    variantPoint("2021-red-bull", "pods", p),
  );
  assert.deepEqual(
    variantPoint("2021-mercedes", "pods", p),
    variantPoint("2021-mercedes", "decals", p),
  );
  assert.deepEqual(
    variantPoint("2021-mercedes", "body", p),
    variantPoint("2021-mercedes", "engine_decals", p),
  );
  assert.deepEqual(variantPoint("2021-mercedes", "rubber", p), p);
  assert.ok(cars.models[4].some((b) => b.material === "decals"));
});
test("each comparison photo is licensed, attributed, local and has a matching 2021 entry", () => {
  const refs = read("data/car-references.json").references;
  assert.equal(refs.length, 10);
  for (const ref of refs) {
    assert.equal(ref.license, "CC BY-SA 4.0");
    assert.ok(ref.author.includes("Lukas Raich"));
    assert.match(ref.source_page, /^https:\/\/commons.wikimedia.org\/wiki\//);
    assert.ok(fs.statSync(ref.file).size > 5000);
    assert.ok(roster.eras[4].teams.some((t) => t.id === ref.id));
  }
});
test("2021 has a valid explicitly procedural V6 audio profile", () => {
  assert.equal(ENGINE_PROFILES.length, 6);
  assert.equal(ENGINE_PROFILES[4].cylinders, 6);
  assert.match(ENGINE_PROFILES[4].name, /2021/);
});

test("comparison embeds all licensed photos and actual captures with matching checksums", async () => {
  const { createHash } = await import("node:crypto");
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const html = fs.readFileSync("web/public/car-comparison.html", "utf8");
  const images = [
    ...html.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g),
  ].map((match) => Buffer.from(match[1], "base64"));
  const refs = read("data/car-references.json").references;
  const captures = read("data/car-comparison-captures.json");
  assert.equal(images.length, 20);
  assert.equal(captures.captures.length, 10);
  assert.equal(captures.version, read("package.json").version);
  for (const [path, hash] of Object.entries(captures.inputs))
    assert.equal(sha(fs.readFileSync(path)), hash);
  refs.forEach((ref, i) => {
    assert.equal(sha(images[2 * i]), ref.sha256);
    assert.equal(sha(fs.readFileSync(ref.file)), ref.sha256);
    assert.equal(captures.captures[i].id, ref.id);
    assert.equal(sha(images[2 * i + 1]), captures.captures[i].sha256);
  });
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/i.test(html));
  assert.ok(html.includes("CC BY-SA 4.0"));
});

test("changed contact layouts separate lap records without deleting old setup or record data", () => {
  const main = fs.readFileSync("web/main.js", "utf8");
  assert.equal(
    (main.match(/apex-records-v16-brake-priority/g) || []).length,
    3,
  );
  assert.ok(!main.includes('removeItem("apex-records-v8-full-grid")'));
});

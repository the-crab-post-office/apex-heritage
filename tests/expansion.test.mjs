import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { roadPoint } from "../web/road-surface.js";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
test("three new circuit IDs retain geographic maps, source context and physical banking", () => {
  const ts = read("data/tracks.json");
  assert.equal(ts.length, 13);
  assert.deepEqual(
    ts.slice(-3).map((t) => t.id),
    ["ae-2009", "nl-1948", "az-2016"],
  );
  for (const t of ts.slice(-3)) {
    assert.equal(t.heights.length, t.points.length);
    assert.equal(t.banking.length, t.points.length);
    assert.ok(t.layout_status.includes("not reconstructed"));
  }
  const t = ts[11];
  for (const i of [166, 780]) {
    const left = roadPoint(t, i, -4, 0),
      right = roadPoint(t, i, 4, 0);
    assert.ok(Math.abs(right[1] - left[1]) > (i === 166 ? 1.3 : 1.8));
    assert.ok(Math.abs(right[1] - left[1] - 8 * t.banking[i]) < 1e-8);
  }
  const main = fs.readFileSync("web/main.js", "utf8");
  assert.ok(main.includes("tracks.length - 1"));
  assert.ok(!main.includes("(config.track + delta + 10) % 10"));
  assert.ok(main.includes("apex-records-v16-brake-priority"));
});
test("six-view expansion report contains actual capture bytes and matching inputs", () => {
  const html = fs.readFileSync("web/public/new-circuits.html", "utf8");
  const m = read("data/expansion-captures.json");
  const images = [
    ...html.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g),
  ].map((x) => Buffer.from(x[1], "base64"));
  assert.equal(images.length, 6);
  assert.equal(m.captures.length, 6);
  assert.equal(m.version, read("package.json").version);
  for (const [p, hash] of Object.entries(m.inputs))
    assert.equal(sha(fs.readFileSync(p)), hash, p);
  for (const [i, c] of m.captures.entries()) {
    assert.equal(c.version, m.version);
    assert.equal(sha(images[i]), c.sha256);
  }
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/i.test(html));
});

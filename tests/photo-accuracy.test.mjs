import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
const read = (p) => JSON.parse(fs.readFileSync(p));
const sha = (b) => createHash("sha256").update(b).digest("hex");
test("period proportions no longer use a 2.48 m wide common track or oversized rear wings", () => {
  const shapes = read("data/car-shapes.json");
  for (const [era, maxWidth] of [
    [1, 2.16],
    [2, 1.81],
  ]) {
    const l = shapes.layouts[era];
    assert.ok(2 * l.half + l.rear_width <= maxWidth);
    assert.equal(l.radius, 0.33);
    assert.ok(
      shapes.models[era].some((b) =>
        b.components.includes("period conformal sidepod sponsor"),
      ),
    );
  }
  assert.ok(shapes.layouts[0].front_radius < shapes.layouts[0].rear_radius);
  assert.equal(shapes.layouts[2].front - shapes.layouts[2].rear, 3.05);
  // Wings are batched with other geometry; tagged components are bounded by
  // the highest vertex of the entire model rather than a fake shape score.
  for (const era of [1, 2, 3, 4]) {
    const rear = shapes.models[era].filter((b) =>
      b.components.every((n) => /rear|DRS/.test(n)),
    );
    assert.ok(rear.length);
    for (const batch of rear)
      for (const p of batch.positions)
        assert.ok(p[1] <= (era < 3 ? 1.001 : 0.951));
  }
});
test("photo audit embeds fifteen matching source photographs and actual capture checksums", () => {
  const html = fs.readFileSync("web/public/photo-accuracy.html", "utf8");
  const images = [
    ...html.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g),
  ].map((m) => Buffer.from(m[1], "base64"));
  const refs = read("data/photo-audit-references.json").references,
    captures = read("data/photo-audit-captures.json");
  assert.equal(images.length, 30);
  assert.equal(refs.length, 15);
  assert.equal(captures.captures.length, 15);
  assert.equal(captures.version, read("package.json").version);
  for (const [path, hash] of Object.entries(captures.inputs))
    assert.equal(sha(fs.readFileSync(path)), hash, path);
  refs.forEach((r, i) => {
    assert.equal(sha(images[2 * i]), r.sha256);
    assert.equal(sha(images[2 * i + 1]), captures.captures[i].sha256);
  });
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/i.test(html));
});

test("coarse terrain and shoulder triangles are cut away rather than occluding physical aprons", async () => {
  const { cornerFootprintMask } = await import("../web/corners.js");
  const { area } = await import("../web/road-surface.js");
  const physical = [
    [0, 2, 0],
    [10, 3, 0],
    [0, 2, 10],
  ];
  const mask = cornerFootprintMask([
    { kind: 2, p: physical },
    {
      kind: 3,
      p: [
        [20, 0, 0],
        [30, 0, 0],
        [20, 0, 10],
      ],
    },
    {
      kind: 0,
      p: [
        [40, 0, 0],
        [40, 2, 0],
        [40, 2, 10],
      ],
    },
  ]);
  assert.equal(mask.cut(physical.map(([x, , z]) => [x, 100, z])).length, 0);
  assert.equal(mask.triangles.length, 1);
  const plane = [
    [-5, 100, -5],
    [20, 100, -5],
    [-5, 100, 20],
  ];
  const left = mask.cut(plane);
  assert.ok(
    Math.abs(
      left.reduce((a, t) => a + area(t), 0) - (area(plane) - area(physical)),
    ) < 1e-5,
  );
});

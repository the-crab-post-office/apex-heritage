import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { GroundSupport, groundSpans } from "../web/ground-support.js";
function mesh(points, index = null) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points.flat(), 3),
  );
  if (index) g.setIndex(index);
  return new THREE.Mesh(g);
}
test("ground support interpolates actual triangles, including transformed indexed meshes", () => {
  const m = mesh(
    [
      [0, 0, 0],
      [10, 10, 0],
      [0, 0, 10],
    ],
    [0, 1, 2],
  );
  m.position.set(-40, 3, -40);
  const g = new GroundSupport([m, m]);
  assert.equal(g.triangles.length, 1);
  assert.equal(g.height(-38, -38), 5);
  assert.equal(g.height(100, 100), null);
});
test("ground support chooses the visible upper layer and ignores vertical faces", () => {
  const g = new GroundSupport([
    mesh([
      [0, 0, 0],
      [10, 0, 0],
      [0, 0, 10],
      [0, 5, 0],
      [10, 5, 0],
      [0, 5, 10],
      [0, 0, 0],
      [0, 10, 0],
      [0, 10, 10],
    ]),
  ]);
  assert.equal(g.height(2, 2), 5);
  assert.equal(g.height(9, 9), null);
  assert.equal(g.triangles.length, 2);
});
test("barrier spans stay short and adapt to a terrain crease", () => {
  const ground = (x) => Math.abs(x - 0.65) * 2;
  const spans = groundSpans({ a: [0, 0], b: [6, 0] }, ground);
  assert.ok(spans.length > 4);
  for (const [a, b] of spans) {
    assert.ok(Math.hypot(b[0] - a[0], b[2] - a[2]) <= 1.500001);
    assert.ok(
      Math.abs(ground((a[0] + b[0]) / 2) - (a[1] + b[1]) / 2) <= 0.040001,
    );
    assert.equal(a[1], ground(a[0]));
    assert.equal(b[1], ground(b[0]));
  }
});

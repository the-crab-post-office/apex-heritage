import test from "node:test";
import assert from "node:assert/strict";
import { CornerIndex, triangleHeight } from "../web/corners.js";
const p = [
  [0, 0, 0],
  [2, 2, 0],
  [0, 0, 2],
];
test("corner picking uses barycentric triangle, not its bounding rectangle", () => {
  assert.equal(triangleHeight(p, 1, 0.5), 1);
  assert.equal(triangleHeight(p, 1.9, 1.9), null);
});
test("contact-shadow index selects the highest physical facet", () => {
  let index = new CornerIndex([
    { p, kind: 1 },
    { p: p.map(([x, y, z]) => [x, y + 1, z]), kind: 0 },
  ]);
  assert.deepEqual(index.at(1, 0.5), { y: 2, kind: 0 });
  assert.equal(index.at(1.9, 1.9), null);
});
test("physical facet index spans negative cells and boundaries", () => {
  let index = new CornerIndex([
    { p: p.map(([x, y, z]) => [x - 25, y, z - 1]), kind: 2 },
  ]);
  assert.deepEqual(index.at(-24, -0.5), { y: 1, kind: 2 });
  assert.equal(index.at(0, 0), null);
});
test("absent corner geometry is safe", () =>
  assert.equal(new CornerIndex([]).at(0, 0), null));

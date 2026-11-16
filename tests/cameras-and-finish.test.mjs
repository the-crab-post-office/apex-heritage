import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const cars = JSON.parse(fs.readFileSync("data/car-shapes.json"));
const rigs = JSON.parse(fs.readFileSync("data/cameras.json"));
test("all four eras use bounded detailed meshes, isolated driver heads and cockpit fittings", () => {
  assert.deepEqual(Object.keys(cars.models), ["0", "1", "2", "3"]);
  for (const [era, batches] of Object.entries(cars.models)) {
    const names = batches.flatMap((b) => b.components);
    for (const name of [
      "cockpit floor pan",
      "instrument binnacle",
      "driver sleeve",
      "shoulder harness",
      "stationary brake caliper",
      "centre-lock wheel nut",
    ])
      assert.ok(names.includes(name), `${era}: ${name}`);
    assert.equal(
      batches
        .filter((b) => b.head)
        .flatMap((b) => b.components)
        .sort()
        .join(),
      "dark visor,driver helmet",
    );
    for (const b of batches) {
      assert.ok(b.positions.length < 10000);
      assert.ok(b.indices.length <= 32768);
      assert.equal(b.positions.length, b.uvs.length);
      assert.ok(b.indices.every((i) => i >= 0 && i < b.positions.length));
    }
  }
  assert.ok(
    cars.models[1].some((b) =>
      b.components.includes("1988 low turbo monocoque"),
    ),
  );
  assert.ok(
    cars.models[2].some((b) =>
      b.components.includes("2004 high-nose monocoque"),
    ),
  );
  assert.ok(
    cars.models[2].some((b) =>
      b.components.includes("four circumferential grooves"),
    ),
  );
  assert.ok(
    cars.models[3].some((b) =>
      b.components.includes("solid curved rear endplate"),
    ),
  );
});
test("eight distinct shared rigs preserve old cycle order and provide genuine rear and orbit views", () => {
  assert.equal(rigs.length, 8);
  assert.equal(new Set(rigs.map((r) => r.id)).size, 8);
  assert.deepEqual(
    rigs.slice(0, 3).map((r) => r.id),
    ["chase", "cockpit", "high"],
  );
  for (const rig of rigs) {
    assert.ok(rig.position.every(Number.isFinite));
    assert.ok(rig.target.every(Number.isFinite));
    assert.ok(rig.fov >= 45 && rig.fov <= 90);
    assert.notDeepEqual(rig.position, rig.target);
  }
  assert.ok(rigs[1].attached && rigs[1].hide_head);
  assert.ok(rigs[1].position[1] < 1);
  assert.ok(rigs[5].target[2] < -20);
});

import test from "node:test";
import assert from "node:assert/strict";
import { Vector3, Group } from "three";
import fs from "node:fs";
import { wheelRig, steeringAngle, advanceWheel } from "../web/wheel-motion.js";
const layouts = JSON.parse(fs.readFileSync("data/car-layouts.json"));
test("five-era steered wheel axle is horizontal and invariant over 20 revolutions, both locks", () => {
  for (const layout of Object.values(layouts))
    for (const side of [-1, 1])
      for (const steering of [-1, -0.3, 0, 0.3, 1]) {
        const wheel = wheelRig(layout, side, true),
          car = new Group();
        car.add(wheel.mesh);
        const yaw = steeringAngle(wheel, layout, 0.5, steering, 5);
        for (let frame = 0; frame < 720; frame++) {
          advanceWheel(wheel, 20, 1 / 60, yaw);
          car.updateMatrixWorld(true);
          const axle = new Vector3(1, 0, 0).transformDirection(
            wheel.spin.matrixWorld,
          );
          assert.ok(
            Math.abs(axle.y) < 1e-12,
            `Axle tilted at ${frame}: ${axle.y}`,
          );
          assert.ok(Math.abs(axle.x - Math.cos(yaw)) < 1e-12);
          assert.ok(Math.abs(axle.z + Math.sin(yaw)) < 1e-12);
          assert.equal(wheel.mesh.rotation.x, 0);
          assert.equal(wheel.mesh.position.y, wheel.radius);
        }
      }
});
test("spin follows shared rolling radius; reverse reverses phase and rear hubs never steer", () => {
  for (const layout of Object.values(layouts)) {
    const wheel = wheelRig(layout, 1, false);
    advanceWheel(wheel, layout.radius, 1);
    assert.ok(Math.abs(wheel.phase - 1) < 1e-12);
    advanceWheel(wheel, -layout.radius, 1);
    assert.ok(Math.abs(wheel.phase) < 1e-12);
    assert.equal(steeringAngle(wheel, layout, 0.5, 1, 10), 0);
  }
});
test("Ackermann keeps inner wheel tighter and left/right steering symmetric", () => {
  for (const layout of Object.values(layouts)) {
    const left = wheelRig(layout, -1, true),
      right = wheelRig(layout, 1, true);
    const a = steeringAngle(left, layout, 0.29, 1, 5);
    const b = steeringAngle(right, layout, 0.29, 1, 5);
    assert.ok(b > a && a > 0);
    assert.ok(Math.abs(a + steeringAngle(right, layout, 0.29, -1, 5)) < 1e-12);
  }
});

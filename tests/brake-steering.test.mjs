import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as Core from "../web/wasm/apex.js";
await Core.default({
  module_or_path: fs.readFileSync("web/wasm/apex_bg.wasm"),
});
test("released WASM retains turn-in with full brake in all six eras, dry and wet", () => {
  for (let era = 0; era < 6; era++)
    for (const wet of [false, true]) {
      const run = (brake) => {
        const sim = new Core.Simulation(2, era, 0, wet, true);
        try {
          for (let k = 0; k < 300; k++) sim.step(1, 0, 0, 1 / 120);
          for (let k = 0; k < 18; k++) sim.step(0, brake, 1, 1 / 120);
          return JSON.parse(sim.state_json());
        } finally {
          sim.free();
        }
      };
      const coast = run(0),
        braking = run(1);
      const curvature = (s) => Math.abs(s.yaw_rate) / Math.max(1, s.speed);
      assert.ok(coast.speed > 15);
      assert.ok(
        braking.speed < coast.speed,
        `braking must still slow era ${era}`,
      );
      assert.ok(Math.abs(braking.steering - coast.steering) < 1e-6);
      assert.ok(
        curvature(braking) >= curvature(coast) * 0.9,
        `era ${era} wet ${wet}: brake curvature ${curvature(braking)}, coast ${curvature(coast)}`,
      );
      assert.equal(braking.brake, 1);
    }
});

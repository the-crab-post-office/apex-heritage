import test from "node:test";
import assert from "node:assert/strict";
import { Controller, steeringAxis } from "../web/controller.js";
const pad = (x = 0, buttons = {}) => ({
  index: 0,
  id: "Test controller",
  connected: true,
  mapping: "standard",
  axes: [x],
  buttons: Array.from({ length: 17 }, (_, i) => ({
    value: buttons[i] || 0,
    pressed: (buttons[i] || 0) > 0.5,
  })),
});
test("deadzone is rescaled, progressive and reaches full lock", () => {
  assert.equal(steeringAxis(0.1), 0);
  assert.equal(steeringAxis(1), 1);
  assert.equal(steeringAxis(-1), -1);
  assert.ok(steeringAxis(0.5) > 0.2 && steeringAxis(0.5) < 0.5);
  assert.equal(steeringAxis(NaN), 0);
});
test("analog triggers and steering; actions fire once per press", () => {
  const c = new Controller();
  let p = c.poll([pad(0.6, { 7: 0.4, 6: 0.2, 9: 1 })]);
  assert.equal(p.throttle, 0.4);
  assert.equal(p.brake, 0.2);
  assert.ok(p.steer < 0);
  assert.ok(p.pressed.has(9));
  assert.equal(c.poll([pad(0, { 9: 1 })]).pressed.size, 0);
  c.poll([pad()]);
  assert.ok(c.poll([pad(0, { 9: 1 })]).pressed.has(9));
});
test("disconnect clears controls and edge history; nonstandard pads are not mis-mapped", () => {
  const c = new Controller();
  c.poll([pad(1, { 7: 1 })]);
  const p = c.poll([]);
  assert.equal(p.throttle, 0);
  assert.equal(p.steer, 0);
  assert.ok(c.lost);
  assert.equal(c.poll([{ ...pad(), mapping: "" }]).throttle, 0);
});

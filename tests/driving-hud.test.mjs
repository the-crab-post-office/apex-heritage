import test from "node:test";
import assert from "node:assert/strict";
import { LapDelta, gaugeTelemetry, formatDelta } from "../web/driving-hud.js";
const state = (lap, p, t, extra = {}) => ({
  lap,
  progress: p,
  lap_time: t,
  last: 0,
  best: 0,
  invalid: false,
  pit_active: false,
  ...extra,
});
function lap(d, time = 100, extra = {}) {
  for (let i = 0; i <= 99; i++)
    d.observe(state(1, i / 100, (time * i) / 100, extra));
  d.observe(state(2, 0, 0, { last: time, best: time }));
}
test("first lap has no invented live delta; a valid completed lap supplies time-at-distance interpolation", () => {
  const d = new LapDelta();
  d.observe(state(1, 0, 0));
  assert.equal(d.value(state(1, 0.5, 50)), null);
  lap(d);
  assert.equal(d.reference.time, 100);
  assert.ok(Math.abs(d.value(state(2, 0.505, 49.5)) + 1) < 1e-8);
  assert.equal(d.value(state(2, 0.5, 51)), 1);
});
test("invalid, recovered, pit-lane and teleported traces cannot become reference laps", () => {
  for (const extra of [{ invalid: true }, { pit_active: true }]) {
    const d = new LapDelta();
    lap(d, 100, extra);
    assert.equal(d.reference, null);
  }
  const recovered = new LapDelta();
  recovered.observe(state(1, 0, 0));
  recovered.invalidate();
  lap(recovered);
  assert.equal(recovered.reference, null);
  const cut = new LapDelta();
  cut.observe(state(1, 0, 0));
  cut.observe(state(1, 0.5, 1));
  for (let i = 51; i < 100; i++) cut.observe(state(1, i / 100, i));
  cut.observe(state(2, 0, 0, { last: 100, best: 100 }));
  assert.equal(cut.reference, null);
});
test("a slower lap retains the best trace, a faster valid lap replaces it and invalid current laps hide delta", () => {
  const d = new LapDelta();
  lap(d);
  for (let i = 1; i < 100; i++) d.observe(state(2, i / 100, (110 * i) / 100));
  d.observe(state(3, 0, 0, { last: 110, best: 100 }));
  assert.equal(d.reference.time, 100);
  for (let i = 1; i < 100; i++) d.observe(state(3, i / 100, (90 * i) / 100));
  d.observe(state(4, 0, 0, { last: 90, best: 90 }));
  assert.equal(d.reference.time, 90);
  assert.equal(d.value(state(4, 0.5, 40, { invalid: true })), null);
  d.invalidate();
  assert.equal(d.value(state(4, 0.5, 40)), null);
});
test("finish-line frame carrying the previous lap timer does not poison the next lap", () => {
  const d = new LapDelta();
  for (let i = 0; i < 100; i++) d.observe(state(1, i / 100, i));
  d.observe(state(2, 0, 100, { last: 100, best: 100 }));
  assert.equal(d.value(state(2, 0, 100)), null);
  d.observe(state(2, 0.0001, 0.01, { last: 100, best: 100 }));
  assert.equal(d.valid, true);
  assert.ok(Math.abs(d.value(state(2, 0.0001, 0.01))) < 1e-6);
});
test("gauges use real units, era RPM limits and bounded needle angles", () => {
  const g = gaugeTelemetry({ speed: 100, rpm: 9500 }, 2);
  assert.equal(g.speed, 360);
  assert.equal(g.rpmFraction, 0.5);
  assert.equal(g.rpmAngle, 0);
  assert.equal(g.speedAngle, 100);
  assert.equal(gaugeTelemetry({ rpm: 100000, speed: 1000 }, 0).rpmAngle, 125);
  assert.equal(gaugeTelemetry({ rpm: -1, speed: 0 }, 3).rpmAngle, -125);
});
test("DRS never invents availability: absent telemetry is N/A, classics have none, only explicit modern active telemetry is green", () => {
  assert.equal(gaugeTelemetry({}, 3).drsLabel, "DRS N/A");
  assert.equal(gaugeTelemetry({ drs_active: true }, 0).drsActive, false);
  assert.equal(gaugeTelemetry({ drs_active: true }, 0).drsLabel, "NO DRS");
  assert.equal(gaugeTelemetry({ drs_active: false }, 4).drsLabel, "DRS OFF");
  assert.equal(gaugeTelemetry({ drs_active: true }, 3).drsActive, true);
  assert.equal(formatDelta(null), "—.———");
  assert.equal(formatDelta(-1.234), "−1.234");
  assert.equal(formatDelta(0.432), "+0.432");
});

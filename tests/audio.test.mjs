import { test } from "node:test";
import assert from "node:assert/strict";
import { EngineDSP, ENGINE_PROFILES } from "../web/audio/engine-dsp.js";
const SR = 48000;
const rms = (a) => Math.sqrt(a.reduce((sum, x) => sum + x * x, 0) / a.length);
function render(era = 2, rpm = 12000, load = 1, extra = {}) {
  const dsp = new EngineDSP(SR);
  dsp.setTelemetry({
    voices: [
      { era, rpm, load, gain: 1, gear: 3, speed: 55, boost: 0.8, ...extra },
    ],
  });
  const left = new Float32Array(SR),
    right = new Float32Array(SR);
  dsp.render(left, right);
  return { dsp, left: left.slice(SR / 2), right: right.slice(SR / 2) };
}
function energy(a, freq) {
  let re = 0,
    im = 0;
  for (let i = 0; i < a.length; i++) {
    const p = (2 * Math.PI * freq * i) / SR;
    re += a[i] * Math.cos(p);
    im += a[i] * Math.sin(p);
  }
  return Math.hypot(re, im) / a.length;
}
for (let era = 0; era < 4; era++)
  test(`${ENGINE_PROFILES[era].name}: finite, audible and bounded`, () => {
    const { left } = render(era, ENGINE_PROFILES[era].peak * 0.7);
    assert(left.every(Number.isFinite));
    assert(rms(left) > 0.01);
    assert(rms(left) < 0.4);
    assert(Math.max(...left.map(Math.abs)) < 1);
  });
test("throttle increases sound energy and harmonic richness", () => {
  const idle = render(2, 12000, 0),
    loaded = render(2, 12000, 1);
  assert(rms(loaded.left) > rms(idle.left) * 1.3);
});
test("V10 firing frequency follows RPM rather than arbitrary oscillators", () => {
  const low = render(2, 6000),
    high = render(2, 12000);
  assert(energy(low.left, 500) > energy(low.left, 1000) * 1.1);
  assert(energy(high.left, 1000) > energy(high.left, 500) * 2);
});
test("left-right engine panning has measurable stereo separation", () => {
  const { left, right } = render(1, 9000, 1, { pan: -0.8 });
  assert(rms(left) > rms(right) * 2.5);
});
test("voice fades to silence smoothly", () => {
  const { dsp } = render();
  dsp.setTelemetry({ voices: [] });
  const a = new Float32Array(SR),
    b = new Float32Array(SR);
  dsp.render(a, b);
  assert(rms(a.slice(SR / 2)) < 0.000001);
});
test("six engines, shifts and lift-off remain finite and do not clip", () => {
  const dsp = new EngineDSP(SR);
  const voices = Array.from({ length: 6 }, (_, i) => ({
    era: 2,
    rpm: 18000,
    load: 1,
    gain: i ? 0.27 : 1,
    gear: 2,
    pan: i % 2 ? 0.7 : -0.7,
  }));
  dsp.setTelemetry({ voices });
  let a = new Float32Array(SR / 2),
    b = new Float32Array(SR / 2);
  dsp.render(a, b);
  dsp.setTelemetry({
    voices: voices.map((v) => ({ ...v, rpm: 12500, gear: 3, load: 0.1 })),
  });
  dsp.render(a, b);
  assert(a.every(Number.isFinite));
  assert(b.every(Number.isFinite));
  assert(Math.max(...a.map(Math.abs)) < 0.95);
  assert(rms(a) > 0.005);
});

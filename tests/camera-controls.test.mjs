import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  normalizeTuning,
  readCameraPreferences,
  writeCameraPreferences,
  tuneCameraRig,
  CAMERA_PREFS_KEY,
} from "../web/camera-controls.js";
const rigs = JSON.parse(fs.readFileSync("data/cameras.json"));
const store = () => ({
  value: null,
  getItem() {
    return this.value;
  },
  setItem(k, v) {
    assert.equal(k, CAMERA_PREFS_KEY);
    this.value = v;
  },
});
test("camera tuning clamps numbers and rejects null, strings and nonfinite values", () => {
  assert.deepEqual(normalizeTuning(null), { distance: 1, fov: null });
  assert.deepEqual(normalizeTuning({ distance: "2", fov: NaN }), {
    distance: 1,
    fov: null,
  });
  assert.deepEqual(normalizeTuning({ distance: 100, fov: 10 }), {
    distance: 1.8,
    fov: 45,
  });
  assert.deepEqual(normalizeTuning({ distance: -2, fov: 200 }), {
    distance: 0.6,
    fov: 100,
  });
});
test("camera preferences preserve selection and independent per-rig overrides", () => {
  const s = store();
  assert.ok(
    writeCameraPreferences(
      s,
      1,
      { chase: { distance: 1.4, fov: 73 }, cockpit: { fov: 90 } },
      rigs,
    ),
  );
  const p = readCameraPreferences(s, rigs);
  assert.equal(p.mode, 1);
  assert.deepEqual(p.views.chase, { distance: 1.4, fov: 73 });
  assert.deepEqual(p.views.cockpit, { distance: 1, fov: 90 });
  assert.equal(p.views.orbit.fov, null);
  assert.equal(JSON.parse(s.value).look, undefined);
});
test("corrupt, future and blocked storage all fail safely", () => {
  for (const value of [
    null,
    "{broken",
    JSON.stringify({ schema: 9 }),
    "null",
  ]) {
    const s = store();
    s.value = value;
    assert.deepEqual(readCameraPreferences(s, rigs), { mode: 0, views: {} });
  }
  assert.deepEqual(readCameraPreferences(null, rigs), { mode: 0, views: {} });
  assert.equal(
    writeCameraPreferences(
      {
        setItem() {
          throw Error("quota");
        },
      },
      0,
      {},
      rigs,
    ),
    false,
  );
  const s = store();
  s.value = JSON.stringify({
    schema: 1,
    selected: "invalid",
    views: { chase: { distance: 999, fov: 1000 } },
  });
  const p = readCameraPreferences(s, rigs);
  assert.equal(p.mode, 0);
  assert.deepEqual(p.views.chase, { distance: 1.8, fov: 100 });
});
test("distance changes only exterior eye positions and never mutates source rigs", () => {
  for (const r of rigs) {
    const before = JSON.stringify(r),
      adjusted = tuneCameraRig(r, { distance: 1.6, fov: 70 });
    assert.equal(JSON.stringify(r), before);
    assert.equal(adjusted.fov, 70);
    assert.equal(adjusted.customFov, true);
    if (r.attached) assert.deepEqual(adjusted.position, r.position);
    else assert.notDeepEqual(adjusted.position, r.position);
    assert.deepEqual(adjusted.target, r.target);
  }
});
test("free look rotates the direction while preserving eye position and target distance", () => {
  for (const r of rigs) {
    const adjusted = tuneCameraRig(r, {}, { yaw: 0.8, pitch: 0.3 });
    assert.deepEqual(adjusted.position, r.position);
    assert.notDeepEqual(adjusted.target, r.target);
    const distance = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));
    assert.ok(
      Math.abs(
        distance(adjusted.position, adjusted.target) -
          distance(r.position, r.target),
      ) < 1e-10,
    );
    assert.deepEqual(
      tuneCameraRig(r, {}, { yaw: 0, pitch: 0 }).target,
      r.target,
    );
  }
});

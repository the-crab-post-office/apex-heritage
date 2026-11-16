// Pure camera tuning/persistence helpers, independent of the renderer and DOM.
export const CAMERA_PREFS_KEY = "apex-camera-preferences-v1";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function normalizeTuning(value = {}) {
  return {
    distance:
      typeof value?.distance === "number" && Number.isFinite(value.distance)
        ? clamp(value.distance, 0.6, 1.8)
        : 1,
    fov:
      typeof value?.fov === "number" && Number.isFinite(value.fov)
        ? clamp(value.fov, 45, 100)
        : null,
  };
}
export function readCameraPreferences(storage, rigs) {
  try {
    const data = JSON.parse(storage.getItem(CAMERA_PREFS_KEY));
    if (data?.schema !== 1) throw new Error("Unsupported preferences");
    const mode = Math.max(
      0,
      rigs.findIndex((r) => r.id === data.selected),
    );
    const views = Object.fromEntries(
      rigs.map((r) => [r.id, normalizeTuning(data.views?.[r.id])]),
    );
    return { mode, views };
  } catch {
    return { mode: 0, views: {} };
  }
}
export function writeCameraPreferences(storage, mode, views, rigs) {
  try {
    storage.setItem(
      CAMERA_PREFS_KEY,
      JSON.stringify({
        schema: 1,
        selected: (rigs[mode] || rigs[0]).id,
        views: Object.fromEntries(
          rigs.map((r) => [r.id, normalizeTuning(views[r.id])]),
        ),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function tuneCameraRig(rig, tuning = {}, look = {}) {
  const t = normalizeTuning(tuning),
    position = [...rig.position],
    target = [...rig.target];
  if (!rig.attached && t.distance !== 1)
    for (let k = 0; k < 3; k++)
      position[k] = target[k] + (position[k] - target[k]) * t.distance;
  const dx = target[0] - position[0],
    dy = target[1] - position[1],
    dz = target[2] - position[2];
  const yawOffset = Number.isFinite(look.yaw) ? look.yaw : 0;
  const pitchOffset = Number.isFinite(look.pitch) ? look.pitch : 0;
  if (yawOffset || pitchOffset) {
    const length = Math.hypot(dx, dy, dz),
      yaw = Math.atan2(dx, dz) + yawOffset;
    const pitch = clamp(
      Math.atan2(dy, Math.hypot(dx, dz)) + pitchOffset,
      -1.45,
      1.45,
    );
    target[0] = position[0] + Math.sin(yaw) * Math.cos(pitch) * length;
    target[1] = position[1] + Math.sin(pitch) * length;
    target[2] = position[2] + Math.cos(yaw) * Math.cos(pitch) * length;
  }
  return {
    ...rig,
    position,
    target,
    fov: t.fov ?? rig.fov,
    customFov: t.fov !== null,
  };
}

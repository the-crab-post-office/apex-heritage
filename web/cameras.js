import { tuneCameraRig } from "./camera-controls.js";
import rigs from "../data/cameras.json";
export const CAMERAS = Object.freeze(rigs.map((r) => Object.freeze(r)));
export function cameraRig(mode, era = 3, time = 0, tuning = {}, look = {}) {
  const rig = CAMERAS[mode] || CAMERAS[0];
  const position = [...rig.position],
    target = [...rig.target];
  if (rig.id === "cockpit" && era === 0) position[1] = target[1] = 0.97;
  if (rig.id === "orbit") {
    position[0] = Math.sin(time * 0.22) * 7.5;
    position[2] = -Math.cos(time * 0.22) * 7.5;
  }
  return tuneCameraRig({ ...rig, position, target }, tuning, look);
}

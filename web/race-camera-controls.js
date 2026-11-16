import { CAMERAS } from "./cameras.js";
import {
  normalizeTuning,
  readCameraPreferences,
  writeCameraPreferences,
} from "./camera-controls.js";
export class RaceCameraControls {
  constructor(world, canvas) {
    this.world = world;
    this.canvas = canvas;
    this.listeners = [];
    this.panel = document.getElementById("camera-settings");
    this.button = document.getElementById("camera-settings-toggle");
    this.distance = document.getElementById("camera-distance");
    this.fov = document.getElementById("camera-fov");
    this.status = document.getElementById("camera-save-status");
    // Accessing localStorage itself can throw in restricted browser contexts.
    try {
      this.storage = window.localStorage;
    } catch {
      this.storage = null;
    }
    const prefs = readCameraPreferences(this.storage, CAMERAS);
    this.views = prefs.views;
    this.world.cameraMode = prefs.mode;
    this.look = { yaw: 0, pitch: 0 };
    this.listen(this.button, "click", () => this.open(this.panel.hidden));
    this.listen(
      document.getElementById("camera-settings-close"),
      "click",
      () => {
        this.open(false);
        this.button.focus();
      },
    );
    this.listen(this.panel, "keydown", (e) => {
      if (e.code === "Escape") {
        e.stopPropagation();
        this.open(false);
        this.button.focus();
      }
    });
    this.listen(this.distance, "input", () =>
      this.tune({ distance: Number(this.distance.value) }),
    );
    this.listen(this.fov, "input", () =>
      this.tune({ fov: Number(this.fov.value) }),
    );
    this.listen(document.getElementById("camera-center"), "click", () =>
      this.center(),
    );
    this.listen(document.getElementById("camera-defaults"), "click", () => {
      delete this.views[CAMERAS[this.world.cameraMode].id];
      this.center();
      this.sync();
      this.save();
    });
    this.panel.querySelectorAll("[data-look]").forEach((b) =>
      this.listen(b, "click", () => {
        const [yaw, pitch] = b.dataset.look.split(",").map(Number);
        this.rotate(yaw, pitch);
      }),
    );
    this.listen(canvas, "contextmenu", (e) => e.preventDefault());
    this.listen(canvas, "pointerdown", (e) => {
      if (e.button !== 2 || this.drag) return;
      e.preventDefault();
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    this.listen(canvas, "pointermove", (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      this.rotate(
        -(e.clientX - this.drag.x) * 0.006,
        -(e.clientY - this.drag.y) * 0.006,
      );
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });
    const endDrag = (e) => {
      if (this.drag?.id !== e.pointerId) return;
      this.drag = null;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      this.listen(canvas, event, endDrag);
    this.listen(window, "blur", () => {
      if (this.drag && canvas.hasPointerCapture(this.drag.id))
        canvas.releasePointerCapture(this.drag.id);
      this.drag = null;
    });
    this.listen(
      canvas,
      "wheel",
      (e) => {
        if (!e.altKey || CAMERAS[this.world.cameraMode].attached) return;
        e.preventDefault();
        const current = normalizeTuning(
          this.views[CAMERAS[this.world.cameraMode].id],
        );
        this.tune({ distance: current.distance + Math.sign(e.deltaY) * 0.05 });
      },
      { passive: false },
    );
    this.open(false);
    this.sync();
  }
  listen(target, event, fn, options) {
    target.addEventListener(event, fn, options);
    this.listeners.push(() => target.removeEventListener(event, fn, options));
  }
  open(open) {
    this.panel.hidden = !open;
    this.button.setAttribute("aria-expanded", String(open));
  }
  sync() {
    const rig = CAMERAS[this.world.cameraMode],
      tuning = normalizeTuning(this.views[rig.id]);
    this.world.cameraTuning = tuning;
    this.world.cameraLook = this.look;
    this.distance.value = tuning.distance;
    this.distance.disabled = rig.attached;
    document.getElementById("camera-distance-value").textContent = rig.attached
      ? "Fixed onboard"
      : `${tuning.distance.toFixed(2)}×`;
    this.fov.value = tuning.fov ?? rig.fov;
    document.getElementById("camera-fov-value").textContent =
      tuning.fov === null ? `${rig.fov}° auto` : `${tuning.fov}°`;
    document.getElementById("camera-settings-title").textContent =
      `${rig.label} camera`;
  }
  tune(patch) {
    const id = CAMERAS[this.world.cameraMode].id;
    this.views[id] = normalizeTuning({
      ...normalizeTuning(this.views[id]),
      ...patch,
    });
    this.world.cameraInitialized = false;
    this.sync();
    this.save();
  }
  save() {
    this.status.textContent = writeCameraPreferences(
      this.storage,
      this.world.cameraMode,
      this.views,
      CAMERAS,
    )
      ? "Saved on this device"
      : "Session only · storage unavailable";
  }
  modeChanged() {
    this.center();
    this.sync();
    this.save();
  }
  rotate(yaw, pitch) {
    this.look.yaw = Math.max(-Math.PI, Math.min(Math.PI, this.look.yaw + yaw));
    this.look.pitch = Math.max(-1.1, Math.min(1.1, this.look.pitch + pitch));
    this.world.cameraLook = this.look;
  }
  center() {
    this.look = { yaw: 0, pitch: 0 };
    this.world.cameraLook = this.look;
  }
  dispose() {
    if (this.drag && this.canvas.hasPointerCapture(this.drag.id))
      this.canvas.releasePointerCapture(this.drag.id);
    this.drag = null;
    this.listeners.forEach((remove) => remove());
    this.open(false);
  }
}

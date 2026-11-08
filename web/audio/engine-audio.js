import processorURL from "./engine-worklet.js?worker&url";
import { ENGINE_PROFILES } from "./engine-dsp.js";
export class EngineAudio {
  constructor(era, on, volume = 0.65) {
    this.era = era;
    this.enabled = on;
    this.volume = volume;
    this.context = null;
    this.node = null;
    this.lastPacket = 0;
    this.lastDistances = [];
    this.telemetry = null;
    this.disposed = false;
    this.ready = this.initialize();
  }
  async initialize() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return false;
      const ctx = (this.context = new Context({ latencyHint: "interactive" }));
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -8;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.14;
      this.gain.connect(this.compressor);
      this.compressor.connect(ctx.destination);
      await ctx.audioWorklet.addModule(processorURL);
      if (this.disposed) return false;
      this.node = new AudioWorkletNode(ctx, "heritage-engine", {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      this.node.onprocessorerror = () => {
        this.error = "Engine processor failed";
        this.available = false;
      };
      this.node.connect(this.gain);
      this.available = true;
      this.resume();
      return true;
    } catch (e) {
      this.error = String(e);
      this.available = false;
      console.warn("Engine audio could not initialize", e);
      return false;
    }
  }
  resume() {
    if (this.context?.state === "suspended")
      this.context.resume().catch(() => {});
  }
  update(state, paused, opponents = [], cameraMode = 0) {
    const ctx = this.context;
    if (!ctx || !this.gain || this.disposed) return;
    const now = ctx.currentTime;
    this.gain.gain.setTargetAtTime(
      this.enabled && !paused ? this.volume : 0,
      now,
      0.035,
    );
    if (!this.node || now - this.lastPacket < 1 / 30) return;
    const dt = Math.max(1 / 120, now - this.lastPacket);
    this.lastPacket = now;
    const voices = [
      {
        era: this.era,
        rpm: state.rpm,
        load: state.throttle * (1 - (state.shift_cut || 0) * 0.8),
        gear: state.gear,
        boost: state.boost,
        speed: state.speed,
        slip: state.slip,
        gain: 1,
        pan: 0,
        camera: cameraMode,
      },
    ];
    const profile = ENGINE_PROFILES[this.era];
    for (let i = 0; i < opponents.length; i++) {
      const a = opponents[i],
        dx = a.mesh.position.x - state.x,
        dz = a.mesh.position.z - state.z,
        dy = a.mesh.position.y - state.y,
        distance = Math.hypot(dx, dy, dz);
      const radial =
        this.lastDistances[i] === undefined
          ? 0
          : Math.max(
              -75,
              Math.min(75, (distance - this.lastDistances[i]) / dt),
            );
      this.lastDistances[i] = distance;
      const speed = a.speed * 3.6;
      const tops = [
        [88, 133, 174, 218, 270],
        [95, 143, 190, 235, 281, 329],
        [89, 130, 169, 208, 246, 287, 335],
        [85, 122, 158, 197, 234, 270, 308, 350],
      ][this.era];
      let g = tops.findIndex((top) => speed < top * 0.965);
      if (g < 0) g = tops.length - 1;
      voices.push({
        era: this.era,
        rpm: Math.max(
          profile.idle,
          Math.min(profile.peak, (speed / tops[g]) * profile.peak),
        ),
        load: a.speed > 10 ? 0.7 : 0.45,
        gear: g + 1,
        boost: 0.8,
        speed: a.speed,
        gain: distance > 160 ? 0 : 0.27 / (1 + (distance * distance) / 800),
        pan: Math.max(
          -1,
          Math.min(
            1,
            -(dx * Math.cos(state.yaw) - dz * Math.sin(state.yaw)) /
              Math.max(distance, 1),
          ),
        ),
        doppler: 343 / (343 + radial),
      });
    }
    this.telemetry = { type: "telemetry", voices };
    this.node.port.postMessage(this.telemetry);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.node?.disconnect();
    this.gain?.disconnect();
    this.compressor?.disconnect();
    this.context?.close().catch(() => {});
  }
}

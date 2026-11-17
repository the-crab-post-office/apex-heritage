import { RecordedLayer } from "./recorded-layer.js";
// Hybrid recorded exhaust plus original procedural transients / modern fallback.
// Standalone DSP shared by AudioWorklet and deterministic offline audio tests.
const TAU = Math.PI * 2,
  SIZE = 2048;
export const ENGINE_PROFILES = [
  {
    name: "1967 / mechanical V8 growl",
    cylinders: 8,
    peak: 10000,
    idle: 2400,
    body: 0.085,
    rough: 0.17,
    turbo: 0,
    harmonics: [
      1, 0.78, 0.32, 0.38, 0.22, 0.12, 0.1, 0.08, 0.04, 0.03, 0.02, 0.02,
    ],
  },
  {
    name: "1988 / turbo V6",
    cylinders: 6,
    peak: 12500,
    idle: 3600,
    body: 0.06,
    rough: 0.09,
    turbo: 0.043,
    harmonics: [
      1, 0.5, 0.67, 0.3, 0.36, 0.18, 0.22, 0.12, 0.12, 0.07, 0.04, 0.03,
    ],
  },
  {
    name: "2004 / V10 scream",
    cylinders: 10,
    peak: 19000,
    idle: 4600,
    body: 0.026,
    rough: 0.035,
    turbo: 0,
    harmonics: [
      1, 0.7, 0.48, 0.38, 0.22, 0.27, 0.18, 0.14, 0.1, 0.065, 0.045, 0.03,
    ],
  },
  {
    name: "2023 / hybrid V6",
    cylinders: 6,
    peak: 12500,
    idle: 3500,
    body: 0.065,
    rough: 0.065,
    turbo: 0.024,
    harmonics: [
      1, 0.41, 0.6, 0.2, 0.3, 0.11, 0.15, 0.08, 0.06, 0.045, 0.03, 0.02,
    ],
  },
];
ENGINE_PROFILES.push({
  ...ENGINE_PROFILES[3],
  name: "2021 / hybrid V6 (procedural)",
  harmonics: [...ENGINE_PROFILES[3].harmonics],
});
function tables(profile, limit, off) {
  const table = new Float32Array(SIZE + 1);
  for (let i = 0; i < SIZE; i++) {
    let value = 0;
    for (let h = 1; h <= Math.min(limit, profile.harmonics.length); h++) {
      const phase = h === 1 ? 0 : Math.sin(h * 1.73) * 0.55;
      value +=
        profile.harmonics[h - 1] *
        (off ? Math.pow(0.75, h - 1) : 1) *
        Math.sin((TAU * i * h) / SIZE + phase);
    }
    table[i] = value * 0.46;
  }
  table[SIZE] = table[0];
  return table;
}
const BANK = ENGINE_PROFILES.map((p) =>
  [6, 10, 12].map((n) => ({
    on: tables(p, n, false),
    off: tables(p, n, true),
    harmonics: n,
  })),
);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function read(table, phase) {
  const p = phase * SIZE,
    i = Math.floor(p),
    t = p - i;
  return lerp(table[i], table[i + 1], t);
}
class Voice {
  constructor(era, sr, id) {
    this.era = clamp(era | 0, 0, ENGINE_PROFILES.length - 1);
    this.profile = ENGINE_PROFILES[this.era];
    this.sr = sr;
    this.id = id;
    this.rpm = this.profile.idle;
    this.targetRPM = this.rpm;
    this.load = 0.1;
    this.targetLoad = 0;
    this.gain = 0;
    this.targetGain = 0;
    this.pan = 0;
    this.targetPan = 0;
    this.doppler = 1;
    this.boost = 0;
    this.targetBoost = 0;
    this.phase = (id * 0.173) % 1;
    this.crank = (id * 0.137) % 1;
    this.whine = 0;
    this.noiseLP = 0;
    this.windLP = 0;
    this.seed = 0x71c291 + id * 131;
    this.lastGear = 1;
    this.shift = 0;
    this.targetCut = 0;
    this.cut = 0;
    this.authoritativeCut = false;
    this.lift = 0;
    this.speed = 0;
    this.slip = 0;
    this.bottoming = 0;
    this.targetSlip = 0;
    this.camera = 0;
    this.smoothing = 1 - Math.exp(-1 / (sr * 0.032));
    this.filter = 0;
  }
  set(t) {
    const load = clamp(Number(t.load) || 0, 0, 1);
    this.authoritativeCut = Number.isFinite(t.cut);
    this.targetCut = clamp(Number(t.cut) || 0, 0, 1);
    if (this.targetLoad > 0.45 && load < 0.15) this.lift = 0.18;
    if (t.gear && t.gear !== this.lastGear) {
      this.shift = this.authoritativeCut ? 0 : 0.075;
      this.lastGear = t.gear;
    }
    this.targetRPM = clamp(
      Number(t.rpm) || this.profile.idle,
      this.profile.idle * 0.8,
      this.profile.peak * 1.015,
    );
    this.targetLoad = load;
    this.targetGain = clamp(Number(t.gain) || 0, 0, 1.4);
    this.targetPan = clamp(Number(t.pan) || 0, -1, 1);
    this.doppler = clamp(Number(t.doppler) || 1, 0.75, 1.35);
    this.targetBoost = clamp(Number(t.boost) || 0, 0, 1);
    this.speed = Math.max(0, Number(t.speed) || 0);
    this.targetSlip = clamp(Number(t.slip) || 0, 0, 1);
    this.bottoming = clamp(Number(t.bottoming) || 0, 0, 1);
    this.camera = t.camera || 0;
  }
  sample() {
    const a = this.smoothing,
      p = this.profile,
      sr = this.sr;
    this.rpm = lerp(this.rpm, this.targetRPM, a);
    this.load = lerp(this.load, this.targetLoad, a);
    this.gain = lerp(this.gain, this.targetGain, a);
    this.pan = lerp(this.pan, this.targetPan, a);
    this.boost = lerp(this.boost, this.targetBoost, a * 0.3);
    this.slip = lerp(this.slip, this.targetSlip, a);
    const hz = ((this.rpm * p.cylinders) / 120) * this.doppler;
    this.phase = (this.phase + hz / sr) % 1;
    this.crank = (this.crank + ((this.rpm / 60) * this.doppler) / sr) % 1;
    const bank = BANK[this.era];
    const maxH = (0.44 * sr) / hz;
    const table = maxH >= 12 ? bank[2] : maxH >= 10 ? bank[1] : bank[0];
    this.cut = lerp(this.cut, this.targetCut, a * 2);
    const cut = this.authoritativeCut
      ? 1 - this.cut * 0.82
      : this.shift > 0
        ? 1 - (this.shift / 0.075) * 0.75
        : 1;
    this.shift = Math.max(0, this.shift - 1 / sr);
    this.lift = Math.max(0, this.lift - 1 / sr);
    const load = this.load * cut;
    const irregular =
      1 + p.rough * Math.sin(TAU * this.crank) * Math.sin(TAU * this.crank * 2);
    let exhaust =
      lerp(read(table.off, this.phase), read(table.on, this.phase), load) *
      (0.11 + 0.14 * load) *
      irregular;
    const body = Math.sin(TAU * this.crank * 2) * p.body * (0.4 + 0.6 * load);
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >>> 17;
    this.seed ^= this.seed << 5;
    const noise = (this.seed >>> 0) / 2147483648 - 1;
    this.noiseLP += 0.16 * (noise - this.noiseLP);
    this.windLP += 0.035 * (noise - this.windLP);
    const intake = (noise - this.noiseLP) * (0.007 + 0.017 * load);
    this.whine =
      (this.whine + (1700 + this.boost * 4200 + this.rpm * 0.05) / sr) % 1;
    const turbo =
      Math.sin(TAU * this.whine) * p.turbo * this.boost * load +
      (noise - this.noiseLP) * p.turbo * this.boost * 0.4;
    const burble =
      this.lift > 0
        ? Math.max(0, Math.sin(this.lift * TAU * 25)) ** 6 *
          this.lift *
          0.35 *
          (Math.sin(this.crank * TAU) + this.noiseLP)
        : 0;
    const limiter =
      this.rpm > p.peak * 0.985
        ? Math.sin(this.crank * TAU * 3) > -0.2
          ? 1
          : 0.45
        : 1;
    const recorded = this.recording
      ? this.recording.sample(this.rpm, this.doppler) *
        (0.27 + 0.3 * load) *
        cut
      : 0;
    let sample =
      (exhaust * (this.recording ? 0.28 : 1) +
        body * (this.recording ? 0.4 : 1) +
        recorded +
        intake +
        turbo +
        burble) *
      limiter;
    if (this.id === 0) {
      sample +=
        this.noiseLP * this.slip * this.slip * 0.11 +
        (noise - this.noiseLP) *
          this.bottoming *
          Math.min(1, this.speed / 12) *
          0.16 +
        this.windLP * Math.min(1, this.speed / 100) ** 2 * 0.14;
    }
    // Cockpit softens high frequency exhaust, while the chase view stays brighter.
    const coefficient = this.camera === 1 ? 0.38 : 0.75;
    this.filter += coefficient * (sample - this.filter);
    return this.filter * this.gain;
  }
}
export class EngineDSP {
  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
    this.voices = [];
    this.frames = 0;
    this.recordings = {};
  }
  setRecordings(banks) {
    this.recordings = banks;
    for (const v of this.voices)
      v.recording = banks[v.era]
        ? new RecordedLayer(
            { ...banks[v.era], cylinders: ENGINE_PROFILES[v.era].cylinders },
            this.sampleRate,
            (v.id * 0.137) % 1,
          )
        : null;
  }
  setTelemetry(packet) {
    const items = packet.voices || [];
    for (let i = 0; i < items.length; i++) {
      const t = items[i];
      if (!this.voices[i] || this.voices[i].era !== t.era) {
        this.voices[i] = new Voice(t.era, this.sampleRate, i);
        if (this.recordings[t.era])
          this.voices[i].recording = new RecordedLayer(
            {
              ...this.recordings[t.era],
              cylinders: ENGINE_PROFILES[t.era].cylinders,
            },
            this.sampleRate,
            (i * 0.137) % 1,
          );
      }
      this.voices[i].set(t);
    }
    for (let i = items.length; i < this.voices.length; i++)
      this.voices[i].targetGain = 0;
  }
  render(left, right) {
    for (let i = 0; i < left.length; i++) {
      let l = 0,
        r = 0;
      for (const v of this.voices) {
        const x = v.sample();
        l += x * Math.sqrt((1 - v.pan) * 0.5);
        r += x * Math.sqrt((1 + v.pan) * 0.5);
      }
      left[i] = l / (1 + Math.abs(l) * 0.75);
      right[i] = r / (1 + Math.abs(r) * 0.75);
    }
    this.frames += left.length;
  }
}

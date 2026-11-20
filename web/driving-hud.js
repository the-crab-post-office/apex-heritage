// HUD-only telemetry. Does not change the simulation or invent DRS availability.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function gaugeTelemetry(state, era) {
  const rpm = Math.max(0, Number(state.rpm) || 0),
    speed = Math.abs(Number(state.speed) || 0) * 3.6,
    peak = [10000, 12500, 19000, 12500, 12500][era] || 12500;
  const modern = era === 3 || era === 4,
    supported = modern && typeof state.drs_active === "boolean";
  return {
    rpm,
    speed,
    rpmFraction: clamp(rpm / peak, 0, 1),
    rpmAngle: -125 + clamp(rpm / peak, 0, 1) * 250,
    speedAngle: -125 + clamp(speed / 400, 0, 1) * 250,
    drsActive: supported && state.drs_active,
    drsLabel: !modern
      ? "NO DRS"
      : supported
        ? state.drs_active
          ? "DRS ACTIVE"
          : "DRS OFF"
        : "DRS N/A",
  };
}
export function formatDelta(delta) {
  return Number.isFinite(delta)
    ? `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta).toFixed(3)}`
    : "—.———";
}
// Time-at-distance trace from a complete valid lap in THIS session. A scalar
// saved best time cannot supply an honest live delta, so it is never substituted.
export class LapDelta {
  constructor() {
    this.reference = null;
    this.lap = null;
    this.points = [];
    this.valid = true;
  }
  begin(s) {
    this.lap = s.lap;
    this.points = [{ p: 0, t: 0 }];
    this.valid = s.progress < 0.03 && !s.invalid && !s.pit_active;
    this.previous = null;
    this.awaitingReset = false;
  }
  observe(s) {
    if (this.lap === null) this.begin(s);
    if (s.lap !== this.lap) {
      const end = this.points.at(-1);
      if (
        s.lap === this.lap + 1 &&
        this.valid &&
        this.points.length >= 20 &&
        end.p > 0.94 &&
        s.last > 0 &&
        Math.abs(s.best - s.last) < 0.02 &&
        (!this.reference || s.last < this.reference.time)
      )
        this.reference = {
          time: s.last,
          points: [...this.points, { p: 1, t: s.last }],
        };
      this.begin(s);
      this.awaitingReset = s.lap_time > s.last * 0.5 && s.progress < 0.03;
    }
    if (this.awaitingReset) {
      if (s.lap_time > 0.5) return;
      this.awaitingReset = false;
    }
    const p = Number(s.progress),
      t = Number(s.lap_time);
    if (!Number.isFinite(p) || !Number.isFinite(t)) return;
    if (s.invalid || s.pit_active) this.valid = false;
    if (
      this.previous &&
      (p < this.previous.p - 0.005 ||
        p > this.previous.p + 0.08 ||
        t < this.previous.t - 0.02)
    )
      this.valid = false;
    this.previous = { p, t };
    if (p > this.points.at(-1).p + 0.0005) this.points.push({ p, t });
  }
  invalidate() {
    this.valid = false;
  }
  value(s) {
    if (
      !this.reference ||
      !this.valid ||
      this.awaitingReset ||
      s.invalid ||
      s.pit_active
    )
      return null;
    const a = this.reference.points,
      p = clamp(s.progress, 0, 1);
    let lo = 0,
      hi = a.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (a[m].p <= p) lo = m;
      else hi = m;
    }
    const f = (p - a[lo].p) / (a[hi].p - a[lo].p || 1),
      target = a[lo].t + (a[hi].t - a[lo].t) * f;
    return s.lap_time - target;
  }
}

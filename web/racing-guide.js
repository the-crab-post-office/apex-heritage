import { racingPath, pathCurvature } from "./racing-path.js";
// Defaults mirror the shared Rust era specs. The race passes the actual
// team-adjusted Simulation.spec_json(), rather than using generic speed guesses.
export const GUIDE_SPECS = [
  { mass: 540, power: 300000, grip: 1.16, aero: 0.05, brake: 13, drag: 0.68 },
  { mass: 540, power: 500000, grip: 1.5, aero: 1.65, brake: 21, drag: 0.73 },
  { mass: 605, power: 660000, grip: 1.75, aero: 2.8, brake: 30, drag: 0.86 },
  { mass: 798, power: 735000, grip: 1.9, aero: 4.1, brake: 32, drag: 0.91 },
  { mass: 752, power: 735000, grip: 1.94, aero: 3.8, brake: 32, drag: 0.87 },
];
export function racingGuide(
  track,
  era = 3,
  wet = false,
  carSpec = GUIDE_SPECS[era],
) {
  const path = racingPath(track),
    points = path.points,
    n = points.length,
    spec = carSpec || GUIDE_SPECS[3];
  const cap = [75, 94, 98, 100, 99][era] || 96,
    factor = wet ? 0.7 : 1;
  const gripAt = (v) => {
    const mechanical = spec.grip * 9.81 * factor,
      aero = ((spec.aero * v * v) / spec.mass) * factor;
    return (mechanical + aero) / (1 + aero / mechanical) ** 0.075;
  };
  const brakeAt = (v) =>
    0.86 *
    Math.min(
      spec.brake + ((spec.aero * v * v) / spec.mass) * factor * 0.85,
      gripAt(v) * 0.96,
    );
  const accelAt = (v) =>
    Math.max(
      0.1,
      Math.min(gripAt(v) * 0.9, spec.power / (spec.mass * (v + 20))) -
        (spec.drag * v * v) / spec.mass -
        0.3,
    );
  const curvature = pathCurvature(points, 2),
    distances = points.map((p, i) =>
      Math.hypot(p[0] - points[(i + 1) % n][0], p[1] - points[(i + 1) % n][1]),
    );
  const targets = curvature.map((k) => {
    let lo = 9,
      hi = cap;
    for (let iter = 0; iter < 22; iter++) {
      const v = (lo + hi) / 2;
      if (v * v * k <= gripAt(v) * 0.92) lo = v;
      else hi = v;
    }
    return lo;
  });
  // Acceleration-limited exits and speed/load-aware braking approaches. Iterate
  // around the CLOSED lap so the arbitrary start station cannot create a jump.
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      targets[j] = Math.min(
        targets[j],
        Math.sqrt(targets[i] ** 2 + 2 * accelAt(targets[i]) * distances[i]),
      );
    }
    for (let i = n - 1; i >= 0; i--) {
      const j = (i + 1) % n;
      targets[i] = Math.min(
        targets[i],
        Math.sqrt(targets[j] ** 2 + 2 * brakeAt(targets[j]) * distances[i]),
      );
    }
  }
  return { targets, distances, decel: brakeAt(cap), brakeAt, accelAt, path };
}
export const GUIDE_GREEN = [0.16, 0.95, 0.34],
  GUIDE_AMBER = [1, 0.64, 0.04],
  GUIDE_RED = [1, 0.1, 0.12];
export function guideColour(
  speed,
  target,
  nextTarget,
  { distance = 0, ds = 5, decel = 12, accel = 5 } = {},
) {
  // Do not compare today's straight-line speed against EVERY future apex.
  // Distant points describe the planned manoeuvre at that location; only the
  // immediate patch can warn about present overspeed.
  if (speed < 6) return GUIDE_GREEN;
  if (distance < 18 && speed > target + Math.max(3, target * 0.1))
    return GUIDE_RED;
  const plannedDecel =
    (target * target - nextTarget * nextTarget) / (2 * Math.max(0.1, ds));
  const forecast = Math.min(
    target,
    Math.sqrt(speed * speed + 2 * Math.max(0, accel) * distance),
  );
  const neededDecel =
    (forecast * forecast - nextTarget * nextTarget) / (2 * Math.max(0.1, ds));
  if (plannedDecel > decel * 0.2 && neededDecel > decel * 0.16)
    return GUIDE_RED;
  if (
    (plannedDecel > decel * 0.04 && neededDecel > decel * 0.03) ||
    (distance < 18 && speed > target + 1.5)
  )
    return GUIDE_AMBER;
  return GUIDE_GREEN;
}

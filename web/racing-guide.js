// Conservative on-road guidance, not a lap-optimal line or real-car telemetry.
// Local curvature caps plus a backward braking envelope anticipate corners.
export function racingGuide(track, era = 3, wet = false) {
  const n = track.points.length,
    distances = [],
    targets = [],
    cap = [66, 85, 92, 96, 94][era] || 80;
  const grip = ([9, 12, 16, 19, 18][era] || 14) * (wet ? 0.68 : 1);
  const decel = ([7, 9, 11, 12, 12][era] || 10) * (wet ? 0.65 : 1);
  const span = Math.max(2, Math.round(15 / (track.length / n)));
  for (let i = 0; i < n; i++) {
    const a = track.points[(i - span + n) % n],
      b = track.points[i],
      c = track.points[(i + span) % n];
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1]),
      bc = Math.hypot(c[0] - b[0], c[1] - b[1]),
      ac = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const curvature =
      (2 *
        Math.abs(
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
        )) /
      Math.max(ab * bc * ac, 0.001);
    targets.push(
      Math.max(
        9,
        Math.min(cap, Math.sqrt(grip / Math.max(curvature, 0.00001))),
      ),
    );
    const j = (i + 1) % n;
    distances.push(
      Math.hypot(track.points[j][0] - b[0], track.points[j][1] - b[1]),
    );
  }
  // Two complete passes propagate braking across the closed-lap seam.
  for (let pass = 0; pass < 2; pass++)
    for (let i = n - 1; i >= 0; i--)
      targets[i] = Math.min(
        targets[i],
        Math.sqrt(targets[(i + 1) % n] ** 2 + 2 * decel * distances[i]),
      );
  return { targets, distances, decel };
}
export function guideColour(speed, target, nextTarget) {
  if (speed > target * 1.12 + 1 || nextTarget < target - 0.65)
    return [1, 0.1, 0.12];
  if (speed > target * 0.96 || nextTarget < target - 0.12)
    return [1, 0.64, 0.04];
  return [0.16, 0.95, 0.34];
}

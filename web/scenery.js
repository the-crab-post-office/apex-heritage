// Full closed-circuit exclusion, including the last-to-first segment.
export function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    n = dx * dx + dz * dz;
  const t = n
    ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / n))
    : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
export function inside(p, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}
function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function segmentDistance(a, b, c, d) {
  if (
    cross(a, b, c) * cross(a, b, d) < 0 &&
    cross(c, d, a) * cross(c, d, b) < 0
  )
    return 0;
  return Math.min(
    pointSegmentDistance(a, c, d),
    pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b),
    pointSegmentDistance(d, a, b),
  );
}
export class CircuitClearance {
  constructor(track, margin = 3) {
    this.points = track.points;
    this.clearance = track.width / 2 + margin;
    this.cells = new Map();
    this.size = 50;
    this.points.forEach((a, i) => {
      const b = this.points[(i + 1) % this.points.length],
        r = this.clearance;
      this.visit(
        Math.min(a[0], b[0]) - r,
        Math.min(a[1], b[1]) - r,
        Math.max(a[0], b[0]) + r,
        Math.max(a[1], b[1]) + r,
        (key) => {
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(i);
        },
      );
    });
  }
  visit(x0, z0, x1, z1, fn) {
    for (
      let x = Math.floor(x0 / this.size);
      x <= Math.floor(x1 / this.size);
      x++
    )
      for (
        let z = Math.floor(z0 / this.size);
        z <= Math.floor(z1 / this.size);
        z++
      )
        fn(`${x},${z}`);
  }
  candidates(x0, z0, x1, z1) {
    const ids = new Set();
    this.visit(x0, z0, x1, z1, (key) => {
      for (const i of this.cells.get(key) || []) ids.add(i);
    });
    return ids;
  }
  circleClear(x, z, radius = 0) {
    for (const i of this.candidates(
      x - radius,
      z - radius,
      x + radius,
      z + radius,
    ))
      if (
        pointSegmentDistance(
          [x, z],
          this.points[i],
          this.points[(i + 1) % this.points.length],
        ) <=
        this.clearance + radius
      )
        return false;
    return true;
  }
  polygonClear(poly) {
    if (poly.length < 3) return false;
    const xs = poly.map((p) => p[0]),
      zs = poly.map((p) => p[1]);
    for (const i of this.candidates(
      Math.min(...xs),
      Math.min(...zs),
      Math.max(...xs),
      Math.max(...zs),
    )) {
      const a = this.points[i],
        b = this.points[(i + 1) % this.points.length];
      if (inside(a, poly) || inside(b, poly)) return false;
      for (let j = 0; j < poly.length; j++)
        if (
          segmentDistance(a, b, poly[j], poly[(j + 1) % poly.length]) <=
          this.clearance
        )
          return false;
    }
    return true;
  }
}

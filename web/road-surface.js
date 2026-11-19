// Actual geometric exclusion: lowering terrain vertices does NOT prevent the
// interior of a large triangle from cutting through a curved/sloping road.
export function bankOffset(width, offset) {
  const t = Math.max(0, Math.min(1, (Math.abs(offset) - width / 2 - 1.5) / 12));
  return offset * (1 - t * t * (3 - 2 * t));
}
// Same station/segment projection and earth transition as Rust driving_surface.
export function bankedGround(track, terrainHeight) {
  if (!track.banking?.some((b) => Math.abs(b) > 0.1)) return [];
  const n = track.points.length,
    out = [];
  const at = (i, offset) => {
    const p = roadPoint(track, i, offset, 0);
    let best = Infinity,
      h = 0;
    for (const k of [(i + n - 1) % n, i]) {
      const j = (k + 1) % n,
        a = track.points[k],
        b = track.points[j],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        d2 = dx * dx + dz * dz;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p[0] - a[0]) * dx + (p[2] - a[1]) * dz) / Math.max(d2, 0.0001),
        ),
      );
      const xx = p[0] - a[0] - t * dx,
        zz = p[2] - a[1] - t * dz,
        d = xx * xx + zz * zz;
      if (d < best) {
        best = d;
        const off = (xx * dz - zz * dx) / Math.max(Math.sqrt(d2), 0.001),
          bank = track.banking[k] + (track.banking[j] - track.banking[k]) * t;
        h =
          track.heights[k] +
          (track.heights[j] - track.heights[k]) * t +
          bank * bankOffset(track.width, off);
      }
    }
    let f = Math.max(
      0,
      Math.min(1, (Math.sqrt(best) - track.width / 2 - 14) / 10),
    );
    f = f * f * (3 - 2 * f);
    p[1] = h + (terrainHeight(p[0], p[2]) - 1.25 - h) * f + 0.01;
    return p;
  };
  const bands = [0, 2, 5, 8, 12, 16, 20, 26, 32, 38];
  for (const side of [-1, 1])
    for (let b = 0; b < bands.length - 1; b++)
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n,
          a = at(i, side * (track.width / 2 + bands[b])),
          c = at(i, side * (track.width / 2 + bands[b + 1])),
          bb = at(j, side * (track.width / 2 + bands[b])),
          d = at(j, side * (track.width / 2 + bands[b + 1]));
        out.push([a, bb, c], [c, bb, d]);
      }
  return out;
}
export function roadPoint(track, i, offset = 0, height = 0.05) {
  const n = track.points.length,
    a = track.points[i],
    p =
      track.points[
        track.closed === false ? Math.max(0, i - 1) : (i + n - 1) % n
      ],
    q =
      track.points[
        track.closed === false ? Math.min(n - 1, i + 1) : (i + 1) % n
      ];
  const dx = q[0] - p[0],
    dz = q[1] - p[1],
    len = Math.hypot(dx, dz) || 1;
  return [
    a[0] + (dz / len) * offset,
    track.heights[i] +
      height +
      bankOffset(track.width, offset) * (track.banking?.[i] || 0),
    a[1] - (dx / len) * offset,
  ];
}
export function ribbon(track, from, to, height = 0.05) {
  if (from > to) [from, to] = [to, from];
  const out = [];
  for (
    let i = 0;
    i < track.points.length - (track.closed === false ? 1 : 0);
    i++
  ) {
    const j = (i + 1) % track.points.length,
      a = roadPoint(track, i, from, height),
      b = roadPoint(track, j, from, height),
      c = roadPoint(track, i, to, height),
      d = roadPoint(track, j, to, height);
    out.push([a, b, c], [c, b, d]);
  }
  return out;
}
const cross = (a, b, p) =>
  (b[0] - a[0]) * (p[2] - a[2]) - (b[2] - a[2]) * (p[0] - a[0]);
export function area(poly) {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 1; i < poly.length - 1; i++)
    sum += cross(poly[0], poly[i], poly[i + 1]);
  return Math.abs(sum) / 2;
}

function halfPlane(poly, a, b, inside) {
  const out = [];
  if (!poly.length) return out;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length],
      cp = cross(a, b, p),
      cq = cross(a, b, q),
      pin = inside ? cp >= 0 : cp <= 0,
      qin = inside ? cq >= 0 : cq <= 0;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = cp / (cp - cq);
      out.push(p.map((v, k) => v + (q[k] - v) * t));
    }
  }
  return out;
}
export function subtractTriangle(poly, clip) {
  // Cell-level indexing is intentionally coarse. Preserve disjoint polygons
  // intact instead of fragmenting them along unrelated infinite clip lines.
  for (const axis of [0, 2]) {
    const p = poly.map((v) => v[axis]),
      q = clip.map((v) => v[axis]);
    if (Math.max(...p) <= Math.min(...q) || Math.max(...q) <= Math.min(...p))
      return [poly];
  }
  if (cross(clip[0], clip[1], clip[2]) < 0) clip = [clip[2], clip[1], clip[0]];
  let remaining = poly;
  const result = [];
  for (let i = 0; i < 3 && remaining.length >= 3; i++) {
    const a = clip[i],
      b = clip[(i + 1) % 3],
      outside = halfPlane(remaining, a, b, false);
    if (outside.length >= 3 && area(outside) > 1e-7) result.push(outside);
    remaining = halfPlane(remaining, a, b, true);
  }
  return result;
}
export class RoadMask {
  constructor(track, extra = 0, triangles = null) {
    this.triangles =
      triangles ||
      ribbon(track, -track.width / 2 - extra, track.width / 2 + extra, 0);
    this.cells = new Map();
    this.cell = 40;
    this.triangles.forEach((tri, i) =>
      this.visit(tri, (key) => {
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(i);
      }),
    );
  }
  visit(poly, fn) {
    const xs = poly.map((p) => p[0]),
      zs = poly.map((p) => p[2]);
    for (
      let x = Math.floor(Math.min(...xs) / this.cell);
      x <= Math.floor(Math.max(...xs) / this.cell);
      x++
    )
      for (
        let z = Math.floor(Math.min(...zs) / this.cell);
        z <= Math.floor(Math.max(...zs) / this.cell);
        z++
      )
        fn(`${x},${z}`);
  }
  cut(triangle) {
    const ids = new Set();
    this.visit(triangle, (key) => {
      for (const i of this.cells.get(key) || []) ids.add(i);
    });
    let parts = [triangle];
    for (const id of ids) {
      const next = [];
      for (const part of parts)
        next.push(...subtractTriangle(part, this.triangles[id]));
      parts = next;
      if (!parts.length) break;
    }
    const result = [];
    for (const poly of parts)
      for (let i = 1; i < poly.length - 1; i++) {
        const tri = [poly[0], poly[i], poly[i + 1]];
        if (area(tri) > 1e-7) result.push(tri);
      }
    return result;
  }
  cutAll(triangles) {
    const result = [];
    for (const t of triangles) result.push(...this.cut(t));
    return result;
  }
}

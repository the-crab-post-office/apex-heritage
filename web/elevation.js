// The road and Rust dynamics read the same per-point height arrays.
export function profileAt(track, u, ground = false) {
  const n = track.points.length;
  u = ((u % 1) + 1) % 1;
  const f = u * n,
    i = Math.floor(f),
    j = (i + 1) % n,
    t = f - i;
  const hs = ground ? track.ground_heights : track.heights;
  return hs[i] * (1 - t) + hs[j] * t;
}
export function terrainGridHeight(track, x, z) {
  const g = track.terrain;
  if (!g) return null;
  const u = Math.max(0, Math.min(g.nx - 1.000001, (x - g.x0) / g.dx)),
    v = Math.max(0, Math.min(g.nz - 1.000001, (z - g.z0) / g.dz)),
    i = Math.floor(u),
    j = Math.floor(v),
    tx = u - i,
    tz = v - j,
    a = g.heights[j * g.nx + i],
    b = g.heights[j * g.nx + i + 1],
    c = g.heights[(j + 1) * g.nx + i],
    d = g.heights[(j + 1) * g.nx + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}
export class ElevationField {
  constructor(track) {
    this.track = track;
    this.cell = 90;
    this.grid = new Map();
    this.segments = [];
    const p = track.points,
      n = p.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n,
        a = p[i],
        b = p[j];
      const segment = {
        a,
        b,
        h0: track.ground_heights[i],
        h1: track.ground_heights[j],
      };
      this.segments.push(segment);
      const x = Math.floor((a[0] + b[0]) / 2 / this.cell),
        z = Math.floor((a[1] + b[1]) / 2 / this.cell),
        key = `${x},${z}`;
      if (!this.grid.has(key)) this.grid.set(key, []);
      this.grid.get(key).push(segment);
    }
  }
  height(x, z) {
    const gx = Math.floor(x / this.cell),
      gz = Math.floor(z / this.cell);
    let candidates = [];
    for (let radius = 1; radius <= 4; radius *= 2) {
      for (let i = -radius; i <= radius; i++)
        for (let j = -radius; j <= radius; j++) {
          const list = this.grid.get(`${gx + i},${gz + j}`);
          if (list) candidates.push(...list);
        }
      if (candidates.length) break;
    }
    if (!candidates.length) candidates = this.segments;
    let best = Infinity,
      height = 0;
    for (const { a, b, h0, h1 } of candidates) {
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
          ),
        );
      const d = (x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2;
      if (d < best) {
        best = d;
        height = h0 * (1 - t) + h1 * t;
      }
    }
    const natural = terrainGridHeight(this.track, x, z);
    if (natural === null) return height;
    // Preserve a broad road bed (also below the bridge / through the tunnel),
    // then blend into actual geographic terrain rather than extruding track hills.
    let blend = Math.max(
      0,
      Math.min(1, (Math.sqrt(best) - (this.track.width / 2 + 30)) / 110),
    );
    blend = blend * blend * (3 - 2 * blend);
    return height + (natural - height) * blend;
  }
}
export function elevationSVG(track) {
  const h = track.heights,
    min = Math.min(...h),
    max = Math.max(...h),
    range = Math.max(1, max - min);
  const points = h
    .filter((_, i) => i % 4 === 0)
    .map(
      (v, i) =>
        `${(((i * 4) / (h.length - 1)) * 500).toFixed(1)},${(66 - ((v - min) / range) * 53).toFixed(1)}`,
    );
  points.push(`500,${(66 - ((h[0] - min) / range) * 53).toFixed(1)}`);
  return `<div class="profile-heading"><span>ELEVATION PROFILE</span><b>${range.toFixed(0)} m <small>range · terrain-derived estimate</small></b></div><svg viewBox="0 0 500 87" role="img" aria-label="${track.name} approximate elevation profile, ${range.toFixed(0)} metres range"><defs><linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fa623c" stop-opacity=".25"/><stop offset="100%" stop-color="#fa623c" stop-opacity="0"/></linearGradient></defs><path d="M0,68L${points.join("L")}L500,68Z" fill="url(#profile-fill)"/><path d="M${points.join("L")}" fill="none" stroke="#fa946f" stroke-width="1.8"/><path d="M0,68H500" stroke="#748661" stroke-opacity=".35"/><text x="0" y="83">START</text><text x="250" y="83" text-anchor="middle">HALF LAP</text><text x="500" y="83" text-anchor="end">FINISH</text></svg>`;
}

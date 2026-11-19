// Deterministic multiresolution minimum-bending racing path. It uses the legal
// pavement corridor, not kerbs/runoff. This is a numerical minimum-curvature
// approximation, not a telemetry-derived or globally fastest lap solution.
const cache = new WeakMap();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function pathCurvature(points, span = 1) {
  const n = points.length;
  return points.map((b, i) => {
    const a = points[(i - span + n) % n],
      c = points[(i + span) % n];
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1]),
      bc = Math.hypot(c[0] - b[0], c[1] - b[1]),
      ac = Math.hypot(c[0] - a[0], c[1] - a[1]);
    return (
      (2 *
        Math.abs(
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
        )) /
      Math.max(ab * bc * ac, 0.001)
    );
  });
}
export function racingPath(track) {
  if (cache.has(track)) return cache.get(track);
  const n = track.points.length;
  // Reserve 1.1m for half a wide car, 0.2m of guide and 0.4m edge clearance.
  const limit = Math.max(0, track.width / 2 - 1.7);
  const normals = track.points.map((p, i) => {
    const a = track.points[(i + n - 1) % n],
      b = track.points[(i + 1) % n],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz) || 1;
    return [dz / len, -dx / len];
  });
  let offsets = Array(n).fill(0);
  for (const stride of [8, 4, 2, 1]) {
    const m = Math.min(n, Math.max(8, Math.ceil(n / stride))),
      ids = Array.from({ length: m }, (_, i) => Math.floor((i * n) / m));
    const base = ids.map((i) => track.points[i]),
      right = ids.map((i) => normals[i]);
    const off = ids.map((i) => offsets[i]),
      q = base.map((p, i) => p.map((v, k) => v + right[i][k] * off[i]));
    const ds = base.map((p, i) =>
      Math.max(
        0.5,
        Math.hypot(p[0] - base[(i + 1) % m][0], p[1] - base[(i + 1) % m][1]),
      ),
    );
    const coefficients = base.map((_, i) => {
      const a = 1 / ds[(i + m - 1) % m],
        c = 1 / ds[i];
      return [a, -a - c, c];
    });
    const weight = ds.map((d, i) => 2 / (d + ds[(i + m - 1) % m]));
    const lengthWeight = 0.00001;
    for (let iteration = 0; iteration < 220; iteration++) {
      let maxChange = 0;
      for (let step = 0; step < m; step++) {
        // Alternate sweep direction to avoid a left/right or start-line bias.
        const i = iteration % 2 ? m - step - 1 : step,
          prev = (i + m - 1) % m,
          next = (i + 1) % m;
        let gradient = 0,
          diagonal = 0;
        for (const row of [prev, i, next]) {
          const indices = [(row + m - 1) % m, row, (row + 1) % m],
            coef = coefficients[row],
            ci = coef[indices.indexOf(i)];
          let x = 0,
            z = 0;
          for (let k = 0; k < 3; k++) {
            x += coef[k] * q[indices[k]][0];
            z += coef[k] * q[indices[k]][1];
          }
          gradient += weight[row] * ci * (x * right[i][0] + z * right[i][1]);
          diagonal += weight[row] * ci * ci;
        }
        const a = 1 / ds[prev],
          b = 1 / ds[i];
        gradient +=
          lengthWeight *
          ((q[i][0] - q[prev][0]) * a * right[i][0] +
            (q[i][1] - q[prev][1]) * a * right[i][1] +
            (q[i][0] - q[next][0]) * b * right[i][0] +
            (q[i][1] - q[next][1]) * b * right[i][1]);
        diagonal += lengthWeight * (a + b);
        // Offset slew limit prevents a sudden lane jump even in tight chicanes.
        const lo = Math.max(
          -limit,
          off[prev] - 0.18 * ds[prev],
          off[next] - 0.18 * ds[i],
        );
        const hi = Math.min(
          limit,
          off[prev] + 0.18 * ds[prev],
          off[next] + 0.18 * ds[i],
        );
        const value = clamp(
            off[i] - (0.85 * gradient) / Math.max(diagonal, 1e-12),
            lo,
            hi,
          ),
          change = value - off[i];
        off[i] = value;
        q[i][0] += right[i][0] * change;
        q[i][1] += right[i][1] * change;
        maxChange = Math.max(maxChange, Math.abs(change));
      }
      if (maxChange < 0.0002) break;
    }
    for (let k = 0; k < m; k++) {
      const a = ids[k],
        b = k === m - 1 ? n : ids[k + 1];
      for (let j = a; j < b; j++) {
        const f = (j - a) / (b - a);
        offsets[j] = off[k] + (off[(k + 1) % m] - off[k]) * f;
      }
    }
  }
  const points = track.points.map((p, i) =>
    p.map((v, k) => v + normals[i][k] * offsets[i]),
  );
  const result = {
    offsets,
    points,
    normals,
    limit,
    curvature: pathCurvature(points),
  };
  cache.set(track, result);
  return result;
}

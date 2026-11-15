// Ground furniture against the actual rendered triangles, not a road sample's height.
export class GroundSupport {
  constructor(meshes) {
    this.cells = new Map();
    this.triangles = [];
    for (const mesh of new Set(meshes.filter(Boolean))) {
      mesh.updateMatrixWorld(true);
      const p = mesh.geometry.attributes.position,
        idx = mesh.geometry.index,
        m = mesh.matrixWorld.elements;
      const point = (i) => {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        return [
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14],
        ];
      };
      for (let k = 0; k < (idx ? idx.count : p.count); k += 3) {
        const t = [0, 1, 2].map((j) => point(idx ? idx.getX(k + j) : k + j));
        if (
          Math.abs(
            (t[1][0] - t[0][0]) * (t[2][2] - t[0][2]) -
              (t[2][0] - t[0][0]) * (t[1][2] - t[0][2]),
          ) < 1e-7
        )
          continue;
        const id = this.triangles.length;
        this.triangles.push(t);
        for (
          let x = Math.floor(Math.min(...t.map((v) => v[0])) / 32);
          x <= Math.floor(Math.max(...t.map((v) => v[0])) / 32);
          x++
        )
          for (
            let z = Math.floor(Math.min(...t.map((v) => v[2])) / 32);
            z <= Math.floor(Math.max(...t.map((v) => v[2])) / 32);
            z++
          ) {
            const key = `${x},${z}`;
            if (!this.cells.has(key)) this.cells.set(key, []);
            this.cells.get(key).push(id);
          }
      }
    }
  }
  height(x, z) {
    let height = null;
    for (const id of this.cells.get(
      `${Math.floor(x / 32)},${Math.floor(z / 32)}`,
    ) || []) {
      const [a, b, c] = this.triangles[id],
        den = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / den,
        v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / den;
      if (u >= -1e-5 && v >= -1e-5 && u + v <= 1.00001) {
        const y = a[1] * u + b[1] * v + c[1] * (1 - u - v);
        height = height === null ? y : Math.max(height, y);
      }
    }
    return height;
  }
}
// Short spans also follow bends/creases in the ground between mapped endpoints.
export function groundSpans(barrier, ground) {
  const [a, b] = [barrier.a, barrier.b],
    length = Math.hypot(b[0] - a[0], b[1] - a[1]),
    spans = [];
  const at = (f) => {
    const x = a[0] + (b[0] - a[0]) * f,
      z = a[1] + (b[1] - a[1]) * f;
    return [x, ground(x, z), z];
  };
  const split = (p, q, depth) => {
    const mid = at((p.f + q.f) / 2),
      error = Math.abs(mid[1] - (p.v[1] + q.v[1]) / 2);
    if (depth < 5 && error > 0.04) {
      const m = { v: mid, f: (p.f + q.f) / 2 };
      split(p, m, depth + 1);
      split(m, q, depth + 1);
    } else spans.push([p.v, q.v]);
  };
  const count = Math.max(1, Math.ceil(length / 1.5));
  for (let j = 0; j < count; j++)
    split(
      { v: at(j / count), f: j / count },
      { v: at((j + 1) / count), f: (j + 1) / count },
      0,
    );
  return spans;
}

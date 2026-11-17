import { RoadMask, area } from "./road-surface.js";
import * as THREE from "three";
export function triangleHeight(p, x, z) {
  const [a, b, c] = p,
    den = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(den) < 1e-6) return null;
  const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / den,
    v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / den;
  return u >= -0.00001 && v >= -0.00001 && u + v <= 1.00001
    ? a[1] * u + b[1] * v + c[1] * (1 - u - v)
    : null;
}
// Rendered terrain/shoulder grass must not occlude the shared physical apron
// triangles on sloping ground. Ignore vertical kerb sides/grass-only regions.
export function cornerFootprintMask(facets = []) {
  return new RoadMask(
    null,
    0,
    facets.filter((f) => f.kind < 3 && area(f.p) > 1e-6).map((f) => f.p),
  );
}
export class CornerIndex {
  constructor(facets) {
    this.facets = facets;
    this.cells = new Map();
    for (const f of facets) {
      const xs = f.p.map((p) => p[0]),
        zs = f.p.map((p) => p[2]);
      for (
        let x = Math.floor(Math.min(...xs) / 24);
        x <= Math.floor(Math.max(...xs) / 24);
        x++
      )
        for (
          let z = Math.floor(Math.min(...zs) / 24);
          z <= Math.floor(Math.max(...zs) / 24);
          z++
        ) {
          const key = `${x},${z}`;
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(f);
        }
    }
  }
  at(x, z) {
    let result = null;
    for (const f of this.cells.get(
      `${Math.floor(x / 24)},${Math.floor(z / 24)}`,
    ) || []) {
      let y = triangleHeight(f.p, x, z);
      if (y !== null && (!result || y > result.y)) result = { y, kind: f.kind };
    }
    return result;
  }
}
export function buildCornerSurfaces(world) {
  const d = world.config.details;
  if (!d) return;
  const groups = new Map();
  world.cornerMeshes = [];
  for (const f of d.facets) {
    const key = `${f.kind}:${f.color}`;
    if (!groups.has(key))
      groups.set(key, { kind: f.kind, color: f.color, triangles: [] });
    const p = f.p.map((p) => p.slice());
    const up =
      (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) -
      (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]);
    if (up < 0) [p[1], p[2]] = [p[2], p[1]];
    groups.get(key).triangles.push(p);
  }
  for (const { kind, color, triangles } of groups.values()) {
    let material;
    if (kind === 0 || (kind === 2 && color !== 0x666e70))
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        side: THREE.DoubleSide,
      });
    else
      material = world.surfaces.pbr(
        kind === 1 ? "Gravel001" : kind === 2 ? "Asphalt012" : "Grass004",
        kind === 1
          ? "#dfcfb1"
          : kind === 2
            ? color === 0x666e70
              ? world.track.name === "Spa-Francorchamps" &&
                world.config.era >= 3
                ? "#b0b6b4"
                : "#8b9193"
              : color
            : "#e0e5c9",
        0.28,
      );
    material.side = THREE.DoubleSide;
    const mesh = world.surfaceMesh(triangles, material, kind === 1 ? 3 : 4);
    mesh.userData.cornerKind = kind;
    world.cornerMeshes.push(mesh);
    world.surfaceOverlays.push(mesh);
  }
  world.cornerAudit = {
    facets: d.facets.length,
    kerbs: d.kerbs,
    label: d.label,
    geometryStatus: d.geometry_status,
  };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(18 * 3), 3),
  );
  world.floorSparks = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: "#ffbc58",
      transparent: true,
      opacity: 0.85,
    }),
  );
  world.floorSparks.frustumCulled = false;
  world.floorSparks.visible = false;
  world.scene.add(world.floorSparks);
}
export function updateFloorSparks(world, s, time) {
  if (!world.floorSparks) return;
  world.floorSparks.visible = s.bottoming > 0.05 && s.speed > 4;
  if (!world.floorSparks.visible) return;
  const a = world.floorSparks.geometry.attributes.position;
  let index = 0;
  for (let i = 0; i < 9; i++) {
    let offset = Math.sin(i * 17.3 + time * 19) * 0.45,
      along = -0.9 + Math.cos(i * 3.7 + time * 12) * 0.35,
      x = s.x + Math.cos(s.yaw) * offset + Math.sin(s.yaw) * along,
      z = s.z - Math.sin(s.yaw) * offset + Math.cos(s.yaw) * along,
      y = s.y - 0.05 + (s.ride_height || 0.04),
      len = (0.25 + (i % 4) * 0.15) * s.bottoming;
    a.setXYZ(index++, x, y, z);
    a.setXYZ(
      index++,
      x - Math.sin(s.travel_yaw) * len,
      y + 0.06 + (i % 3) * 0.04,
      z - Math.cos(s.travel_yaw) * len,
    );
  }
  a.needsUpdate = true;
  world.floorSparks.material.opacity = Math.min(0.9, s.bottoming + 0.25);
}

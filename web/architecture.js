import * as THREE from "three";
import { inside } from "./scenery.js";
// Original modular detail on mapped footprints; no photographic textures copied.
export function addArchitecture(world, buildings) {
  if (world.track.code !== "MC") return;
  const buckets = new Map(),
    box = new THREE.BoxGeometry(1, 1, 1),
    roofGeometry = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4),
    dummy = new THREE.Object3D();
  const materials = {
    stone: new THREE.MeshStandardMaterial({
      color: "#eadbc2",
      roughness: 0.83,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: "#698277",
      roughness: 0.62,
      metalness: 0.28,
    }),
    iron: new THREE.MeshStandardMaterial({
      color: "#344244",
      roughness: 0.48,
      metalness: 0.55,
    }),
    terrace: new THREE.MeshStandardMaterial({
      color: "#d8d3c6",
      roughness: 0.86,
    }),
  };
  let balconies = 0,
    cornices = 0,
    towers = 0;
  function put(kind, x, y, z, sx, sy, sz, yaw = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, yaw + (kind === "roof" ? Math.PI / 4 : 0), 0);
    dummy.updateMatrix();
    const key = `${kind}:${Math.floor(x / 160)},${Math.floor(z / 160)}`;
    if (!buckets.has(key)) buckets.set(key, { kind, matrices: [] });
    buckets.get(key).matrices.push(dummy.matrix.clone());
  }
  const named = new Map();
  for (const b of buildings) {
    if (b.name)
      named.set(b.name, {
        name: b.name,
        osmId: b.osm_id,
        height: b.height,
        footprint: b.footprint,
      });
    const p = b.footprint,
      base = b.detailBase,
      style = b.style || "riviera";
    let nearest = Infinity;
    for (const [x, z] of p) {
      for (let i = 0; i < world.track.points.length; i += 5) {
        const q = world.track.points[i];
        nearest = Math.min(nearest, Math.hypot(q[0] - x, q[1] - z));
      }
    }
    if (nearest > 115 || b.height < 6) continue;
    const floors = Math.max(
        2,
        Math.min(
          26,
          Math.round(b.height / (style === "belle-epoque" ? 3.7 : 3.2)),
        ),
      ),
      floorHeight = b.height / floors;
    let area = 0;
    for (let i = 0; i < p.length; i++)
      area +=
        p[i][0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * p[i][1];
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        q = p[(i + 1) % p.length],
        dx = q[0] - a[0],
        dz = q[1] - a[1],
        len = Math.hypot(dx, dz),
        yaw = Math.atan2(dx, dz);
      if (len < 3.5) continue;
      const nx = (dz / len) * (area > 0 ? 1 : -1),
        nz = (-dx / len) * (area > 0 ? 1 : -1),
        cx = (a[0] + q[0]) / 2,
        cz = (a[1] + q[1]) / 2;
      put("stone", cx, base + b.height - 0.12, cz, 0.44, 0.32, len + 0.1, yaw);
      cornices++;
      if (style === "chapel") continue;
      const balcony = ["fairmont", "tower", "belle-epoque"].includes(style),
        cols = Math.max(1, Math.floor(len / 3.8));
      for (let row = 1; row < floors; row++) {
        const y = base + row * floorHeight;
        put(
          style === "fairmont" ? "terrace" : "stone",
          cx + nx * 0.14,
          y,
          cz + nz * 0.14,
          balcony ? 0.55 : 0.25,
          0.16,
          len,
          yaw,
        );
        cornices++;
        if (!balcony || (world.config.quality === "low" && row % 2)) continue;
        for (let col = 0; col < Math.min(32, cols); col++) {
          const f = (col + 0.5) / cols,
            x = a[0] + dx * f,
            z = a[1] + dz * f;
          put(
            "iron",
            x + nx * 0.32,
            y + 0.65,
            z + nz * 0.32,
            0.055,
            0.065,
            (len / cols) * 0.78,
            yaw,
          );
          for (const along of [-0.32, 0, 0.32])
            put(
              "iron",
              x + nx * 0.32 + (dx / cols) * along,
              y + 0.35,
              z + nz * 0.32 + (dz / cols) * along,
              0.045,
              0.65,
              0.045,
              yaw,
            );
          balconies++;
        }
      }
    }
    if (style === "belle-epoque" && b.name?.includes("Casino")) {
      const cx = p.reduce((n, v) => n + v[0], 0) / p.length,
        cz = p.reduce((n, v) => n + v[1], 0) / p.length;
      for (const [x, z] of p.filter(
        (_, i) => i % Math.max(1, Math.floor(p.length / 6)) === 0,
      )) {
        const tx = x + (cx - x) * 0.3,
          tz = z + (cz - z) * 0.3;
        if (
          towers >= 2 ||
          !inside([tx, tz], p) ||
          !world.clearance.circleClear(tx, tz, 4)
        )
          continue;
        put("stone", tx, base + b.height + 2, tz, 5.5, 4, 5.5);
        put("roof", tx, base + b.height + 5.6, tz, 6.1, 3.4, 6.1);
        put("stone", tx, base + b.height + 7.9, tz, 1.2, 1.1, 1.2);
        towers++;
      }
    }
  }
  for (const [key, { kind, matrices }] of buckets) {
    const mesh = new THREE.InstancedMesh(
      kind === "roof" ? roofGeometry : box,
      materials[kind],
      matrices.length,
    );
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = world.config.quality === "high";
    mesh.receiveShadow = true;
    mesh.userData.architectureBatch = key;
    world.scene.add(mesh);
  }
  world.architectureAudit = {
    scope:
      "Modern Monaco for every era; mapped footprints, photo-estimated massing and original modular facade detail",
    named: [...named.values()],
    balconies,
    cornices,
    towers,
    batches: buckets.size,
  };
}

import * as THREE from "three";
// Conservative geometry on the retained mapped footprint: low, convex houses
// receive hipped tile roofs; circuit facilities keep flat parapets. No extension
// into a road or courtyard and no claim that every unseen roof is surveyed.
export function addBuildingRoofs(world, buildings, material) {
  const positions = [],
    uvs = [],
    matrices = [],
    dummy = new THREE.Object3D();
  let pitched = 0;
  for (const b of buildings) {
    const p = b.footprint,
      top = b.detailBase + b.height;
    if (b.appearance?.roof === 2) {
      for (const tri of b.appearance.roof_facets)
        for (const q of tri) {
          positions.push(q[0], top + q[1], q[2]);
          uvs.push(q[0] / 5, q[2] / 5);
        }
      pitched++;
    } else if (b.appearance?.roof === 1) {
      const cx = p.reduce((s, p) => s + p[0], 0) / p.length,
        cz = p.reduce((s, p) => s + p[1], 0) / p.length;
      const peak = [cx, top + b.appearance.roof_rise, cz];
      for (let i = 0; i < p.length; i++) {
        const a = p[i],
          c = p[(i + 1) % p.length];
        for (const q of [
          [a[0], top + 0.02, a[1]],
          [c[0], top + 0.02, c[1]],
          peak,
        ]) {
          positions.push(...q);
          uvs.push(q[0] / 5, q[2] / 5);
        }
      }
      pitched++;
    } else if (world.track.code !== "MC") {
      for (let i = 0; i < p.length; i++) {
        const a = p[i],
          b = p[(i + 1) % p.length],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          len = Math.hypot(dx, dz);
        dummy.position.set((a[0] + b[0]) / 2, top + 0.08, (a[1] + b[1]) / 2);
        dummy.rotation.set(0, -Math.atan2(dz, dx), 0);
        dummy.scale.set(len, 0.16, 0.3);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
    }
  }
  for (const b of buildings.filter(
    (b) => b.appearance?.detail === "imola-tower",
  )) {
    const top = b.detailBase + b.height,
      red = new THREE.MeshStandardMaterial({
        color: "#b92e2c",
        roughness: 0.8,
      });
    for (let i = 0; i < b.footprint.length; i++) {
      const a = b.footprint[i],
        bb = b.footprint[(i + 1) % b.footprint.length],
        len = Math.hypot(bb[0] - a[0], bb[1] - a[1]);
      const count = Math.max(1, Math.round(len / 3.2));
      for (let j = 0; j < count; j++) {
        const f = j / count,
          post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3, 0.32), red);
        post.position.set(
          a[0] + (bb[0] - a[0]) * f,
          top + 1.5,
          a[1] + (bb[1] - a[1]) * f,
        );
        world.buildingGroup.add(post);
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(len / count / 2 - 0.12, 0.12, 4, 12, Math.PI),
          red,
        );
        arch.rotation.y = -Math.atan2(bb[1] - a[1], bb[0] - a[0]);
        const g = (j + 0.5) / count;
        arch.position.set(
          a[0] + (bb[0] - a[0]) * g,
          top + 1.3,
          a[1] + (bb[1] - a[1]) * g,
        );
        world.buildingGroup.add(arch);
      }
    }
  }
  if (positions.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    const m = material.clone();
    m.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(g, m);
    mesh.name = "photo-guided-hipped-roofs";
    mesh.castShadow = mesh.receiveShadow = true;
    world.scene.add(mesh);
    world.buildingGroup.add(mesh);
  }
  if (matrices.length) {
    const m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      material,
      matrices.length,
    );
    matrices.forEach((v, i) => m.setMatrixAt(i, v));
    m.name = "photo-guided-flat-roof-parapets";
    m.castShadow = m.receiveShadow = true;
    world.buildingGroup.add(m);
  }
  world.buildingAppearanceAudit = {
    assigned: buildings.length,
    pitchedRoofs: pitched,
    parapetEdges: matrices.length,
    scope:
      "Venue/photo-guided styles and estimated unmapped morphology; mapped footprints/heights retained where known. Not individually verified photo replicas.",
  };
}

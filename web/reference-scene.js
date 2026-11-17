import * as THREE from "three";
import data from "../data/reference-scenes.json";
// These explicit overhead facets bypass no ordinary building exclusion. The
// complete hotel floor stays above the existing tunnel's 4.65 m clear ceiling.
export function addReferenceScene(world) {
  const source = data.scenes.find(
    (s) => s.track === world.track.name && s.eras.includes(world.config.era),
  );
  if (!source) return;
  const positions = [],
    colors = [];
  for (const facet of source.facets) {
    const color = new THREE.Color(facet.color);
    for (const p of facet.p) {
      positions.push(...p);
      colors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  mesh.name = "reference-scene";
  mesh.castShadow = mesh.receiveShadow = true;
  world.scene.add(mesh);
  world.referenceScene = mesh;
  world.auditReferenceScene = () => {
    if (world.track.name !== "Monaco")
      return { facets: source.facets.length, eras: source.eras };
    world.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(),
      up = new THREE.Vector3(0, 1, 0);
    let covered = 0,
      blocked = 0,
      minClearance = Infinity;
    for (let i = 303; i < 340; i++) {
      const p = world.track.points[i],
        h = world.track.heights[i];
      ray.set(new THREE.Vector3(p[0], h + 0.5, p[1]), up);
      ray.far = 4.1;
      if (ray.intersectObject(mesh, false).length) blocked++;
      ray.far = 100;
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) {
        covered++;
        minClearance = Math.min(minClearance, hit.point.y - h);
      }
    }
    return { covered, blocked, minClearance };
  };

  world.referenceAudit = {
    facets: source.facets.length,
    scope: source.scope,
    clearance: source.clearance,
    eras: source.eras,
  };
}

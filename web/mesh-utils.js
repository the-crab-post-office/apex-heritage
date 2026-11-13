import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";
export function mergeBody(group) {
  const batches = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh || o.isInstancedMesh) continue;
    o.updateMatrix();
    const g = o.geometry.clone().applyMatrix4(o.matrix);
    if (!batches.has(o.material)) batches.set(o.material, []);
    batches.get(o.material).push(g);
    group.remove(o);
  }
  for (const [m, geometries] of batches) {
    const g = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (g) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
export const boxGeo = new THREE.BoxGeometry(1, 1, 1),
  cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20),
  sphereGeo = new THREE.SphereGeometry(1, 16, 12);
export const material = (color, roughness = 0.6, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";
// Split multi-material groups before merging. Merging a material array with
// useGroups=false silently loses all draw ranges (entire buildings disappear).
export function mergeBody(group) {
  const batches = new Map();
  const add = (material, geometry) => {
    if (!material) {
      geometry.dispose();
      return;
    }
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
  };
  for (const o of [...group.children]) {
    if (!o.isMesh || o.isInstancedMesh) continue;
    o.updateMatrix();
    const source = o.geometry.index
      ? o.geometry.toNonIndexed()
      : o.geometry.clone();
    source.applyMatrix4(o.matrix);
    if (Array.isArray(o.material)) {
      for (const range of source.groups) {
        const geometry = new THREE.BufferGeometry();
        for (const [name, attr] of Object.entries(source.attributes)) {
          geometry.setAttribute(
            name,
            new THREE.BufferAttribute(
              attr.array.slice(
                range.start * attr.itemSize,
                (range.start + range.count) * attr.itemSize,
              ),
              attr.itemSize,
              attr.normalized,
            ),
          );
        }
        add(o.material[range.materialIndex], geometry);
      }
      source.dispose();
    } else add(o.material, source);
    group.remove(o);
  }
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
export const boxGeo = new THREE.BoxGeometry(1, 1, 1),
  cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20),
  sphereGeo = new THREE.SphereGeometry(1, 16, 12);
export const material = (color, roughness = 0.6, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

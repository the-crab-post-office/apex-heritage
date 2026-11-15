import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeBody } from "../web/mesh-utils.js";
test("multi-material building batches retain every roof and facade triangle", () => {
  const a = new THREE.MeshStandardMaterial({ color: "red" }),
    b = new THREE.MeshStandardMaterial({ color: "blue" }),
    group = new THREE.Group();
  for (const x of [0, 10]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), [
      a,
      b,
      a,
      b,
      a,
      b,
    ]);
    mesh.position.x = x;
    group.add(mesh);
  }
  mergeBody(group);
  assert.equal(group.children.length, 2);
  assert.equal(
    group.children.reduce(
      (n, m) => n + m.geometry.attributes.position.count,
      0,
    ),
    72,
  );
  for (const m of group.children) {
    assert.ok(!Array.isArray(m.material));
    assert.equal(m.geometry.attributes.position.count, 36);
    assert.equal(m.geometry.attributes.normal.count, 36);
    assert.equal(m.geometry.attributes.uv.count, 36);
  }
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 10),
    new THREE.Vector3(0, 0, -1),
  );
  group.updateMatrixWorld(true);
  assert.ok(ray.intersectObjects(group.children).length > 0);
});
test("mixed indexed/nonindexed meshes sharing a material merge without dropping either", () => {
  const group = new THREE.Group(),
    material = new THREE.MeshStandardMaterial();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  const sphere = new THREE.SphereGeometry(1, 8, 6).toNonIndexed();
  const count = 36 + sphere.attributes.position.count;
  group.add(new THREE.Mesh(sphere, material));
  mergeBody(group);
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0].geometry.attributes.position.count, count);
});

import * as THREE from "three";
import shapes from "../data/car-shapes.json";
import { liveryMaterials } from "./livery.js";
export function referenceCar(era, team) {
  const car = new THREE.Group(),
    classic = era === 0,
    l = liveryMaterials(team);
  const mat = (color, roughness = 0.5, metalness = 0.1) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      side: THREE.DoubleSide,
    });
  const materials = {
    body: l.body,
    pods: l.pods,
    wing: l.wing,
    front_wing: l.end,
    tyre: l.tyre,
    carbon: mat("#14191f", 0.48, 0.25),
    rubber: mat("#111317", 0.85, 0),
    rim: l.rim,
    engine: mat("#56595a", 0.45, 0.7),
    exhaust: mat("#a7947c", 0.4, 0.75),
    helmet: mat("#ece9da", 0.3, 0.1),
    accent: mat(classic ? team.secondary : team.accent, 0.4, 0.1),
    screen: mat("#55c7ac", 0.35, 0),
    belt: mat("#b52b21", 0.7, 0),
    brake: mat("#74716c", 0.55, 0.65),
    groove: mat("#070809", 0.95, 0),
    compound: mat(classic ? "#202224" : "#c62a36", 0.75, 0),
  };
  for (const m of Object.values(materials)) m.side = THREE.DoubleSide;
  const layout = shapes.layouts[String(era)];
  const wheels = [];
  for (const side of [-1, 1])
    for (const front of [true, false]) {
      const wheel = new THREE.Group();
      wheel.position.set(
        side * layout.half,
        layout.radius,
        front ? layout.front : layout.rear,
      );
      car.add(wheel);
      wheels.push({ mesh: wheel, front });
    }
  const haloMaterial = materials.carbon.clone();
  haloMaterial.transparent = true;
  for (const batch of shapes.models[String(era)]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(batch.positions.flat(), 3),
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        batch.uvs.flatMap(([u, v]) => [u, 1 - v]),
        2,
      ),
    );
    geometry.setIndex(batch.indices);
    geometry.computeVertexNormals();
    const build = () => {
      const mesh = new THREE.Mesh(
        geometry,
        batch.cockpit_ghost ? haloMaterial : materials[batch.material],
      );
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.cameraHideHead = Boolean(batch.head);
      mesh.userData.cameraGhost = Boolean(batch.cockpit_ghost);
      return mesh;
    };
    if (batch.wheel) {
      for (const w of wheels)
        if (w.front === (batch.wheel === "front")) w.mesh.add(build());
    } else car.add(build());
  }
  car.userData.wheels = wheels;
  car.userData.materials = [...Object.values(materials), haloMaterial];
  car.userData.liveryReady = l.ready;
  car.userData.livery = {
    id: team.id,
    number: team.number,
    sponsor: team.sponsor,
    style: team.style,
    atlas: true,
  };
  const components = shapes.models[String(era)].flatMap((b) => b.components);
  car.userData.detail = {
    profiledBody: true,
    radiators: !classic,
    spokedWheels: 4,
    exhausts: classic ? 2 : 1,
    diffuser: !classic,
    referenceProfile: classic
      ? "1967-open-radiator-cigar"
      : ["", "1988-turbo", "2004-v10", "2023-ground-effect"][era],
    components,
    paintedVertices: shapes.models[String(era)]
      .filter((b) => ["body", "pods", "wing"].includes(b.material))
      .reduce((n, b) => n + b.positions.length, 0),
  };
  return car;
}

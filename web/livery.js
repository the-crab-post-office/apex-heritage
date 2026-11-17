import * as THREE from "three";
const assets = import.meta.glob("./assets/liveries/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
export function liveryMaterials(team) {
  let finish;
  const mappedMaterials = [];
  const ready = new Promise((r) => (finish = r));
  const texture = new THREE.TextureLoader().load(
    assets[`./assets/liveries/${team.id}.png`],
    () => finish(true),
    undefined,
    () => {
      mappedMaterials.forEach((m) => {
        m.map = null;
        m.color.set(team.color);
        m.needsUpdate = true;
      });
      finish(false);
    },
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mat = (region) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: texture,
      roughness:
        region === "tyre"
          ? 0.94
          : (team.paint_roughness ?? (team.style === "bull" ? 0.48 : 0.27)),
      metalness: region === "tyre" ? 0 : (team.paint_metalness ?? 0.16),
      clearcoat:
        region === "tyre"
          ? 0
          : ["bull", "ferrari"].includes(team.style)
            ? 0.2
            : 0.65,
      transparent: region === "decals",
      alphaTest: region === "decals" ? 0.08 : 0,
      depthWrite: region !== "decals",
      polygonOffset: region === "decals",
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      clearcoatRoughness: 0.2,
    });
    m.userData.region = region;
    mappedMaterials.push(m);
    return m;
  };
  return {
    body: mat("body"),
    pods: mat("pods"),
    wing: mat("wing"),
    end: mat("end"),
    decals: mat("decals"),
    tyre: mat("tyre"),
    plain: new THREE.MeshStandardMaterial({
      color: team.color,
      roughness: 0.36,
      metalness: 0.18,
    }),
    rim: new THREE.MeshStandardMaterial({
      color: team.rim_color || "#b4b9ba",
      roughness: 0.3,
      metalness: 0.75,
    }),
    texture,
    ready,
  };
}
export function bodyUV(theta, z, pods = false) {
  return [(pods ? 0.5 : 0) + theta * 0.5, 1 - (2.6 - z) / 10.4];
}
export function disposeCar(car) {
  const textures = new Set(),
    materials = new Set(),
    geometry = new Set();
  car.traverse((o) => {
    if (o.geometry) geometry.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m) {
        materials.add(m);
        for (const value of Object.values(m))
          if (value?.isTexture) textures.add(value);
      }
  });
  geometry.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  car.removeFromParent();
}

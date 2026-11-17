import variants from "../data/car-variants.json" with { type: "json" };
export function variantPoint(id, material, p) {
  const v = variants[id];
  if (!v) return [...p];
  let [x, y, z] = p;
  if (material === "pods" || material === "decals") x *= v.pod_scale;
  else if (material === "body" || material === "engine_decals") {
    if (z > 0.7) x *= 1 + (v.nose_scale - 1) * Math.min(1, (z - 0.7) / 0.7);
    if (z < -0.7) x *= v.engine_scale;
  }
  return [x, y, z];
}

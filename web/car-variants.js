import variants from "../data/car-variants.json" with { type: "json" };
export function variantPoint(id, material, p) {
  const v = variants[id];
  if (!v) return [...p];
  let [x, y, z] = p;
  if (["pods", "decals", "pod_carbon", "pod_shadow", "pod_metal"].includes(material)) {
    x *= v.pod_scale;
    const upper=Math.max(0,Math.min(1,(y-.30)/.30));
    const shoulder=Math.exp(-(((z+.25)/.8)**2));
    const bowl=Math.exp(-(((Math.abs(x)-.65)/.16)**2));
    y += (v.pod_crown||0)*shoulder*upper - (v.pod_bowl||0)*shoulder*bowl*upper;
    y -= (v.pod_downwash||0)*Math.max(0,Math.min(1,-z/1.6))*Math.max(0,y-.24);
  }
  else if (material === "body" || material === "engine_decals") {
    if (z > 0.7) x *= 1 + (v.nose_scale - 1) * Math.min(1, (z - 0.7) / 0.7);
    if (z < -0.7) x *= v.engine_scale;
  }
  return [x, y, z];
}

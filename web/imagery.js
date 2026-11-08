export const imageryFor = (manifest, id) =>
  manifest.tracks.find((t) => t.id === id);
export function photoUV(area, x, z) {
  const [a, b, c, d] = area.bounds;
  return [(x - a) / (c - a), 1 - (z - b) / (d - b)];
}
export function forestAt(area, x, z) {
  if (!area) return true;
  const [u, v] = photoUV(area, x, z),
    n = area.forest_grid_size;
  if (u < 0 || u >= 1 || v < 0 || v > 1) return false;
  return (
    area.forest_mask[
      Math.min(n - 1, Math.floor((1 - v) * n)) * n + Math.floor(u * n)
    ] === "1"
  );
}

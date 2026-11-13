import roster from "../data/roster.json" with { type: "json" };
export const eras = roster.eras;
export const cities = [
  "STAVELOT",
  "MONTE CARLO",
  "MONZA",
  "SILVERSTONE",
  "SUZUKA",
  "SÃO PAULO",
  "IMOLA",
  "NÜRBURG",
  "MONTRÉAL",
  "HOCKENHEIM",
];
export function mapSVG(track, color = "#c1cfb0", stroke = 4) {
  const p = track.points;
  const xs = p.map((p) => p[0]),
    ys = p.map((p) => p[1]);
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    w = Math.max(...xs) - minX,
    h = Math.max(...ys) - minY;
  const size = Math.max(w, h);
  const pad = size * 0.09;
  return `<svg viewBox="${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}" xmlns="http://www.w3.org/2000/svg" aria-label="${track.name} circuit map"><path d="M${p
    .filter((_, i) => i % 2 === 0)
    .map((p) => p.join(","))
    .join(
      "L",
    )}Z" fill="none" stroke="${color}" stroke-width="${stroke}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${p[0][0]}" cy="${p[0][1]}" r="${size * 0.017}" fill="#fa623c"/></svg>`;
}
export function formatTime(t) {
  if (!t) return "— — : — — . — — —";
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(3).padStart(6, "0")}`;
}

import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
const version = JSON.parse(
  readFileSync(new URL("package.json", import.meta.url)),
).version;
const hash = [...readFileSync(new URL("data/tracks.json", import.meta.url))]
  .reduce((h, b) => Math.imul(h ^ b, 0x01000193) >>> 0, 0x811c9dc5)
  .toString(16)
  .padStart(8, "0");
const buildInfo = { version, hash };
function buildIdentity() {
  return {
    name: "consistent-build-identity",
    enforce: "pre",
    transformIndexHtml(html) {
      return html.replaceAll("__APEX_VERSION__", version);
    },
    transform(code, id) {
      if (id.split("?")[0].endsWith("/web/style.css"))
        return code.replaceAll("__APEX_VERSION__", version);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/version.json") return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(buildInfo));
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(buildInfo),
      });
    },
  };
}
// Keep redistributed databases editable and asset-specific licenses accessible,
// without maintaining another checked-in copy of the same data.
const notices = {
  "expansion-captures.json": "data/expansion-captures.json",
  "expansion.md": "data/EXPANSION-NOTICE.md",
  "expansion-references.json": "data/expansion-references.json",
  "expansion-map-source.json": "data/expansion-map-source.json",
  "expansion-hotel-source.json": "data/expansion-hotel-source.json",
  "spa-monaco-captures.json": "data/spa-monaco-captures.json",
  "reference-scenes.json": "data/reference-scenes.json",
  "spa-monaco-reference.json": "data/spa-monaco-reference.json",
  "spa-monaco-reference.md": "data/SPA-MONACO-REFERENCE-NOTICE.md",
  "photo-audit-references.json": "data/photo-audit-references.json",
  "photo-audit-captures.json": "data/photo-audit-captures.json",
  "photo-audit.md": "data/PHOTO-AUDIT-NOTICE.md",
  "car-comparison-captures.json": "data/car-comparison-captures.json",
  "car-references.json": "data/car-references.json",
  "car-reference-photos.md": "data/CAR-REFERENCE-PHOTOS.md",
  "car-variants.json": "data/car-variants.json",
  "monaco-piscine-map.json": "data/monaco-piscine-map.json",
  "monaco-piscine.json": "data/monaco-piscine.json",
  "monaco-reference.json": "data/monaco-reference.json",
  "monaco-reference.md": "data/MONACO-REFERENCE-NOTICE.md",
  "car-scan-status.md": "data/CAR-SCAN-STATUS.md",
  "car-asset-status.json": "data/car-asset-status.json",
  "photo-reference.md": "data/PHOTO-REFERENCE-NOTICE.md",
  "spa-reference.json": "data/spa-reference.json",
  "roster.json": "data/roster.json",
  "liveries.md": "data/LIVERY-NOTICE.md",
  "DejaVu.txt": "scripts/fonts/LICENSE-DejaVu.txt",
  "corner-details.json": "data/corner-details.json",
  "venue-osm.json": "data/venue-osm.json",
  "corner-details.md": "data/CORNER-DETAILS-NOTICE.md",
  "pit-lanes.json": "data/pit-lanes.json",
  "pit-lanes-osm.json": "data/pit-lanes-osm.json",
  "pits.md": "data/PITS-NOTICE.md",
  "materials.md": "data/MATERIALS-NOTICE.md",
  "OSM.md": "data/OSM-NOTICE.md",
  "imagery.md": "data/IMAGERY-NOTICE.md",
  "imagery.json": "data/imagery.json",
  "elevation.md": "data/ELEVATION-NOTICE.md",
  "elevation-dem.json": "data/elevation-dem.json",
  "road-structures.json": "data/road-structures.json",
  "audio.md": "web/assets/audio/NOTICE.md",
  "recordings.json": "web/assets/audio/recordings.json",
  "buildings.json": "data/buildings.json",
  "tracks.json": "data/tracks.json",
  "start-markers.json": "data/start-markers.json",
  "circuits-MIT.md": "data/CIRCUITS-LICENSE.md",
};
function licenseAssets() {
  const content = () =>
    Object.entries(notices).map(([name, path]) => [
      name,
      readFileSync(new URL(path, import.meta.url)),
    ]);
  return {
    name: "editable-databases-and-notices",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split("?")[0].replace(/^\/licenses\//, "");
        if (
          !request.url?.startsWith("/licenses/") ||
          !Object.hasOwn(notices, name)
        )
          return next();
        response.setHeader(
          "Content-Type",
          name.endsWith("json")
            ? "application/json"
            : "text/plain; charset=utf-8",
        );
        response.end(readFileSync(new URL(notices[name], import.meta.url)));
      });
    },
    generateBundle() {
      for (const [name, source] of content())
        this.emitFile({ type: "asset", fileName: `licenses/${name}`, source });
      this.emitFile({
        type: "asset",
        fileName: "serve.py",
        source: readFileSync(new URL("scripts/serve-web.py", import.meta.url)),
      });
      this.emitFile({
        type: "asset",
        fileName: "_headers",
        source:
          "/*\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0\n",
      });
    },
  };
}
export default defineConfig({
  base: "./",
  preview: { host: "0.0.0.0", allowedHosts: true },
  root: "web",
  plugins: [licenseAssets(), buildIdentity()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __TRACK_DATA_HASH__: JSON.stringify(hash),
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    headers: { "Cache-Control": "no-store" },
  },
  build: { outDir: "../build/staging-site", emptyOutDir: true },
});

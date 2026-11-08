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
  "OSM.md": "data/OSM-NOTICE.md",
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
    },
  };
}
export default defineConfig({
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
  build: { outDir: "../site", emptyOutDir: true },
});

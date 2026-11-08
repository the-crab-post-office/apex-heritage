import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
// Keep redistributed databases editable and asset-specific licenses accessible,
// without maintaining another checked-in copy of the same data.
const notices = {
  "OSM.md": "data/OSM-NOTICE.md",
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
  plugins: [licenseAssets()],
  server: { host: "0.0.0.0", allowedHosts: true },
  build: { outDir: "../site", emptyOutDir: true },
});

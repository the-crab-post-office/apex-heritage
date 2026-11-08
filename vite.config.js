import { defineConfig } from "vite";
export default defineConfig({
  root: "web",
  server: { host: "0.0.0.0", allowedHosts: true },
  build: { outDir: "../site", emptyOutDir: true },
});

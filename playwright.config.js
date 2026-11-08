import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.js",
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: process.env.APEX_URL || "http://127.0.0.1:5173",
    viewport: { width: 800, height: 600 },
    launchOptions: { args: ["--no-sandbox", "--enable-unsafe-swiftshader"] },
    screenshot: "only-on-failure",
  },
  webServer: process.env.APEX_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
});

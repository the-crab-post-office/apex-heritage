import { test, expect } from "@playwright/test";
test("wet Spa actual road triangles are not covered by terrain or shoulder meshes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 984, height: 837 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex-config",
      JSON.stringify({
        quality: "low",
        sound: false,
        track: 0,
        era: 3,
        team: 0,
        weather: "wet",
        mode: "practice",
      }),
    ),
  );
  await page.goto("/");
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, { timeout: 90000 });
  const result = await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    return r.world.auditRoadSurface(8);
  });
  console.log("Actual mesh audit", result);
  await page.screenshot({ path: "artifacts/wet-spa-surface.png" });
  expect(result.samples).toBeGreaterThan(500);
  expect(result.missingRoad).toBe(0);
  expect(result.pitOverlayHits).toBe(0);
  expect(result.terrainIntrusions).toBe(0);
  expect(result.overlayIntrusions).toBe(0);
  expect(result.centerErrors).toBe(0);
  await expect(page.locator("#hud-build")).toContainText("v0.6.0");
});
for (const name of [
  "Monaco",
  "Monza",
  "Silverstone",
  "Suzuka",
  "Interlagos",
  "Imola",
  "Nürburgring GP",
  "Montréal",
  "Hockenheim",
])
  test(`${name} rendered surfaces audit`, async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "apex-config",
        JSON.stringify({ quality: "low", sound: false }),
      ),
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .click();
    await page.locator("#start-race").click();
    await page.waitForFunction(() => window.__apex?.race, { timeout: 90000 });
    const result = await page.evaluate(() => {
      const r = window.__apex.race;
      r.paused = true;
      return r.world.auditRoadSurface(8);
    });
    console.log(name, result);
    expect(result.missingRoad).toBe(0);
    expect(result.pitOverlayHits).toBe(0);
    expect(result.terrainIntrusions).toBe(0);
    expect(result.overlayIntrusions).toBe(0);
    expect(result.centerErrors).toBe(0);
  });
test("mixed builds are rejected visibly before starting WebGL", async ({
  page,
}) => {
  await page.route("**/version.json*", (route) =>
    route.fulfill({ json: { version: "0.0.0", hash: "outdated" } }),
  );
  await page.goto("/");
  await page.locator("#start-race").click();
  await expect(page.locator("#build-error")).toBeVisible();
  await expect(page.locator("#build-error")).toContainText("Build mismatch");
  expect(await page.evaluate(() => window.__apex?.race)).toBeFalsy();
});
// Camera walkthroughs, not autonomous physics laps. Exercise mesh visibility
// on changing grades and the tunnel, rather than inspecting only the start.
for (const [name, landmarks] of [
  [
    "Spa-Francorchamps",
    [
      ["eau-rouge", 5.970294, 50.442634],
      ["les-combes", 5.977029, 50.42965],
    ],
  ],
  [
    "Monaco",
    [
      ["hairpin", 7.4292, 43.74067],
      ["tunnel", 7.430157, 43.73961],
    ],
  ],
])
  test(`${name} hill and tunnel camera walkthrough`, async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "apex-config",
        JSON.stringify({ quality: "low", sound: false }),
      ),
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .click();
    await page.locator("#start-race").click();
    await page.waitForFunction(() => window.__apex?.race, { timeout: 90000 });
    await page.evaluate(() => {
      const r = window.__apex.race;
      r.paused = true;
      r.countdown = -1;
      cancelAnimationFrame(r.animation);
    });
    for (const [label, lon, lat] of landmarks) {
      const result = await page.evaluate(
        ({ lon, lat }) => {
          const r = window.__apex.race,
            t = r.track,
            o = t.origin;
          const x =
              (lon - o.longitude) *
              o.metres_per_degree *
              Math.cos((o.latitude * Math.PI) / 180),
            z = (o.latitude - lat) * o.metres_per_degree;
          let nearest = 0,
            distance = Infinity;
          t.points.forEach((p, i) => {
            const d = Math.hypot(p[0] - x, p[1] - z);
            if (d < distance) {
              distance = d;
              nearest = i;
            }
          });
          r.world.cameraInitialized = false;
          for (let k = -12; k <= 0; k++) {
            const p = r.world.sample((nearest + k) / t.points.length);
            r.state = { ...r.state, ...p, speed: 20, steering: 0 };
            r.world.update(r.state, 1 / 30);
          }
          r.updateHud(0);
          return {
            height: r.state.y,
            cameraY: r.world.camera.position.y,
            playerY: r.world.player.position.y,
            distance,
          };
        },
        { lon, lat },
      );
      expect(Number.isFinite(result.height)).toBe(true);
      expect(result.cameraY).toBeGreaterThan(result.playerY);
      expect(result.distance).toBeLessThan(80);
      await page.screenshot({ path: `artifacts/${label}-walkthrough.png` });
    }
  });

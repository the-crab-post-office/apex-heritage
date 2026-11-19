import { launchSession, openSetup } from "../scripts/menu-navigation.mjs";
import { test, expect } from "@playwright/test";
test("Piscine has mapped pool, harbour, dense stands and clear driving views", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex-config",
      JSON.stringify({
        track: 1,
        era: 3,
        quality: "high",
        sound: false,
        weather: "dry",
        mode: "practice",
      }),
    ),
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await launchSession(page);
  await page.waitForFunction(
    () => window.__apex?.race?.world?.piscineAudit,
    null,
    { timeout: 90000 },
  );
  const result = await page.evaluate(async () => {
    const r = window.__apex.race,
      w = r.world;
    r.paused = true;
    cancelAnimationFrame(r.animation);
    await w.photoReady;
    return {
      audit: w.piscineAudit,
      stands: w.config.venue.grandstands.filter(
        (s) => s.index >= 497 && s.index <= 555,
      ).length,
      kerbs: w.config.details.kerbs.filter((k) => k.name.startsWith("Piscine")),
      road: w.auditRoadSurface(20),
    };
  });
  expect(result.audit.yachts).toBe(20);
  expect(result.audit.facets).toBeGreaterThan(300);
  expect(result.stands).toBeGreaterThanOrEqual(5);
  expect(result.kerbs).toHaveLength(5);
  expect(result.kerbs.every((k) => k.stripe_length === 0.85)).toBe(true);
  for (const key of [
    "missingRoad",
    "terrainIntrusions",
    "overlayIntrusions",
    "centerErrors",
    "pitOverlayHits",
  ])
    expect(result.road[key]).toBe(0);
  for (const [name, pos, target, fov] of [
    ["overhead", [-395, 235, 435], [-247, 0, 280], 58],
    ["entry", [-278, 2.5, 185], [-255, 0.2, 220], 76],
    ["exit", [-229, 2.3, 329], [-244, 0.6, 365], 78],
  ]) {
    await page.evaluate(
      ({ pos, target, fov }) => {
        const w = window.__apex.race.world;
        w.camera.position.set(...pos);
        w.camera.lookAt(...target);
        w.camera.fov = fov;
        w.camera.updateProjectionMatrix();
        w.player.visible = false;
        w.sun.position.set(-150, 190, 420);
        w.sun.target.position.set(-250, 0, 280);
        w.renderer.render(w.scene, w.camera);
        document.querySelector("#race-view").style.visibility = "hidden";
        document.querySelector("#race-canvas").style.visibility = "visible";
      },
      { pos, target, fov },
    );
    await page.screenshot({ path: `artifacts/piscine-${name}.png` });
  }
  expect(errors).toEqual([]);
});

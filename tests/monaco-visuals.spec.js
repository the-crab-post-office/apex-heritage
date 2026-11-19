import { launchSession, openSetup } from "../scripts/menu-navigation.mjs";
import { test, expect } from "@playwright/test";
for (const [era, quality] of [
  [0, "high"],
  [3, "low"],
])
  test(`modern Monaco architecture and safety are explicit for era ${era}, ${quality}`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      (c) => localStorage.setItem("apex-config", JSON.stringify(c)),
      {
        track: 1,
        era,
        quality,
        sound: false,
        weather: "dry",
        mode: "practice",
      },
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("#layout-note")).toContainText(
      "MODERN MONACO SCENERY (ALL ERAS)",
    );
    await launchSession(page);
    await page.waitForFunction(
      () => window.__apex?.race?.world?.architectureAudit,
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
        architecture: w.architectureAudit,
        buildingMeshes: w.auditBuildingMeshes(),
        road: w.auditRoadSurface(20),
        provenance: w.player.userData.assetProvenance,
        environment: !!w.scene.environment,
        paint: w.player.userData.materials.some(
          (m) => m.isMeshPhysicalMaterial && m.clearcoat > 0,
        ),
        barriers: w.venueAudit.barriers.length,
        fences: w.venueAudit.barriers.filter((b) => b.fence).length,
        geometry: w.renderer.info.memory.geometries,
      };
    });
    expect(result.architecture.named.map((b) => b.name)).toEqual(
      expect.arrayContaining([
        "Casino de Monte-Carlo",
        "Fairmont Monte Carlo",
        "Hôtel de Paris Monte-Carlo",
        "Le Mirabeau",
      ]),
    );
    expect(result.architecture.cornices).toBeGreaterThan(100);
    expect(result.buildingMeshes.checked).toBeGreaterThan(30);
    expect(result.buildingMeshes.hits).toBeGreaterThan(
      result.buildingMeshes.checked * 0.95,
    );
    expect(result.architecture.balconies).toBeGreaterThan(100);
    expect(result.architecture.towers).toBe(2);
    expect(result.barriers).toBeGreaterThan(1000);
    expect(result.fences).toBeGreaterThan(500);
    expect(result.provenance.status).toBe("awaiting_verified_scan");
    expect(result.paint).toBe(true);
    expect(result.environment).toBe(quality === "high");
    for (const key of [
      "missingRoad",
      "terrainIntrusions",
      "overlayIntrusions",
      "centerErrors",
      "pitOverlayHits",
    ])
      expect(result.road[key]).toBe(0);
    console.log(
      JSON.stringify({
        era,
        quality,
        balconies: result.architecture.balconies,
        cornices: result.architecture.cornices,
        towers: result.architecture.towers,
        barriers: result.barriers,
        geometry: result.geometry,
      }),
    );
    if (quality === "high")
      for (const name of [
        "Casino de Monte-Carlo",
        "Fairmont Monte Carlo",
        "Hôtel de Paris Monte-Carlo",
      ]) {
        await page.evaluate((name) => {
          const w = window.__apex.race.world;
          const area = (p) =>
            Math.abs(
              p.reduce((s, a, i) => {
                const b = p[(i + 1) % p.length];
                return s + a[0] * b[1] - b[0] * a[1];
              }, 0),
            );
          const building = w.mappedBuildings
            .filter((b) => b.name === name)
            .sort((a, b) => area(b.footprint) - area(a.footprint))[0];
          const x =
              building.footprint.reduce((n, p) => n + p[0], 0) /
              building.footprint.length,
            z =
              building.footprint.reduce((n, p) => n + p[1], 0) /
              building.footprint.length;
          let nearest = 0,
            d = Infinity;
          w.track.points.forEach((p, i) => {
            const dd = Math.hypot(p[0] - x, p[1] - z);
            if (dd < d) {
              d = dd;
              nearest = i;
            }
          });
          const p = w.sample((nearest - 8) / w.track.points.length);
          w.camera.position.set(p.x, p.y + 12, p.z);
          w.camera.lookAt(x, building.detailBase + building.height * 0.6, z);
          w.camera.fov = 66;
          w.camera.updateProjectionMatrix();
          w.player.visible = false;
          w.sun.position.set(x + 100, p.y + 180, z + 130);
          w.sun.target.position.set(x, p.y, z);
          w.renderer.render(w.scene, w.camera);
          document.querySelector("#race-view").style.visibility = "hidden";
          document.querySelector("#race-canvas").style.visibility = "visible";
        }, name);
        await page.screenshot({
          path: `artifacts/v010-monaco-${name.startsWith("Casino") ? "casino" : name.startsWith("Fairmont") ? "fairmont" : "hotel-paris"}.png`,
        });
      }
    expect(errors).toEqual([]);
  });

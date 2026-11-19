import { test, expect } from "@playwright/test";
for (let track = 0; track < 13; track++)
  test(`venue ${track}: explicit architecture and rendered ground coverage`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      (c) => localStorage.setItem("apex-config", JSON.stringify(c)),
      {
        track,
        era: 3,
        quality: "low",
        sound: false,
        mode: "practice",
        weather: "dry",
      },
    );
    await page.goto("/");
    await page.waitForFunction(
      () => window.__showroom?.container.dataset.ready === "true",
    );
    await page.locator("#start-race").click();
    await page.waitForFunction(() => window.__apex?.race?.world?.player);
    const result = await page.evaluate(async () => {
      const r = window.__apex.race,
        w = r.world;
      r.paused = true;
      cancelAnimationFrame(r.animation);
      const textures = await Promise.all(w.surfaces.pending);
      return {
        name: w.track.name,
        assigned: w.mappedBuildings.every((b) =>
          Number.isInteger(b.appearance?.facade),
        ),
        count: w.mappedBuildings.length,
        architecture: w.buildingAppearanceAudit,
        meshes: w.auditBuildingMeshes(true),
        ground: w.track.id === "nl-1948" ? w.auditGroundCoverage(5) : null,
        road: w.auditRoadSurface(19),
        textures,
      };
    });
    console.log(JSON.stringify(result));
    expect(result.count).toBeGreaterThan(0);
    expect(result.assigned).toBe(true);
    expect(result.architecture.assigned).toBe(result.count);
    expect(result.meshes.checked).toBeGreaterThan(0);
    expect(result.meshes.missing).toBe(0);
    expect(result.textures.every(Boolean)).toBe(true);
    expect(result.road.missingRoad).toBe(0);
    expect(result.road.terrainIntrusions).toBe(0);
    expect(result.road.overlayIntrusions).toBe(0);
    if (result.ground) expect(result.ground.missing).toEqual([]);
    expect(errors).toEqual([]);
  });

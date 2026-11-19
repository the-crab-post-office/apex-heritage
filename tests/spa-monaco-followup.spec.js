import { launchSession, openSetup } from "../scripts/menu-navigation.mjs";
import { test, expect } from "@playwright/test";
async function start(page, track, era) {
  await page.addInitScript(
    (c) => localStorage.setItem("apex-config", JSON.stringify(c)),
    {
      track,
      era,
      quality: "low",
      sound: false,
      mode: "practice",
      weather: "dry",
    },
  );
  await page.goto("/");
  await launchSession(page);
  await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
    timeout: 90000,
  });
  await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    cancelAnimationFrame(r.animation);
  });
}
for (const era of [3, 4])
  test(`recent Spa era ${era} has independent corner apexes and matching collision walls`, async ({
    page,
  }) => {
    await start(page, 0, era);
    const result = await page.evaluate(() => {
      const r = window.__apex.race,
        w = r.world;
      return {
        kerbs: w.cornerAudit.kerbs.map((k) => k.name),
        walls: w.config.venue.barriers.filter((b) => b.kind.startsWith("spa-"))
          .length,
        scene: w.referenceAudit,
        road: w.auditRoadSurface(14),
      };
    });
    for (const name of [
      "Les Combes T5 right apex",
      "Les Combes T6 left apex",
      "Malmedy T7 right apex",
      "Bus Stop first right apex",
      "Bus Stop second left apex",
    ])
      expect(result.kerbs).toContain(name);
    expect(result.walls).toBeGreaterThan(20);
    expect(result.scene.eras).toEqual([3, 4]);
    expect(result.road.missingRoad).toBe(0);
    expect(result.road.pitOverlayHits).toBe(0);
  });
test("historical Spa keeps its original surface and barriers", async ({
  page,
}) => {
  await start(page, 0, 2);
  const result = await page.evaluate(() => {
    const w = window.__apex.race.world;
    return {
      kerbs: w.cornerAudit.kerbs.map((k) => k.name),
      walls: w.config.venue.barriers.filter((b) => b.kind.startsWith("spa-"))
        .length,
      scene: !!w.referenceScene,
    };
  });
  expect(result.kerbs).toContain("Les Combes apex");
  expect(result.walls).toBe(0);
  expect(result.scene).toBe(false);
});
for (const era of [0, 3])
  test(`Monaco era ${era}: hotel spans the actual road with clear vehicle headroom`, async ({
    page,
  }) => {
    await start(page, 1, era);
    const result = await page.evaluate(() => {
      const w = window.__apex.race.world;
      return {
        ray: w.auditReferenceScene(),
        floor: w.referenceAudit.clearance,
        roof: !!w.tunnelRoof,
        buildings: w.mappedBuildings.filter((b) => b.style === "fairmont")
          .length,
      };
    });
    expect(result.ray.blocked).toBe(0);
    expect(result.ray.covered).toBeGreaterThanOrEqual(25);
    expect(result.ray.minClearance).toBeGreaterThan(4.64);
    expect(result.floor.floor_y).toBeGreaterThan(11);
    expect(result.roof).toBe(true);
    expect(result.buildings).toBeGreaterThan(1);
  });
test("new report decodes seven real renders and filters Spa versus Monaco", async ({
  page,
}) => {
  await page.goto("/spa-monaco-update.html");
  const dimensions = await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map(async (i) => {
        i.loading = "eager";
        await i.decode();
      }),
    );
    return [...document.images].map((i) => [i.naturalWidth, i.naturalHeight]);
  });
  expect(dimensions).toHaveLength(7);
  expect(dimensions.every(([w, h]) => w === 1000 && h === 625)).toBe(true);
  await page.locator('button[data-kind="spa"]').click();
  await expect(page.locator("article:visible")).toHaveCount(5);
  await page.locator('button[data-kind="monaco"]').click();
  await expect(page.locator("article:visible")).toHaveCount(2);
});
test("new report fits a 390 pixel screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/spa-monaco-update.html");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

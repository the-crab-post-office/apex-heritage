import { launchSession, openSetup } from "../scripts/menu-navigation.mjs";
import { test, expect } from "@playwright/test";
test("reference chassis have distinct silhouettes and matching physical wheel layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/");
  for (const era of [0, 3]) {
    await openSetup(page, "era");
    await page.locator(`[data-era="${era}"]`).click();
    await openSetup(page, "team");
    await expect(page.locator("#showroom-stage")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const result = await page.evaluate((e) => {
      const s = window.__showroom;
      s.controls.autoRotate = false;
      s.camera.position.set(4.7, 1.8, 7.5);
      s.controls.target.set(0, 0.55, 0);
      s.controls.update();
      s.renderer.render(s.scene, s.camera);
      return {
        profile: s.car.userData.detail.referenceProfile,
        components: s.car.userData.detail.components,
        wheels: s.car.userData.wheels.map((w) => [
          w.mesh.position.x,
          w.mesh.position.z,
        ]),
      };
    }, era);
    expect(result.profile).toContain(era === 0 ? "1967" : "2023");
    expect(result.components).toContain(
      era === 0 ? "radiator cavity" : "halo centre pillar",
    );
    expect(result.wheels[0]).toEqual(era === 0 ? [-0.82, 1.12] : [-0.8, 1.75]);
    expect(result.wheels[3]).toEqual(era === 0 ? [0.82, -1.1] : [0.8, -1.85]);
    await page
      .locator("#showroom-canvas")
      .screenshot({ path: `artifacts/v09-reference-car-${era}.png` });
  }
});
test("Spa photo complex is steep, covered, clear of road intrusions and explicitly shared across eras", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex-config",
      JSON.stringify({
        track: 0,
        era: 2,
        quality: "high",
        sound: false,
        weather: "dry",
        mode: "practice",
      }),
    ),
  );
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/");
  await expect(page.locator("#layout-note")).toContainText("ALL ERAS");
  await launchSession(page);
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  const result = await page.evaluate(async () => {
    const r = window.__apex.race,
      w = r.world;
    r.paused = true;
    cancelAnimationFrame(r.animation);
    await w.photoReady;
    const a = w.sample(164 / w.track.points.length),
      b = w.sample(220 / w.track.points.length),
      audit = w.auditRoadSurface(8);
    const p = w.sample(157 / w.track.points.length),
      q = w.sample(211 / w.track.points.length);
    w.camera.position.set(
      p.x + Math.cos(p.yaw) * 35,
      p.y + 20,
      p.z - Math.sin(p.yaw) * 35,
    );
    w.camera.lookAt(q.x, q.y + 1, q.z);
    w.camera.fov = 52;
    w.camera.updateProjectionMatrix();
    w.player.visible = false;
    w.sun.position.set(q.x + 100, q.y + 180, q.z + 130);
    w.sun.target.position.set(q.x, q.y, q.z);
    w.renderer.render(w.scene, w.camera);
    return {
      rise: b.y - a.y,
      audit,
      covered: w.config.venue.grandstands.filter(
        (s) => s.index >= 180 && s.index <= 225 && s.roof,
      ).length,
      red: w.config.details.facets.filter(
        (f) => f.color === 0xb52b24 && f.kind === 2,
      ).length,
    };
  });
  expect(result.rise).toBeCloseTo(40, 2);
  expect(result.covered).toBeGreaterThan(5);
  expect(result.red).toBeGreaterThan(100);
  for (const key of [
    "missingRoad",
    "pitOverlayHits",
    "terrainIntrusions",
    "overlayIntrusions",
    "centerErrors",
  ])
    expect(result.audit[key]).toBe(0);
  await page.evaluate(() => {
    document.querySelector("#race-view").style.visibility = "hidden";
    document.querySelector("#race-canvas").style.visibility = "visible";
  });
  await page
    .locator("#race-canvas")
    .screenshot({ path: "artifacts/v09-eau-rouge-release.png" });
  expect(errors).toEqual([]);
});

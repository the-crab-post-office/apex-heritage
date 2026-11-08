import { test, expect } from "@playwright/test";
for (const era of [0, 3])
  test(`Monza era ${era}: shared physical kerbs, varied widths, correct tyre support and honest layout labels`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") console.log(m.text());
    });
    await page.addInitScript(
      (c) => localStorage.setItem("apex-config", JSON.stringify(c)),
      {
        quality: "low",
        sound: false,
        track: 2,
        era,
        weather: "dry",
        mode: "practice",
      },
    );
    await page.goto("/");
    await expect(page.locator("#layout-note")).toContainText(
      era === 0 ? "SUBSTITUTE" : "RECENT MAPPED",
    );
    await page.locator("#start-race").click();
    await page.waitForFunction(
      () => window.__apex?.race?.world?.cornerAudit,
      null,
      { timeout: 90000 },
    );
    const result = await page.evaluate(() => {
      let r = window.__apex.race,
        w = r.world;
      r.paused = true;
      cancelAnimationFrame(r.animation);
      r.countdown = -1;
      let s = window.__apex.getState();
      w.update(s, 0);
      w.player.updateMatrixWorld(true);
      let radius = [0.34, 0.35, 0.35, 0.38][w.config.era];
      let tyreErrors = w.player.userData.wheels.map((t, i) =>
        Math.abs(
          t.mesh.getWorldPosition(w.player.position.clone()).y -
            radius -
            s.wheel_heights[i],
        ),
      );
      let d = JSON.parse(r.sim.corner_geometry_json());
      let vertices = w.cornerMeshes.reduce(
        (n, m) => n + m.geometry.attributes.position.count,
        0,
      );
      let duplicates = w.mappedBuildings.filter((b) =>
        w.config.venue.grandstands.some(
          (s) => s.osm_id && s.osm_id === b.osm_id,
        ),
      ).length;
      let k = d.kerbs.find((k) => k.shape === "raised") || d.kerbs[0],
        u = (k.start_index + k.end_index) / 2 / w.track.points.length,
        p = w.sample(u);
      let x = p.x,
        z = p.z,
        y = w.roadHeight(x, z, u);
      w.camera.position.set(
        x + Math.cos(p.yaw) * 22 - Math.sin(p.yaw) * 19,
        y + 15,
        z - Math.sin(p.yaw) * 22 - Math.cos(p.yaw) * 19,
      );
      w.camera.lookAt(x, y, z);
      w.renderer.render(w.scene, w.camera);
      return {
        vertices,
        expected: d.facets.length * 3,
        tyreErrors,
        duplicates,
        widths: new Set(d.kerbs.map((k) => k.width)).size,
        heights: new Set(d.kerbs.map((k) => k.height)).size,
        label: d.label,
        kind0: w.cornerMeshes.some((m) => m.userData.cornerKind === 0),
        runoff: w.cornerMeshes.some((m) => m.userData.cornerKind > 0),
      };
    });
    expect(result.vertices).toBe(result.expected);
    expect(result.kind0).toBeTruthy();
    expect(result.runoff).toBeTruthy();
    expect(result.widths).toBeGreaterThan(2);
    expect(result.heights).toBeGreaterThan(era === 0 ? 0 : 1);
    expect(Math.max(...result.tyreErrors)).toBeLessThan(0.001);
    expect(result.duplicates).toBe(0);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `artifacts/v07-monza-era-${era}-corners.png`,
    });
  });

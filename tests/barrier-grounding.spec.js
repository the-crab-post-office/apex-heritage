import { launchSession, openSetup } from "../scripts/menu-navigation.mjs";
import { test, expect } from "@playwright/test";
for (const [track, era, quality] of [
  [0, 3, "low"],
  [0, 0, "high"],
  [1, 3, "low"],
]) {
  test(`barriers meet rendered ground: track ${track}, era ${era}, ${quality}`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      (c) => localStorage.setItem("apex-config", JSON.stringify(c)),
      { track, era, quality, sound: false, weather: "dry", mode: "practice" },
    );
    await page.goto("/");
    await launchSession(page);
    await page.waitForFunction(
      () => window.__apex?.race?.world?.venueAudit,
      null,
      { timeout: 90000 },
    );
    const result = await page.evaluate(async () => {
      const r = window.__apex.race,
        w = r.world;
      r.paused = true;
      cancelAnimationFrame(r.animation);
      await w.photoReady;
      const rayAudit = w.auditBarrierGrounding(17);
      const footings = w.venueAudit.groundFootings;
      const result = {
        rayAudit,
        footings: footings.length,
        maxGap: Math.max(...footings.map((p) => p.bottom - p.ground)),
        unsupported: w.venueAudit.unsupportedGround.length,
      };
      const p = w.sample(175 / w.track.points.length),
        q = w.sample(205 / w.track.points.length);
      w.camera.position.set(
        p.x + Math.cos(p.yaw) * 13,
        p.y + 5,
        p.z - Math.sin(p.yaw) * 13,
      );
      w.camera.lookAt(q.x, q.y + 1, q.z);
      w.camera.fov = 60;
      w.camera.updateProjectionMatrix();
      w.player.visible = false;
      w.renderer.render(w.scene, w.camera);
      document.querySelector("#race-view").style.visibility = "hidden";
      document.querySelector("#race-canvas").style.visibility = "visible";
      return result;
    });
    console.log(JSON.stringify({ track, era, quality, ...result }));
    expect(result.footings).toBeGreaterThan(100);
    expect(result.unsupported).toBe(0);
    expect(result.maxGap).toBeLessThan(0);
    expect(result.rayAudit.checked).toBeGreaterThan(30);
    expect(result.rayAudit.wallsChecked).toBeGreaterThan(8);
    expect(result.rayAudit.missing).toBe(0);
    expect(result.rayAudit.maxGap).toBeLessThan(0.015);
    expect(result.rayAudit.maxPostEmbedding).toBeLessThan(0.14);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `artifacts/grounded-barriers-${track}-${era}-${quality}.png`,
    });
  });
}

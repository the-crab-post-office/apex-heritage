import { test, expect } from "@playwright/test";
for (const [track, name] of [
  [0, "Spa"],
  [1, "Monaco"],
])
  test(`${name}: shared venue renders complete safety furniture clear of the entire race and pit routes`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      (c) => localStorage.setItem("apex-config", JSON.stringify(c)),
      {
        quality: "low",
        sound: false,
        track,
        era: 2,
        team: 2,
        weather: "dry",
        mode: "practice",
      },
    );
    await page.goto("/");
    await page.locator("#start-race").click();
    await page.waitForFunction(
      () => window.__apex?.race?.world?.venueAudit,
      null,
      { timeout: 90000 },
    );
    const result = await page.evaluate(() => {
      const r = window.__apex.race,
        w = r.world;
      r.paused = true;
      r.countdown = -1;
      r.world.update = () => {};
      r.updateHud(performance.now() / 1000);
      const a = w.venueAudit;
      let blocked = 0,
        nonFinite = 0,
        instances = 0;
      for (const b of a.barriers)
        for (const f of [0, 0.25, 0.5, 0.75, 1]) {
          const x = b.a[0] + (b.b[0] - b.a[0]) * f,
            z = b.a[1] + (b.b[1] - b.a[1]) * f;
          if (
            !w.clearance.circleClear(x, z, b.radius) ||
            !w.pitClearance.circleClear(x, z, b.radius)
          )
            blocked++;
        }
      for (const s of a.grandstands)
        if (
          !w.clearance.polygonClear(s.footprint) ||
          !w.pitClearance.polygonClear(s.footprint)
        )
          blocked++;
      w.scene.traverse((o) => {
        if (o.isInstancedMesh) {
          instances += o.count;
          for (const n of o.instanceMatrix.array)
            if (!Number.isFinite(n)) nonFinite++;
        }
      });
      const s = a.grandstands[0];
      w.camera.position.set(
        s.x + Math.sin(s.yaw) * 42 + Math.cos(s.yaw) * 35,
        w.height(s.x, s.z) + 18,
        s.z + Math.cos(s.yaw) * 42 - Math.sin(s.yaw) * 35,
      );
      w.camera.lookAt(s.x, w.height(s.x, s.z) + 3, s.z);
      w.renderer.render(w.scene, w.camera);
      return {
        blocked,
        nonFinite,
        instances,
        tyres: a.tyres,
        seats: a.seats,
        spectators: a.spectators,
        stands: a.grandstands.length,
        barriers: a.barriers.length,
        shared: JSON.parse(r.sim.venue_geometry_json()).barriers.length,
      };
    });
    expect(result.blocked).toBe(0);
    expect(result.nonFinite).toBe(0);
    expect(result.barriers).toBe(result.shared);
    expect(result.stands).toBe(6);
    expect(result.tyres).toBeGreaterThan(500);
    expect(result.seats).toBe(1836);
    expect(result.spectators).toBeGreaterThan(500);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `artifacts/v06-${name.toLowerCase()}-venue.png`,
    });
  });

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
      cancelAnimationFrame(r.animation);
      r.countdown = -1;
      r.world.update = () => {};
      r.updateHud(performance.now() / 1000);
      const a = w.venueAudit;
      const raceClear = new w.clearance.constructor(w.track, 0.12),
        pitClear = new w.clearance.constructor(w.pitTrack, 0.25);
      let blocked = 0,
        nonFinite = 0,
        instances = 0;
      for (const b of a.barriers)
        for (const f of [0, 0.25, 0.5, 0.75, 1]) {
          const x = b.a[0] + (b.b[0] - b.a[0]) * f,
            z = b.a[1] + (b.b[1] - b.a[1]) * f;
          if (
            !raceClear.circleClear(x, z, b.radius) ||
            !pitClear.circleClear(x, z, b.radius)
          )
            blocked++;
        }
      for (const s of a.grandstands)
        if (
          !raceClear.polygonClear(s.footprint) ||
          !pitClear.polygonClear(s.footprint)
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
        sharedStands: JSON.parse(r.sim.venue_geometry_json()).grandstands
          .length,
        sourceFootprints: new Set(
          a.grandstands.filter((s) => s.osm_id).map((s) => s.osm_id),
        ).size,
        barriers: a.barriers.length,
        shared: JSON.parse(r.sim.venue_geometry_json()).barriers.length,
      };
    });
    expect(result.blocked).toBe(0);
    expect(result.nonFinite).toBe(0);
    expect(result.barriers).toBe(result.shared);
    expect(result.stands).toBe(result.sharedStands);
    if (track === 0) expect(result.sourceFootprints).toBe(8);
    else expect(result.stands).toBe(2);
    if (track === 0) expect(result.tyres).toBeGreaterThan(100);
    expect(result.seats).toBeGreaterThan(250);
    expect(result.spectators).toBeGreaterThan(100);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `artifacts/v07-${name.toLowerCase()}-venue.png`,
    });
    if (track === 0) {
      await page.evaluate(() => {
        const w = window.__apex.race.world,
          b = w.venueAudit.barriers.find((b) => b.kind === "tyres"),
          x = (b.a[0] + b.b[0]) / 2,
          z = (b.a[1] + b.b[1]) / 2,
          p = w.track.points[b.index],
          dx = p[0] - x,
          dz = p[1] - z,
          l = Math.hypot(dx, dz),
          tx = b.b[0] - b.a[0],
          tz = b.b[1] - b.a[1],
          length = Math.hypot(tx, tz),
          y = w.roadHeight(x, z, b.index / w.track.points.length);
        w.camera.position.set(
          x + (dx / l) * 8 + (tx / length) * 6,
          y + 3.8,
          z + (dz / l) * 8 + (tz / length) * 6,
        );
        w.camera.lookAt(x, y + 0.6, z);
        w.renderer.render(w.scene, w.camera);
      });
      await page.screenshot({ path: "artifacts/v07-tyre-barrier.png" });
    }
  });

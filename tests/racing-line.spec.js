import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { launchSession } from "../scripts/menu-navigation.mjs";
for (const [track, name, station] of [
  [2, "Monza", 90],
  [11, "Zandvoort", 145],
  [4, "Suzuka", 610],
])
  test(`${name}: optimized line stays above actual road and no longer paints the whole preview red`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      (c) =>
        localStorage.setItem(
          "apex-config",
          JSON.stringify({
            track: c,
            era: 3,
            team: 2,
            quality: "low",
            sound: false,
            mode: "practice",
          }),
        ),
      track,
    );
    await page.goto("/");
    await page.waitForFunction(
      () => window.__showroom?.container.dataset.ready === "true",
    );
    await launchSession(page);
    await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
      timeout: 120000,
    });
    const result = await page.evaluate(
      ({ station }) => {
        const r = window.__apex.race,
          w = r.world;
        r.paused = true;
        cancelAnimationFrame(r.animation);
        const line = w.racingLine,
          g = line.guide,
          n = line.n;
        const countColours = () => {
          const a = line.mesh.geometry.attributes.color,
            range = line.mesh.geometry.drawRange;
          let red = 0,
            green = 0,
            total = 0;
          for (let i = range.start; i < range.start + range.count; i += 3) {
            if (a.getX(i) > 0.95 && a.getY(i) < 0.2) red++;
            if (a.getX(i) < 0.3 && a.getY(i) > 0.9) green++;
            total++;
          }
          return { red, green, total };
        };
        line.update({ ...r.state, speed: 0, progress: station / n });
        const stopped = countColours();
        line.update({
          ...r.state,
          speed: g.targets[station] * 0.95,
          progress: station / n,
        });
        const moving = countColours(),
          surface = line.auditSurface(9);
        const p = w.sample(station / n);
        w.player.visible = false;
        w.camera.position.set(p.x - 55, p.y + 65, p.z + 60);
        w.camera.lookAt(p.x, p.y, p.z);
        w.renderer.render(w.scene, w.camera);
        return {
          stopped,
          moving,
          surface,
          offsetRange: [
            Math.min(...g.path.offsets),
            Math.max(...g.path.offsets),
          ],
          carSpec: w.config.carSpec,
          spec: JSON.parse(r.sim.spec_json()),
          image: w.renderer.domElement
            .toDataURL("image/jpeg", 0.88)
            .split(",")[1],
        };
      },
      { station },
    );
    fs.writeFileSync(
      `artifacts/019-${name.toLowerCase()}.jpg`,
      Buffer.from(result.image, "base64"),
    );
    delete result.image;
    console.log(name, JSON.stringify(result));
    expect(result.stopped.red).toBe(0);
    expect(result.stopped.green).toBe(result.stopped.total);
    expect(result.moving.red / result.moving.total).toBeLessThan(0.6);
    expect(result.moving.green).toBeGreaterThan(0);
    expect(result.surface.missing).toBe(0);
    expect(result.surface.minClearance).toBeGreaterThan(0.005);
    expect(result.surface.maxClearance).toBeLessThan(0.2);
    expect(result.offsetRange[0]).toBeLessThan(-1);
    expect(result.offsetRange[1]).toBeGreaterThan(1);
    expect(result.carSpec).toEqual(result.spec);
    expect(errors).toEqual([]);
  });

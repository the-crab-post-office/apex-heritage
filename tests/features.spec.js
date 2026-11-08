import { test, expect } from "@playwright/test";
const setup = async (page, extra = {}) => {
  await page.addInitScript(
    (c) => localStorage.setItem("apex-config", JSON.stringify(c)),
    {
      quality: "low",
      sound: false,
      track: 0,
      era: 2,
      team: 0,
      weather: "dry",
      mode: "practice",
      ...extra,
    },
  );
  await page.goto("/");
};
test("controller-only menu, analog driving, edge actions and disconnect pause", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.testPad = {
      index: 0,
      id: "Simulated standard pad",
      mapping: "standard",
      connected: true,
      axes: [0, 0],
      buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      value: () => (window.testPad ? [window.testPad] : []),
    });
  });
  await setup(page);
  const press = async (index, value = 1) =>
    page.evaluate(
      ({ index, value }) => {
        window.testPad.buttons[index] = { value, pressed: value > 0.5 };
      },
      { index, value },
    );
  await press(0);
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  await press(0, 0);
  await page.evaluate(() => (window.__apex.race.countdown = -1));
  await press(7, 0.7);
  await page.waitForFunction(() => window.__apex.getState().speed > 2, null, {
    timeout: 45000,
  });
  await page.evaluate(() => (window.testPad.axes[0] = -0.6));
  await page.waitForFunction(() => window.__apex.getState().steering > 0.15);
  await page.evaluate(() => (window.testPad.axes[0] = 0));
  await press(7, 0);
  await press(6, 0.8);
  await page.waitForFunction(() => window.__apex.getState().brake > 0.7);
  await press(6, 0);
  await press(5);
  await page.waitForFunction(() => window.__apex.race.world.cameraMode === 1);
  await press(5, 0);
  await press(2);
  await page.waitForFunction(() => window.__apex.getState().pit_requested);
  await press(2, 0);
  await press(3);
  await page.waitForFunction(() => window.__apex.getState().pit_limiter);
  await press(3, 0);
  await press(9);
  await expect(page.locator("#pause-overlay")).toBeVisible();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__apex.race.paused)).toBe(true);
  await press(9, 0);
  await page.waitForTimeout(100);
  await press(9);
  await expect(page.locator("#pause-overlay")).toBeHidden();
  await press(9, 0);
  await page.evaluate(() => {
    window.disconnectedPad = window.testPad;
    window.testPad = null;
  });
  await expect(page.locator("#pause-overlay")).toBeVisible();
  await page.evaluate(() => {
    window.testPad = window.disconnectedPad;
    window.testPad.buttons[8] = { value: 1, pressed: true };
    window.testPad.buttons[2] = { value: 1, pressed: true }; // simultaneous action must not call a freed WASM instance
  });
  await expect(page.locator("#race-view")).toBeHidden();
  expect(errors).toEqual([]);
});
test("actual WASM pit entry, marked-box stop, timed service and exit", async ({
  page,
}) => {
  await setup(page);
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  await page.locator("#pit-practice").click();
  const entry = await page.evaluate(() => {
    const r = window.__apex.race;
    cancelAnimationFrame(r.animation);
    const sim = r.sim,
      pit = r.pit;
    // Short virtual-time driver from the public pit-practice spawn. Steers the
    // approach, then uses only throttle/brake inside the assisted pit lane.
    for (let frame = 0; frame < 18000; frame++) {
      const s = JSON.parse(sim.state_json());
      if (s.pit_phase === 2) {
        r.state = s;
        r.world.cameraInitialized = false;
        r.world.update(s, 1 / 60);
        r.updateHud(0);
        return { s, audit: r.world.auditPitSurface() };
      }
      let throttle,
        brake,
        steer = 0;
      if (!s.pit_active) {
        let best = Infinity,
          idx = 0;
        r.track.points.forEach((p, i) => {
          const d = Math.hypot(p[0] - s.x, p[1] - s.z);
          if (d < best) {
            best = d;
            idx = i;
          }
        });
        const q = r.track.points[(idx + 3) % r.track.points.length];
        const angle = Math.atan2(
          Math.sin(Math.atan2(q[0] - s.x, q[1] - s.z) - s.yaw),
          Math.cos(Math.atan2(q[0] - s.x, q[1] - s.z) - s.yaw),
        );
        steer = Math.max(-1, Math.min(1, angle * 12));
        throttle = s.speed < 8 ? 1 : 0;
        brake = s.speed > 9 ? 1 : 0;
      } else {
        const target = Math.min(
          15,
          Math.sqrt(16 * Math.max(0, pit.box_distance - s.pit_distance - 0.3)),
        );
        throttle = s.speed < target - 0.1 ? 1 : 0;
        brake = s.speed > target + 0.1 ? 1 : 0;
      }
      sim.step(throttle, brake, steer, 1 / 120);
    }
    return { failed: JSON.parse(sim.state_json()) };
  });
  expect(entry.failed).toBeUndefined();
  expect(entry.s.pit_phase).toBe(2);
  expect(entry.s.speed).toBe(0);
  expect(entry.audit.missing).toBe(0);
  expect(entry.audit.intrusions).toBe(0);
  await expect(page.locator("#pit-status")).toContainText("SERVICING");
  await page.screenshot({ path: "artifacts/pit-service.png" });
  const end = await page.evaluate(() => {
    const r = window.__apex.race;
    for (let i = 0; i < 20000; i++) {
      r.sim.step(1, 0, 0, 1 / 120);
      const s = JSON.parse(r.sim.state_json());
      if (!s.pit_active) {
        r.state = s;
        r.world.update(s, 1 / 60);
        r.updateHud(0);
        return s;
      }
    }
    return JSON.parse(r.sim.state_json());
  });
  expect(end.pit_stops).toBe(1);
  expect(end.pit_active).toBe(false);
  expect(end.tyre_condition).toBe(1);
  expect(end.fuel).toBeGreaterThan(0.98);
  expect(end.invalid).toBe(true);
});
test("photographic terrain and mapped tunnel canopy load without external runtime requests", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (
      new URL(r.url()).hostname !==
      new URL(test.info().project.use.baseURL || "http://127.0.0.1").hostname
    )
      external.push(r.url());
  });
  await setup(page, { track: 1 });
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  await page.waitForFunction(
    () => window.__apex.race.world.terrainMesh.material.map.image?.complete,
  );
  const result = await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    return {
      photo: r.world.photoArea.scene,
      roof: !!r.world.tunnelRoof,
      forest: r.world.sceneryAudit.trees.every((t) =>
        r.world.pitClearance.circleClear(t.x, t.z, t.radius),
      ),
      pit: r.world.auditPitSurface(),
    };
  });
  expect(result.photo).toContain("L2A");
  expect(result.roof).toBe(true);
  expect(external).toEqual([]);
  expect(result.forest).toBe(true);
  expect(result.pit.intrusions).toBe(0);
  expect(result.pit.missing).toBe(0);
});

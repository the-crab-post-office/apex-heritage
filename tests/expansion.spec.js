import { test, expect } from "@playwright/test";
async function start(page, track = 10) {
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
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
    timeout: 120000,
  });
  await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    cancelAnimationFrame(r.animation);
  });
}
for (const [track, name] of [
  [10, "Yas Marina"],
  [11, "Zandvoort"],
  [12, "Baku"],
])
  test(`${name} is selectable, renders its actual road and keeps modern substitution labels`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await start(page, track);
    const result = await page.evaluate(() => {
      const w = window.__apex.race.world;
      return {
        name: w.track.name,
        road: w.auditRoadSurface(23),
        reference: w.referenceAudit,
        details: w.config.details.label,
        barriers: w.config.venue.barriers.length,
        stands: w.config.venue.grandstands.length,
        bank: w.track.banking,
      };
    });
    expect(result.name).toBe(name);
    expect(result.details).toContain("modern-layout substitute");
    expect(result.barriers).toBeGreaterThan(500);
    expect(result.stands).toBeGreaterThanOrEqual(2);
    expect(result.road.missingRoad).toBe(0);
    expect(result.road.pitOverlayHits).toBe(0);
    expect(result.road.terrainIntrusions).toBe(0);
    expect(result.road.overlayIntrusions).toBe(0);
    expect(result.road.centerErrors).toBe(0);
    if (track === 11) {
      expect(result.bank[166]).toBeLessThan(-0.17);
      expect(result.bank[766]).toBeGreaterThan(0.32);
    } else expect(result.reference.facets).toBeGreaterThan(1000);
    expect(errors).toEqual([]);
  });
test("real keyboard brake overrides a held accelerator and stops instead of crawling forward", async ({
  page,
}) => {
  test.setTimeout(180000);
  await start(page, 2);
  await page.evaluate(() => {
    window.__apex.race.countdown = -1;
  });
  // Exercise the input route directly, then fixed-step the real WASM model.
  await page.keyboard.down("w");
  let v = await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    cancelAnimationFrame(r.animation);
    const input = r.input();
    for (let k = 0; k < 420; k++)
      r.sim.step(input.throttle, input.brake, 0, 1 / 120);
    return JSON.parse(r.sim.state_json()).speed;
  });
  expect(v).toBeGreaterThan(20);
  await page.keyboard.down("Space");
  const result = await page.evaluate(() => {
    const r = window.__apex.race;
    const input = r.input();
    const before = JSON.parse(r.sim.state_json()).speed;
    // Acceleration phase is not a fixed 100 km/h launch: allow 3.5 seconds
    // for the actual attained speed, without resetting position or speed.
    for (let k = 0; k < 420; k++)
      r.sim.step(input.throttle, input.brake, 0, 1 / 120);
    return {
      input: { throttle: input.throttle, brake: input.brake },
      before,
      state: JSON.parse(r.sim.state_json()),
    };
  });
  expect(result.input).toEqual({ throttle: 1, brake: 1 });
  expect(result.before).toBeGreaterThan(20);
  expect(result.state.speed).toBeLessThan(0.2);
  expect(result.state.throttle).toBe(0);
  expect(result.state.brake).toBe(1);
  await page.keyboard.up("Space");
  await page.keyboard.up("w");
});
test("new circuit report embeds six actual renders and filters offline at mobile width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/new-circuits.html");
  expect(
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((i) => i.decode()));
      return [...document.images].every(
        (i) => i.naturalWidth === 1000 && i.naturalHeight === 625,
      );
    }),
  ).toBe(true);
  await expect(page.locator("article")).toHaveCount(6);
  await page.locator('button[data-kind="az-2016"]').click();
  await expect(page.locator("article:visible")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("keyboard steering stays effective while the brake is held", async ({
  page,
}) => {
  test.setTimeout(180000);
  await start(page, 2);
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("Space");
  const result = await page.evaluate(() => {
    const r = window.__apex.race;
    const input = r.input();
    const Sim = r.sim.constructor;
    const run = (brake) => {
      const sim = new Sim(2, 3, 0, false, true);
      try {
        for (let k = 0; k < 300; k++) sim.step(1, 0, 0, 1 / 120);
        for (let k = 0; k < 18; k++) sim.step(0, brake, input.steer, 1 / 120);
        return JSON.parse(sim.state_json());
      } finally {
        sim.free();
      }
    };
    return {
      input: { brake: input.brake, steer: input.steer },
      coast: run(0),
      braking: run(input.brake),
    };
  });
  expect(result.input).toEqual({ brake: 1, steer: 1 });
  expect(result.braking.speed).toBeLessThan(result.coast.speed);
  const curvature = (s) => Math.abs(s.yaw_rate) / s.speed;
  expect(curvature(result.braking)).toBeGreaterThanOrEqual(
    curvature(result.coast) * 0.9,
  );
  await page.keyboard.up("Space");
  await page.keyboard.up("ArrowLeft");
});

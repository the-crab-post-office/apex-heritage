import { test, expect } from "@playwright/test";
import { openSetup, launchSession } from "../scripts/menu-navigation.mjs";
async function menu(page, config = {}) {
  await page.addInitScript(
    (c) =>
      localStorage.setItem(
        "apex-config",
        JSON.stringify({
          era: 3,
          track: 11,
          team: 0,
          quality: "low",
          sound: false,
          mode: "practice",
          ...c,
        }),
      ),
    config,
  );
  await page.goto("/");
  await page.waitForFunction(
    () => window.__showroom?.container.dataset.ready === "true",
    null,
    { timeout: 120000 },
  );
}
test("sketch layout, exact setup order, back/cancel and local profile are functional", async ({
  page,
}) => {
  test.setTimeout(180000);
  await menu(page);
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "home");
  await expect(page.locator(".menu-rail nav button")).toHaveText([
    "01 PLAY ↗",
    "02 GARAGE ↗",
    "03 PROFILE ↗",
    "04 CARS ↗",
  ]);
  await expect(page.locator("#showroom-canvas")).toBeVisible();
  await expect(page.locator("#start-race")).toBeHidden();
  await page.locator("#play-button").click();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "mode");
  await page.locator('[data-mode="time"]').click();
  await page.locator("#racing-line").uncheck();
  await page.locator("#setup-next").click();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "era");
  await page.locator('[data-era="4"]').click();
  await page.locator("#setup-next").click();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "track");
  await expect(page.locator(".track-card")).toHaveCount(13);
  await page.locator('[data-track="12"]').click();
  await page.locator("#setup-next").click();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "team");
  await page.locator("#team-select").selectOption("2");
  await expect(page.locator("#session-summary")).toContainText("2021 / Baku");
  await expect(page.locator("#start-race")).toBeVisible();
  await page.locator("#setup-back").click();
  await expect(page.locator('[data-track="12"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#setup-next").click();
  await expect(page.locator("#team-select")).toHaveValue("2");
  await page.locator("#setup-cancel").click();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "home");
  await page.locator('[data-nav="garage"]').click();
  await page.locator("#garage-settings").click();
  await expect(page.locator("#quality-select")).toBeVisible();
  await page.locator(".dialog-close").click();
  await page.locator('[data-nav="records"]').click();
  await page.locator("#driver-name").fill("Apex Driver");
  await page.locator('[data-nav="cars"]').click();
  await page.locator('[data-era="0"]').click();
  await expect(page.locator("#team-collection button")).toHaveCount(9);
  await page.reload();
  await page.locator('[data-nav="records"]').click();
  await expect(page.locator("#driver-name")).toHaveValue("Apex Driver");
});
test("loading masks a delayed engine; all five lights hold the real car before release; assist toggles", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await menu(page);
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route("**/*.wasm", async (route) => {
    await gate;
    await route.continue();
  });
  await openSetup(page, "team");
  await page.locator("#start-race").click();
  await expect(page.locator("#session-loading")).toBeVisible();
  await expect(page.locator("#loading-track")).toHaveText("Zandvoort");
  expect(await page.evaluate(() => Boolean(window.__apex?.race))).toBe(false);
  release();
  await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
    timeout: 180000,
  });
  await expect(page.locator("#session-loading")).toBeHidden();
  // Fixed-step the actual frame/input/simulation path, only suppress GPU work
  // between probes. Separate screenshot smoke observes real-time lights too.
  const result = await page.evaluate(() => {
    const r = window.__apex.race;
    cancelAnimationFrame(r.animation);
    const draw = r.world.update;
    r.world.update = () => {};
    r.countdown = r.startDuration;
    r.lastTime = 1000;
    r.keys.add("KeyW");
    const before = JSON.parse(r.sim.state_json()),
      counts = new Set();
    let time = 1000,
      held = true;
    while (r.countdown > 0) {
      time += 50;
      r.frame(time);
      cancelAnimationFrame(r.animation);
      counts.add(document.querySelectorAll(".lights-housing i.on").length);
      const s = JSON.parse(r.sim.state_json());
      if (
        s.speed !== before.speed ||
        s.x !== before.x ||
        s.z !== before.z ||
        s.elapsed !== before.elapsed
      )
        held = false;
    }
    const lightsOff =
      document.querySelectorAll(".lights-housing i.on").length === 0;
    for (let i = 0; i < 60; i++) {
      time += 50;
      r.frame(time);
      cancelAnimationFrame(r.animation);
    }
    r.keys.clear();
    r.world.update = draw;
    r.paused = true;
    draw.call(r.world, r.state, 0);
    return {
      held,
      counts: [...counts],
      lightsOff,
      speed: r.state.speed,
      line: r.world.racingLine.mesh.visible,
      finite: [
        ...r.world.racingLine.mesh.geometry.attributes.position.array,
      ].every(Number.isFinite),
    };
  });
  expect(result.held).toBe(true);
  expect(result.counts).toEqual(expect.arrayContaining([0, 1, 2, 3, 4, 5]));
  expect(result.lightsOff).toBe(true);
  expect(result.speed).toBeGreaterThan(5);
  expect(result.line).toBe(true);
  expect(result.finite).toBe(true);
  await page.locator("#racing-line-toggle").click();
  await expect(page.locator("#racing-line-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(
    await page.evaluate(() => window.__apex.race.world.racingLine.mesh.visible),
  ).toBe(false);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("apex-config")).racingLine,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
  await page.evaluate(() => document.querySelector("#exit-race").click());
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "home");
});
test("mobile menu and every setup step fit without horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await menu(page);
  for (const screen of ["home", "mode", "era", "track", "team"]) {
    if (screen === "mode") await page.locator("#play-button").click();
    else if (screen !== "home") await page.locator("#setup-next").click();
    await expect(page.locator("#app")).toHaveAttribute("data-screen", screen);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator("#team-select").selectOption("2");
  await expect(page.locator("#team-select")).toHaveValue("2");
});

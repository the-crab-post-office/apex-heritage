import { test, expect } from "@playwright/test";
import { launchSession } from "../scripts/menu-navigation.mjs";
test.use({ hasTouch: true });
async function start(page, era = 3) {
  await page.addInitScript(
    (era) =>
      localStorage.setItem(
        "apex-config",
        JSON.stringify({
          era,
          team: 0,
          track: 2,
          quality: "low",
          sound: false,
          mode: "practice",
          weather: "dry",
        }),
      ),
    era,
  );
  await page.goto("/");
  await launchSession(page);
  await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
    timeout: 120000,
  });
  await expect(page.locator("#session-loading")).toBeHidden({
    timeout: 120000,
  });
  await page.waitForFunction(
    () => window.__apex?.race?.animation !== undefined,
  );
}
const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
test("sketched HUD has real driving gauges, upper-right two-row timing, lower-left map and expandable secondary data", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const actual = await page.evaluate(() => {
    const r = window.__apex.race;
    r.countdown = -1;
    r.paused = true;
    cancelAnimationFrame(r.animation);
    // Real WASM fixed steps, not invented dashboard values. Separate integration
    // regressions cover keyboard input and the unchanged real-time start lights.
    for (let i = 0; i < 600; i++) r.sim.step(1, 0, 0, 1 / 120);
    r.state = JSON.parse(r.sim.state_json());
    r.world.update(r.state, 1 / 60);
    r.updateHud(performance.now());
    document.querySelector("#start-lights").hidden = true;
    return {
      speed: Math.round(r.state.speed * 3.6)
        .toString()
        .padStart(3, "0"),
      rpm: Math.round(r.state.rpm).toLocaleString("en-US"),
      gear: r.state.speed < 0.5 ? "N" : String(r.state.gear),
    };
  });
  await expect(page.locator("#hud-speed")).toHaveText(actual.speed);
  await expect(page.locator("#hud-rpm")).toHaveText(actual.rpm);
  await expect(page.locator("#hud-gear")).toHaveText(actual.gear);
  await expect(page.locator("#hud-drs")).toHaveText("DRS N/A");
  await expect(page.locator("#hud-drs")).toHaveAttribute(
    "data-active",
    "false",
  );
  await expect(page.locator("#hud-delta")).toHaveText("—.———");
  const timing = await page.locator(".timing-panel").boundingBox(),
    wheel = await page.locator(".wheel-hud").boundingBox(),
    map = await page.locator(".minimap-wrap").boundingBox();
  expect(timing.x).toBeGreaterThan(1000);
  expect(timing.y).toBeLessThan(40);
  expect(Math.abs(wheel.x + wheel.width / 2 - 720)).toBeLessThan(1);
  expect(wheel.y).toBeGreaterThan(600);
  expect(map.x).toBeLessThan(40);
  expect(overlaps(map, wheel)).toBe(false);
  expect(wheel.width).toBeGreaterThan(500);
  await expect(page.locator("#pit-practice")).toBeHidden();
  await page.screenshot({
    path: "artifacts/021-hud-desktop.jpg",
    type: "jpeg",
    quality: 83,
  });
  await page.locator("#hud-tools summary").click();
  await expect(page.locator("#pit-practice")).toBeVisible();
  await expect(page.locator("#hud-best")).toBeVisible();
  await expect(page.locator("#hud-build")).toContainText("0.16.0");
  await page.locator("#hud-tools summary").click();
  await page.locator("#hud-tools summary").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#hud-tools")).toHaveAttribute("open", "");
  expect(await page.evaluate(() => window.__apex.race.keys.has("Space"))).toBe(
    false,
  );
  await page.keyboard.press("Space");
  await expect(page.locator("#hud-tools")).not.toHaveAttribute("open", "");
  // Explicit synthetic timing fixtures exercise presentation, not a claimed driven lap.
  const fixture = await page.evaluate(() => {
    const r = window.__apex.race,
      s = r.state;
    r.lapDelta.reference = {
      time: 100,
      points: [
        { p: 0, t: 0 },
        { p: 1, t: 100 },
      ],
    };
    r.lapDelta.valid = true;
    r.state = { ...s, progress: 0.5, lap_time: 49, invalid: false };
    r.updateHud(performance.now());
    const ahead = {
      text: document.querySelector("#hud-delta").textContent,
      trend: document.querySelector("#hud-delta").dataset.trend,
    };
    r.state.lap_time = 51;
    r.updateHud(performance.now());
    const behind = {
      text: document.querySelector("#hud-delta").textContent,
      trend: document.querySelector("#hud-delta").dataset.trend,
    };
    r.state.invalid = true;
    r.updateHud(performance.now());
    const invalid = document.querySelector("#hud-delta").textContent;
    r.state = s;
    return { ahead, behind, invalid };
  });
  expect(fixture.ahead).toEqual({ text: "−1.000", trend: "ahead" });
  expect(fixture.behind).toEqual({ text: "+1.000", trend: "behind" });
  expect(fixture.invalid).toBe("—.———");
  expect(errors).toEqual([]);
});
test("portrait and landscape HUD fit without gauge/map/timing/touch overlaps; classic cars do not advertise DRS", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page, 0);
  await page.evaluate(() => {
    const r = window.__apex.race;
    r.countdown = -1;
    r.paused = true;
    cancelAnimationFrame(r.animation);
    document.querySelector("#start-lights").hidden = true;
  });
  await expect(page.locator("#hud-drs")).toHaveText("NO DRS");
  for (const [width, height, label] of [
    [390, 844, "portrait"],
    [844, 390, "landscape"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const wheel = await page.locator(".wheel-hud").boundingBox(),
      map = await page.locator(".minimap-wrap").boundingBox(),
      timing = await page.locator(".timing-panel").boundingBox(),
      touch = await page.locator("#touch-controls").boundingBox();
    for (const b of [wheel, map, timing]) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width + 1);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(height + 1);
    }
    expect(overlaps(wheel, map)).toBe(false);
    expect(overlaps(wheel, timing)).toBe(false);
    if (touch && width < 600) expect(overlaps(wheel, touch)).toBe(false);
    for (const button of await page.locator("#touch-controls button").all()) {
      const box = await button.boundingBox();
      if (box) {
        expect(overlaps(wheel, box)).toBe(false);
        expect(overlaps(map, box)).toBe(false);
      }
    }
    await page.screenshot({
      path: `artifacts/021-hud-${label}.jpg`,
      type: "jpeg",
      quality: 82,
    });
  }
});

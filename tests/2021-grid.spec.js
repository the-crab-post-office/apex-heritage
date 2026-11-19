import { launchSession, openSetup } from "../scripts/menu-navigation.mjs";
import { test, expect } from "@playwright/test";
test("2021 deep link selects the right team, drives through Rust and supports race cameras/audio", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex-config",
      JSON.stringify({
        track: 1,
        quality: "low",
        sound: true,
        weather: "dry",
        mode: "race",
      }),
    ),
  );
  await page.goto("/?season=2021&constructor=2021-red-bull");
  await expect(page.locator('[data-era="4"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#team-select option")).toHaveCount(10);
  await expect(page.locator("#showroom-model")).toHaveText("RB16B");
  await expect(page.locator("#showroom-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await launchSession(page);
  await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
    timeout: 90000,
  });
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__apex.race.state.speed > 6, null, {
    timeout: 45000,
  });
  await page.keyboard.up("w");
  const result = await page.evaluate(() => {
    let r = window.__apex.race,
      w = r.world;
    r.paused = true;
    cancelAnimationFrame(r.animation);
    return {
      era: r.config.era,
      team: w.player.userData.livery.id,
      profile: w.player.userData.detail.referenceProfile,
      wheels: w.player.userData.wheels.map((w) => w.mesh.position.toArray()),
      year: w.config.details.year,
      speed: r.state.speed,
      aiFinite:
        r.ai.length === 5 &&
        r.ai.every(
          (a) =>
            Number.isFinite(a.speed) &&
            a.mesh.position.toArray().every(Number.isFinite),
        ),
      materials: w.player.userData.materials.length,
    };
  });
  expect(result.era).toBe(4);
  expect(result.team).toBe("2021-red-bull");
  expect(result.year).toBe(2021);
  expect(result.profile).toBe("2021-flat-floor-13inch");
  expect(result.speed).toBeGreaterThan(6);
  expect(result.aiFinite).toBe(true);
  for (const p of result.wheels) expect(p.every(Number.isFinite)).toBe(true);
  await page.screenshot({ path: "artifacts/2021-monaco-driving.png" });
  expect(errors).toEqual([]);
});
test("five-era menu fits on mobile and preserves old 2023 saved selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex-config",
      JSON.stringify({ era: 3, team: 0, sound: false }),
    ),
  );
  await page.goto("/");
  await expect(page.locator('[data-era="3"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.locator(".era-choice strong").allTextContents()).toEqual([
    "1967",
    "1988",
    "2004",
    "2021",
    "2023",
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

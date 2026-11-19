import { launchSession, openSetup } from "../scripts/menu-navigation.mjs";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
const version = JSON.parse(fs.readFileSync("package.json")).version;
const setup = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "apex-config",
      JSON.stringify({
        era: 3,
        team: 0,
        track: 0,
        quality: "low",
        sound: false,
        mode: "practice",
        weather: "dry",
      }),
    );
    if (!localStorage.getItem("apex-camera-preferences-v1"))
      localStorage.setItem(
        "apex-camera-preferences-v1",
        JSON.stringify({
          schema: 1,
          selected: "cockpit",
          views: { cockpit: { fov: 88, distance: 1 } },
        }),
      );
  });
};
const running = async (page) => {
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  await expect(page.locator("#hud-build")).toContainText(`v${version}`);
  await expect(page.locator("#build-error")).toBeHidden();
  expect(new URL(page.url()).searchParams.has("apex-refresh")).toBe(false);
};
test("stale server identity refreshes once, resumes racing and preserves settings", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  let checks = 0;
  await page.route("**/version.json?check=*", async (route) => {
    checks++;
    if (checks === 1)
      await route.fulfill({
        json: { version: "0.10.0-preview.1", hash: "d934b07c" },
      });
    else await route.continue();
  });
  await page.goto("/");
  await launchSession(page);
  await running(page);
  expect(checks).toBe(2);
  expect(await page.evaluate(() => window.__apex.race.world.cameraMode)).toBe(
    1,
  );
  expect(
    await page.evaluate(() => window.__apex.race.world.cameraTuning.fov),
  ).toBe(88);
  await page.evaluate(() => {
    const r = window.__apex.race;
    r.countdown = -1;
    document.getElementById("race-message").textContent = "";
  });
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__apex.race.state.speed > 3, null, {
    timeout: 45000,
  });
  await page.keyboard.up("w");
  await page.screenshot({ path: "artifacts/fixed-build-racing.png" });
});
test("stale HTML is recovered without disabling the compatibility check", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  let documents = 0;
  await page.route("**/*", async (route) => {
    if (route.request().isNavigationRequest()) {
      documents++;
      const response = await route.fetch();
      let body = await response.text();
      if (documents === 1)
        body = body.replace(
          `name="apex-build" content="${version}"`,
          'name="apex-build" content="0.10.0-preview.1"',
        );
      await route.fulfill({ response, body });
    } else await route.continue();
  });
  await page.goto("/");
  await launchSession(page);
  await running(page);
  expect(documents).toBe(2);
});
test("a permanently mixed deployment stops after one reload and offers a working retry", async ({
  page,
}) => {
  test.setTimeout(120000);
  await setup(page);
  let checks = 0;
  await page.route("**/version.json?check=*", async (route) => {
    checks++;
    await route.fulfill({
      json: { version: "0.10.0-preview.1", hash: "d934b07c" },
    });
  });
  await page.goto("/");
  await launchSession(page);
  const retry = page.getByRole("button", {
    name: "Reload latest build",
    exact: true,
  });
  await expect(retry).toBeVisible({ timeout: 90000 });
  expect(checks).toBe(2);
  expect(await page.evaluate(() => Boolean(window.__apex?.race))).toBe(false);
  await retry.click();
  await expect.poll(() => checks, { timeout: 90000 }).toBe(3);
  await expect(retry).toBeVisible({ timeout: 90000 });
});
test("missing old hashed race chunks trigger bounded refresh and recover", async ({
  page,
}) => {
  test.setTimeout(180000);
  await setup(page);
  let attempts = 0;
  await page.route("**/assets/race-*.js", async (route) => {
    attempts++;
    if (attempts === 1) await route.abort();
    else await route.continue();
  });
  await page.goto("/");
  await launchSession(page);
  await running(page);
  expect(attempts).toBe(2);
});

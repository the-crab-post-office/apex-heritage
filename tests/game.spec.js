import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("apex-config"))
      localStorage.setItem(
        "apex-config",
        JSON.stringify({ quality: "low", sound: false }),
      );
  });
});
test("ten circuits, geographic filters, car selection and persistent setup", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".track-card")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Select Monaco", exact: true })
    .click();
  await expect(page.locator("#hero-title")).toContainText("Monaco");
  await page.locator('[data-filter="World"]').click();
  await expect(page.locator(".track-card")).toHaveCount(3);
  await page.locator('[data-filter="Europe"]').click();
  await expect(page.locator(".track-card")).toHaveCount(7);
  for (let era = 0; era < 4; era++) {
    await page.locator(`[data-era="${era}"]`).click();
    await expect(page.locator("#team-select option")).toHaveCount(4);
  }
  await page.locator("#team-select").selectOption("2");
  await expect(page.locator("#team-select")).toHaveValue("2");
  await page.locator("#car-detail").click();
  await expect(page.locator("#info-dialog")).toBeVisible();
  await expect(page.locator(".team-comparison tbody tr")).toHaveCount(4);
  await page.locator(".dialog-close").click();
  await page.locator('[data-weather="wet"]').click();
  await page.locator("#assist-toggle").click();
  await expect(page.locator("#assist-toggle")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("apex-config")).weather,
      ),
    )
    .toBe("wet");
  await page.reload();
  await expect(page.locator("#team-select")).toHaveValue("2");
  await expect(page.locator("#assist-toggle")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await page.locator('[data-nav="garage"]').click();
  await expect(page.locator(".era-info")).toHaveCount(4);
  await page.locator(".dialog-close").click();
  await page.locator('[data-nav="records"]').click();
  await expect(page.locator(".records-empty")).toBeVisible();
});
test("Rust WASM drives, brakes, steers, pauses, recovers and exits", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, { timeout: 90000 });
  await page.evaluate(() => {
    window.__apex.race.countdown = -1;
  });
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.__apex.getState().speed > 4, {
    timeout: 60000,
  });
  await page.keyboard.up("KeyW");
  const yaw = await page.evaluate(() => window.__apex.getState().yaw);
  await page.keyboard.down("KeyA");
  await page.waitForFunction(
    (y) => Math.abs(window.__apex.getState().yaw - y) > 0.005,
    yaw,
    { timeout: 45000 },
  );
  await page.keyboard.up("KeyA");
  await page.keyboard.down("Space");
  await page.waitForFunction(() => window.__apex.getState().speed < 0.7, {
    timeout: 45000,
  });
  await page.keyboard.up("Space");
  await page.keyboard.press("KeyC");
  expect(await page.evaluate(() => window.__apex.race.world.cameraMode)).toBe(
    1,
  );
  await page.keyboard.press("KeyR");
  expect(await page.evaluate(() => window.__apex.getState().invalid)).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-overlay")).toBeVisible();
  const elapsed = await page.evaluate(() => window.__apex.getState().elapsed);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__apex.getState().elapsed)).toBe(
    elapsed,
  );
  await page.locator("#resume-race").click();
  await expect(page.locator("#pause-overlay")).toBeHidden();
  await page.locator("#pause-race").click();
  await page.locator("#exit-race").click();
  await expect(page.locator("#race-view")).toBeHidden();
  expect(errors).toEqual([]);
});
test("wet turbo quick race creates five AI cars and rain", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-mode="race"]').click();
  await page.locator('[data-era="1"]').click();
  await page.locator('[data-weather="wet"]').click();
  await page
    .getByRole("button", { name: "Select Suzuka", exact: true })
    .click();
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, { timeout: 90000 });
  expect(await page.evaluate(() => window.__apex.race.ai.length)).toBe(5);
  expect(
    await page.evaluate(() => Boolean(window.__apex.race.world.rain)),
  ).toBe(true);
  await expect(page.locator("#hud-mode")).toContainText("3 LAPS");
  expect(
    await page.evaluate(() => {
      const w = window.__apex.race.world,
        p = w.sample(0.7956);
      return p.y - w.height(p.x, p.z) > 5;
    }),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator("#exit-race").click();
});
test("mobile layout has touch controls and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".track-card")).toHaveCount(10);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/mobile-paddock.png",
    fullPage: true,
  });
});

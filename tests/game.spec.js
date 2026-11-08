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
  await page.waitForFunction(
    () =>
      window.__apex.race.audio.available &&
      window.__apex.race.audio.context.state === "running",
    null,
    { timeout: 15000 },
  );
  await page.evaluate(() => {
    const a = window.__apex.race.audio;
    const analyser = a.context.createAnalyser();
    analyser.fftSize = 2048;
    a.node.connect(analyser);
    window.__testAnalyser = analyser;
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const a = window.__testAnalyser,
          s = new Float32Array(a.fftSize);
        a.getFloatTimeDomainData(s);
        return Math.max(...s.map(Math.abs));
      }),
    )
    .toBeGreaterThan(0.001);
  const roadState = await page.evaluate(() => {
    const r = window.__apex.race;
    return {
      y: r.state.y,
      grade: r.state.grade,
      pitch: r.state.pitch,
      visual: r.world.player.position.y,
      audioError: r.audio.error,
    };
  });
  expect(Number.isFinite(roadState.grade)).toBe(true);
  expect(roadState.y).toBeGreaterThan(30);
  expect(Math.abs(roadState.y - roadState.visual)).toBeLessThan(0.01);
  expect(roadState.audioError).toBeUndefined();
  await page.evaluate(() => {
    window.__testAnalyser.disconnect();
    delete window.__testAnalyser;
  });
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
  await page.waitForFunction(
    () => window.__apex.race.audio.telemetry?.voices.length === 6,
  );
  expect(
    await page.evaluate(() =>
      window.__apex.race.audio.telemetry.voices.every(
        (v) => Number.isFinite(v.rpm) && Math.abs(v.pan) <= 1,
      ),
    ),
  ).toBe(true);
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

test("elevation preview and master volume setting", async ({ page }) => {
  await page.goto("/");
  await page.locator("#view-circuit").click();
  await expect(page.locator(".elevation-chart")).toContainText("104 m");
  await expect(page.locator(".elevation-chart svg")).toHaveAttribute(
    "aria-label",
    /elevation profile/,
  );
  await page.locator(".dialog-close").click();
  await page.locator("#settings-button").click();
  await page.locator("#volume-slider").fill("35");
  await expect(page.locator("#volume-value")).toHaveText("35%");
  await page.locator(".dialog-close").click();
  await page.reload();
  await page.locator("#settings-button").click();
  await expect(page.locator("#volume-slider")).toHaveValue("35");
});

import { test, expect } from "@playwright/test";
test("all four detailed era cars render with isolated heads and additional showroom views", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#showroom-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  for (let era = 0; era < 4; era++) {
    await page.locator(`[data-era="${era}"]`).click();
    await page.locator("#team-select").selectOption("0");
    const result = await page.evaluate(async (e) => {
      const s = window.__showroom;
      await s.select(e, 0);
      s.controls.autoRotate = false;
      s.camera.position.set(5.4, 2.6, 7.2);
      s.camera.zoom = 1.15;
      s.camera.updateProjectionMatrix();
      s.controls.update();
      s.renderer.render(s.scene, s.camera);
      let heads = 0,
        missing = 0;
      s.car.traverse((o) => {
        if (o.userData.cameraHideHead) heads++;
        if (o.isMesh && !o.material) missing++;
      });
      return { heads, missing, components: s.car.userData.detail.components };
    }, era);
    expect(result.heads).toBe(2);
    expect(result.missing).toBe(0);
    expect(result.components).toContain("instrument binnacle");
    await page
      .locator("#showroom-canvas")
      .screenshot({ path: `artifacts/cars-finished-era-${era}.png` });
  }
  await page.locator('[data-camera="top"]').click();
  await page.locator('[data-camera="detail"]').click();
  expect(errors).toEqual([]);
});
test("eight race cameras support direct selection, keyboard cycling, head restoration and touch access", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex-config",
      JSON.stringify({
        era: 3,
        track: 0,
        team: 0,
        quality: "low",
        sound: false,
        mode: "practice",
        weather: "dry",
      }),
    ),
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    cancelAnimationFrame(r.animation);
  });
  const picker = page.getByRole("combobox", {
    name: "Race camera",
    exact: true,
  });
  await expect(picker.locator("option")).toHaveCount(8);
  const poses = [];
  for (let mode = 0; mode < 8; mode++) {
    await picker.selectOption(String(mode));
    const result = await page.evaluate(() => {
      const r = window.__apex.race,
        w = r.world;
      w.update(r.state, 1 / 60);
      const heads = [],
        ghosts = [];
      w.player.traverse((o) => {
        if (o.userData.cameraHideHead) heads.push(o.visible);
        if (o.userData.cameraGhost) ghosts.push(o.material.opacity);
      });
      return {
        mode: w.cameraMode,
        position: w.camera.position.toArray(),
        direction: w.camera
          .getWorldDirection(w.player.position.clone())
          .toArray(),
        heads,
        ghosts,
      };
    });
    expect(result.mode).toBe(mode);
    expect(result.position.every(Number.isFinite)).toBe(true);
    expect(result.heads).toEqual([mode !== 1, mode !== 1]);
    expect(result.ghosts.length).toBeGreaterThan(0);
    expect(result.ghosts.every((v) => v === (mode === 1 ? 0.22 : 1))).toBe(
      true,
    );
    poses.push(result.position.map((v) => v.toFixed(2)).join());
    if ([1, 3, 5, 7].includes(mode))
      await page
        .locator("#race-canvas")
        .screenshot({ path: `artifacts/camera-${mode}.png` });
  }
  expect(new Set(poses).size).toBe(8);
  await picker.blur();
  await page.keyboard.press("c");
  await expect(picker).toHaveValue("0");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(picker).toBeVisible();
  const box = await picker.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await picker.selectOption("3");
  await expect(picker).toHaveValue("3");
  expect(errors).toEqual([]);
});

import { test, expect } from "@playwright/test";
const configure = async (page) => {
  await page.addInitScript(() =>
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
    ),
  );
  await page.setViewportSize({ width: 1280, height: 800 });
};
const start = async (page) => {
  await page.goto("/");
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    r.countdown = -1;
    document.getElementById("race-message").textContent = "";
    cancelAnimationFrame(r.animation);
  });
};
const range = async (page, id, value) =>
  page.locator(id).evaluate((e, v) => {
    e.value = String(v);
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
const snapshot = async (page) =>
  page.evaluate(() => {
    const r = window.__apex.race;
    r.world.update(r.state, 1 / 60);
    return {
      mode: r.world.cameraMode,
      fov: r.world.camera.fov,
      position: r.world.camera.position.toArray(),
      look: { ...r.world.cameraLook },
      tuning: { ...r.world.cameraTuning },
    };
  });
test("FOV/distance, right-drag free-look, per-camera persistence, centering and mobile adjustments", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await configure(page);
  await start(page);
  await page
    .getByRole("button", { name: "Adjust camera", exact: true })
    .click();
  await expect(page.locator("#camera-settings")).toBeVisible();
  await range(page, "#camera-fov", 73);
  await range(page, "#camera-distance", 1.4);
  const base = await snapshot(page);
  await page.screenshot({ path: "artifacts/camera-controls-desktop.png" });
  expect(base.fov).toBe(73);
  expect(base.tuning.distance).toBe(1.4);
  await page.mouse.move(600, 350);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(650, 330, { steps: 3 });
  await page.mouse.up({ button: "right" });
  const look = await snapshot(page);
  expect(Math.abs(look.look.yaw)).toBeGreaterThan(0.1);
  expect(look.look.pitch).toBeGreaterThan(0);
  expect(look.position).toEqual(base.position);
  await page.getByRole("button", { name: "Center view", exact: true }).click();
  expect((await snapshot(page)).look).toEqual({ yaw: 0, pitch: 0 });
  await page
    .getByRole("combobox", { name: "Race camera", exact: true })
    .selectOption("1");
  await expect(page.locator("#camera-distance")).toBeDisabled();
  await range(page, "#camera-fov", 90);
  expect((await snapshot(page)).fov).toBe(90);
  await page
    .getByRole("combobox", { name: "Race camera", exact: true })
    .selectOption("0");
  await expect(page.locator("#camera-fov")).toHaveValue("73");
  await expect(page.locator("#camera-distance")).toHaveValue("1.4");
  await page
    .getByRole("combobox", { name: "Race camera", exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Look left", exact: true }).click();
  expect((await snapshot(page)).look.yaw).not.toBe(0);
  await start(page);
  expect((await snapshot(page)).mode).toBe(1);
  expect((await snapshot(page)).fov).toBe(90);
  expect((await snapshot(page)).look).toEqual({ yaw: 0, pitch: 0 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Adjust camera", exact: true })
    .click();
  await expect(page.locator("#camera-settings")).toBeVisible();
  const box = await page.locator("#camera-settings").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Look up", exact: true }).click();
  expect((await snapshot(page)).look.pitch).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/camera-controls-mobile.png" });
  await page
    .getByRole("button", { name: "Reset this camera", exact: true })
    .click();
  expect((await snapshot(page)).fov).toBe(76);
  await page
    .getByRole("button", { name: "Close camera settings", exact: true })
    .click();
  await expect(page.locator("#camera-settings")).toBeHidden();
  await page
    .getByRole("button", { name: "Adjust camera", exact: true })
    .click();
  await page.getByRole("button", { name: "Look left", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#camera-settings")).toBeHidden();
  expect(await page.evaluate(() => window.__apex.race.paused)).toBe(true);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__apex.race.paused)).toBe(false);
  expect(errors).toEqual([]);
});
test("blocked preference writes retain usable session controls with an explicit message", async ({
  page,
}) => {
  test.setTimeout(120000);
  await configure(page);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "apex-camera-preferences-v1")
        throw new Error("Storage blocked");
      return original.call(this, k, v);
    };
  });
  await start(page);
  await page
    .getByRole("button", { name: "Adjust camera", exact: true })
    .click();
  await range(page, "#camera-fov", 85);
  expect((await snapshot(page)).fov).toBe(85);
  await expect(page.locator("#camera-save-status")).toContainText(
    "Session only",
  );
});
test("race exit and re-entry remove old camera listeners", async ({ page }) => {
  test.setTimeout(180000);
  await configure(page);
  await start(page);
  await page.evaluate(() => {
    window.oldCameraControls = window.__apex.race.cameraControls;
  });
  await page.locator("#pause-race").click(); // race.paused was set by test: toggle to running
  await page.locator("#pause-race").click();
  await page.locator("#exit-race").click();
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race, null, {
    timeout: 90000,
  });
  await page.evaluate(() => {
    const r = window.__apex.race;
    r.paused = true;
    cancelAnimationFrame(r.animation);
  });
  await page
    .getByRole("button", { name: "Adjust camera", exact: true })
    .click();
  await range(page, "#camera-fov", 80);
  const old = await page.evaluate(
    () => window.oldCameraControls.views.chase?.fov ?? null,
  );
  expect(old).toBeNull();
  expect((await snapshot(page)).fov).toBe(80);
});

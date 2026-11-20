import { test, expect } from "@playwright/test";
import { openSetup } from "../scripts/menu-navigation.mjs";
async function ready(page) {
  await page.addInitScript(
    () =>
      !localStorage.getItem("apex-config") &&
      localStorage.setItem(
        "apex-config",
        JSON.stringify({
          era: 3,
          team: 0,
          track: 0,
          quality: "low",
          sound: false,
          mode: "practice",
        }),
      ),
  );
  await page.goto("/");
  await page.waitForFunction(
    () => window.__showroom?.container.dataset.ready === "true",
    null,
    { timeout: 120000 },
  );
}
test("cinematic selectors animate, slide with arrows/keys, show all 13 local credited photographs and rotate the selected car", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page.locator("#play-button").click();
  expect(
    await page
      .locator('section[data-screen="mode"]')
      .evaluate((e) => e.getAnimations().length),
  ).toBeGreaterThan(0);
  await openSetup(page, "track");
  await expect(page.locator("#track-photo")).toHaveJSProperty("complete", true);
  const photos = [];
  for (let i = 0; i < 13; i++) {
    await page.locator(`[data-track="${i}"]`).click();
    await expect
      .poll(() =>
        page
          .locator("#track-photo")
          .evaluate((e) => e.complete && e.naturalWidth > 0),
      )
      .toBe(true);
    photos.push(await page.locator("#track-photo").getAttribute("src"));
    await expect(page.locator("#track-photo-credit")).toHaveAttribute(
      "href",
      /commons.wikimedia.org/,
    );
  }
  expect(new Set(photos).size).toBe(13);
  await expect(page.locator("#track-next")).toBeDisabled();
  await page.locator("#track-previous").click();
  await expect(page.locator('[data-track="11"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-track="11"]').focus();
  await page.keyboard.press("Home");
  await expect(page.locator('[data-track="0"]')).toBeFocused();
  await page.locator("#track-next").click();
  await expect(page.locator('[data-track="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-track="0"]').click();
  await page.screenshot({
    path: "artifacts/020-track-desktop.jpg",
    type: "jpeg",
    quality: 82,
    fullPage: true,
    animations: "disabled",
  });
  await page.locator('[data-filter="World"]').click();
  await expect(page.locator("#track-grid button")).toHaveCount(5);
  await page.locator("#track-next").click();
  await expect(page.locator('[data-track="4"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-filter="all"]').click();
  await expect(page.locator("#track-grid button")).toHaveCount(13);
  await page.locator('[data-track="0"]').click();
  await page.locator("#setup-next").click();
  await expect(page.locator("#team-preview #showroom-canvas")).toBeVisible();
  expect(await page.evaluate(() => window.__showroom.controls.autoRotate)).toBe(
    true,
  );
  const before = await page.evaluate(() =>
    window.__showroom.camera.position.toArray(),
  );
  await page.waitForTimeout(700);
  const after = await page.evaluate(() =>
    window.__showroom.camera.position.toArray(),
  );
  expect(after).not.toEqual(before);
  await page.locator("#team-next").click();
  await expect(page.locator('[data-team="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#team-select")).toHaveValue("1");
  await page.locator('[data-team="1"]').focus();
  await page.keyboard.press("End");
  const last = page.locator("#team-collection button").last();
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.locator("#team-collection").evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(200);
  await page.keyboard.press("Home");
  await expect(page.locator('[data-team="0"]')).toBeFocused();
  await page.locator('[data-team="1"]').click();
  await page.waitForFunction(
    () => window.__showroom.container.dataset.ready === "true",
  );
  await page.screenshot({
    path: "artifacts/020-team-desktop.jpg",
    type: "jpeg",
    quality: 82,
    fullPage: true,
    animations: "disabled",
  });
  const box = await page.locator("#team-collection").boundingBox(),
    stage = await page.locator("#team-preview").boundingBox();
  expect(box.y).toBeGreaterThan(stage.y + stage.height - 1);
  await page.reload();
  await openSetup(page);
  await expect(page.locator("#team-select")).toHaveValue("1");
  expect(errors).toEqual([]);
});
test("mobile selectors contain horizontal scrolling inside the strips and respect reduced motion", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await openSetup(page, "track");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator('section[data-screen="track"]')
      .evaluate((e) => e.getAnimations().length),
  ).toBe(0);
  await page.locator("#track-next").click();
  await expect(page.locator('[data-track="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({
    path: "artifacts/020-track-mobile.jpg",
    type: "jpeg",
    quality: 80,
    fullPage: true,
  });
  await page.locator("#setup-next").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.__showroom.controls.autoRotate)).toBe(
    false,
  );
  await page.locator("#team-next").click();
  await expect(page.locator("#team-select")).toHaveValue("1");
  await page.waitForFunction(
    () => window.__showroom.container.dataset.ready === "true",
  );
  await page.screenshot({
    path: "artifacts/020-team-mobile.jpg",
    type: "jpeg",
    quality: 80,
    fullPage: true,
  });
});

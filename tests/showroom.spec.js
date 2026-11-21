import { test, expect } from "@playwright/test";
test("68 constructor liveries load; repeated changes release GPU resources", async ({
  page,
}) => {
  test.setTimeout(480000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#showroom-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const result = await page.evaluate(async () => {
    const s = window.__showroom;
    s.controls.autoRotate = false;
    // A small real WebGL target exercises allocations without spending minutes
    // rasterizing identical studio pixels in the software-GPU test runner.
    // Full-size visual captures are tested separately by capture-car-realism.
    cancelAnimationFrame(s.animation);
    s.renderer.setPixelRatio(1);
    s.renderer.setSize(320, 200, false);
    s.renderer.shadowMap.enabled = false;
    let n = 0,
      maxGeometry = 0,
      maxTextures = 0;
    for (let pass = 0; pass < 2; pass++)
      for (let e = 0; e < 6; e++)
        for (let i = 0; i < [9, 18, 10, 10, 10, 11][e]; i++) {
          await s.select(e, i);
          if (s.container.dataset.ready !== "true")
            throw new Error(`Atlas failed ${e}:${i}`);
          s.renderer.render(s.scene, s.camera);
          maxGeometry = Math.max(
            maxGeometry,
            s.renderer.info.memory.geometries,
          );
          maxTextures = Math.max(maxTextures, s.renderer.info.memory.textures);
          n++;
        }
    return { n, maxGeometry, maxTextures };
  });
  expect(result.n).toBe(136);
  expect(result.maxGeometry).toBeLessThan(65);
  expect(result.maxTextures).toBeLessThan(8);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.__showroom.dispose());
  await expect(page.locator("#showroom-canvas")).toHaveCount(0);
});
test("mobile sizing, reduced motion and hidden race view suspend studio rendering", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#showroom-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(await page.evaluate(() => window.__showroom.controls.autoRotate)).toBe(
    false,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.locator('[data-camera="side"]').click();
  await page.evaluate(() => {
    document.getElementById("race-view").hidden = false;
    window.__showroom.mark = window.__showroom.renderCount;
  });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => window.__showroom.renderCount - window.__showroom.mark,
    ),
  ).toBe(0);
});
test("failed atlas displays an explicit solid-colour fallback", async ({
  page,
}) => {
  await page.route("**/*2004-ferrari*.png", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#showroom-stage")).toHaveAttribute(
    "data-ready",
    "fallback",
  );
  await expect(page.locator("#showroom-status")).toHaveText(
    "LIVERY TEXTURE UNAVAILABLE",
  );
  const result = await page.evaluate(() => {
    let n = 0;
    window.__showroom.car.traverse((o) => {
      if (o.material?.userData.region) {
        if (o.material.map) throw new Error("Failed map retained");
        n++;
      }
    });
    return n;
  });
  expect(result).toBeGreaterThan(4);
});

import { test, expect } from "@playwright/test";
test("production tyre spin cannot tilt the steered axle, and all four tyres stay on their supports", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex-config",
      JSON.stringify({
        track: 2,
        quality: "low",
        sound: false,
        mode: "practice",
      }),
    ),
  );
  await page.goto("/?season=2021&constructor=2021-red-bull");
  await page.locator("#start-race").click();
  await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
    timeout: 90000,
  });
  const result = await page.evaluate(() => {
    const r = window.__apex.race,
      world = r.world;
    r.paused = true;
    cancelAnimationFrame(r.animation);
    const state = {
      ...r.state,
      speed: 22,
      steering: 1,
      pitch: 0,
      body_roll: 0,
    };
    let worstAxle = 0,
      worstSupport = 0,
      phaseMoved = false;
    // Camera updates are production code too; no substitute wheel builder.
    for (let frame = 0; frame < 40; frame++) {
      world.update(state, 1 / 30);
      world.player.updateMatrixWorld(true);
      for (const [i, wheel] of world.player.userData.wheels.entries()) {
        const hub = wheel.mesh.matrixWorld.elements,
          rotor = wheel.spin.matrixWorld.elements;
        worstAxle = Math.max(
          worstAxle,
          ...[0, 1, 2].map((k) => Math.abs(hub[k] - rotor[k])),
        );
        worstSupport = Math.max(
          worstSupport,
          Math.abs(
            wheel.mesh.getWorldPosition(world.player.position.clone()).y -
              wheel.radius -
              state.wheel_heights[i],
          ),
        );
        if (Math.abs(wheel.spin.rotation.x) > 0.1) phaseMoved = true;
        if (wheel.spin.parent !== wheel.mesh || wheel.mesh.rotation.x !== 0)
          throw Error("Steering/spin transforms coupled");
      }
    }
    return { worstAxle, worstSupport, phaseMoved };
  });
  expect(result.worstAxle).toBeLessThan(1e-6);
  expect(result.worstSupport).toBeLessThan(1e-4);
  expect(result.phaseMoved).toBe(true);
});

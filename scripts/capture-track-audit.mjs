import { launchSession } from "./menu-navigation.mjs";
import { chromium } from "playwright";
import fs from "node:fs";
const url = process.env.APEX_URL || "http://127.0.0.1:5186/";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() =>
  localStorage.setItem(
    "apex-config",
    JSON.stringify({
      era: 3,
      team: 0,
      quality: "high",
      racingLine: false,
      sound: false,
      mode: "practice",
      weather: "dry",
    }),
  ),
);
await page.goto(url);
await page.waitForFunction(
  () => window.__showroom?.container.dataset.ready === "true",
);
await page.evaluate(() => cancelAnimationFrame(window.__showroom.animation));
fs.mkdirSync("artifacts/track-captures", { recursive: true });
const cameras = [
  ["spa", 31, 85, 110, 90],
  ["monaco", 530, 65, 80, 40],
  ["monza", 98, 60, 85, 75],
  ["silverstone", 1080, 75, 95, 70],
  ["suzuka", 1045, 80, 100, 70],
  ["interlagos", 56, 75, 95, 75],
  ["imola", 790, 80, 110, 80],
  ["nurburgring", 130, 90, 130, 100],
  ["montreal", 0, 85, 100, 75],
  ["hockenheim", 419, 75, 95, 75],
];
const manifest = [];
try {
  for (const [track, camera] of cameras.entries()) {
    const [id, station, x, y, z] = camera;
    await page.evaluate(
      (track) => document.querySelector(`[data-track="${track}"]`).click(),
      track,
    );
    await launchSession(page);
    await page.waitForFunction(() => window.__apex?.race?.world?.player, null, {
      timeout: 180000,
    });
    const result = await page.evaluate(
      async ({ station, x, y, z }) => {
        const race = window.__apex.race,
          world = race.world;
        race.paused = true;
        cancelAnimationFrame(race.animation);
        const loaded = await Promise.all(world.surfaces.pending);
        if (loaded.some((ok) => !ok))
          throw Error("A production surface texture failed to load");
        const target = world.sample(station / world.track.points.length);
        world.camera.aspect = 900 / 560;
        world.camera.fov = 45;
        world.renderer.setPixelRatio(1);
        world.renderer.setSize(900, 560, false);
        world.camera.position.set(target.x + x, target.y + y, target.z + z);
        world.camera.lookAt(target.x, target.y, target.z);
        world.camera.updateProjectionMatrix();
        world.renderer.render(world.scene, world.camera);
        return {
          image: world.renderer.domElement
            .toDataURL("image/jpeg", 0.88)
            .split(",")[1],
          camera: {
            station,
            position: world.camera.position.toArray(),
            target: [target.x, target.y, target.z],
            fov: 45,
            quality: "high",
            size: [900, 560],
          },
          track: world.track.name,
        };
      },
      { station, x, y, z },
    );
    fs.writeFileSync(
      `artifacts/track-captures/${id}.jpg`,
      Buffer.from(result.image, "base64"),
    );
    manifest.push({ id, track: result.track, camera: result.camera });
    console.log("Captured production track", id, result.track);
    await page.evaluate(() => document.getElementById("exit-race").click());
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  fs.writeFileSync(
    "artifacts/track-captures/cameras.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
} finally {
  await browser.close();
}

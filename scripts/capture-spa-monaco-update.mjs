import { chromium } from "playwright";
import fs from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 625 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() =>
  localStorage.setItem(
    "apex-config",
    JSON.stringify({
      era: 3,
      quality: "high",
      sound: false,
      weather: "dry",
      mode: "practice",
    }),
  ),
);
const views = [
  {
    id: "la-source",
    track: 0,
    station: 31,
    offset: [75, 110, 85],
    title: "Spa · La Source",
  },
  {
    id: "les-combes",
    track: 0,
    station: 451,
    offset: [-95, 125, -100],
    title: "Spa · Les Combes, turns 5–6",
  },
  {
    id: "malmedy",
    track: 0,
    station: 489,
    offset: [-55, 70, 65],
    title: "Spa · Malmedy, turn 7",
  },
  {
    id: "bus-stop",
    track: 0,
    station: 1305,
    offset: [100, 120, 110],
    title: "Spa · Bus Stop chicane",
  },
  {
    id: "finish-straight",
    track: 0,
    station: 1380,
    offset: [100, 100, 25],
    fov: 58,
    title: "Spa · finish straight",
  },
  {
    id: "monaco-portal",
    track: 1,
    station: 307,
    fromStation: 298,
    eye: 2.5,
    targetHeight: 3.2,
    fov: 66,
    title: "Monaco · entrance under the hotel",
  },
  {
    id: "monaco-hotel",
    track: 1,
    station: 319,
    offset: [100, 90, -65],
    title: "Monaco · connected hotel above the tunnel",
  },
];
const captures = [];
try {
  await page.goto(process.env.APEX_URL || "http://127.0.0.1:5186/");
  await page.waitForFunction(
    () => window.__showroom?.container.dataset.ready === "true",
  );
  await page.evaluate(() => cancelAnimationFrame(window.__showroom.animation));
  fs.mkdirSync("artifacts/spa-monaco-captures", { recursive: true });
  for (const view of views) {
    await page.evaluate(
      (track) => document.querySelector(`[data-track="${track}"]`).click(),
      view.track,
    );
    await page.locator("#start-race").click();
    await page.waitForFunction(() => window.__apex?.race?.world?.player);
    const result = await page.evaluate(async (view) => {
      const race = window.__apex.race,
        w = race.world;
      race.paused = true;
      cancelAnimationFrame(race.animation);
      const loaded = await Promise.all(w.surfaces.pending);
      if (loaded.some((x) => !x)) throw Error("Production texture failed");
      const target = w.sample(view.station / w.track.points.length);
      w.camera.aspect = 1000 / 625;
      w.camera.fov = view.fov || 48;
      w.camera.updateProjectionMatrix();
      if (view.fromStation !== undefined) {
        const p = w.sample(view.fromStation / w.track.points.length);
        w.camera.position.set(p.x, p.y + view.eye, p.z);
      } else
        w.camera.position.set(
          target.x + view.offset[0],
          target.y + view.offset[1],
          target.z + view.offset[2],
        );
      w.camera.lookAt(target.x, target.y + (view.targetHeight || 0), target.z);
      w.renderer.setPixelRatio(1);
      w.renderer.setSize(1000, 625, false);
      w.renderer.render(w.scene, w.camera);
      return {
        image: w.renderer.domElement
          .toDataURL("image/jpeg", 0.87)
          .split(",")[1],
        camera: {
          position: w.camera.position.toArray(),
          target: [target.x, target.y + (view.targetHeight || 0), target.z],
          fov: w.camera.fov,
        },
        version: document.querySelector('meta[name="apex-build"]').content,
        reference: w.referenceAudit,
      };
    }, view);
    fs.writeFileSync(
      `artifacts/spa-monaco-captures/${view.id}.jpg`,
      Buffer.from(result.image, "base64"),
    );
    delete result.image;
    captures.push({ ...view, ...result });
    console.log("Captured", view.id, result.version);
    await page.evaluate(() => document.getElementById("exit-race").click());
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  fs.writeFileSync(
    "artifacts/spa-monaco-captures/cameras.json",
    JSON.stringify(captures, null, 2) + "\n",
  );
} finally {
  await browser.close();
}

import { launchSession } from "./menu-navigation.mjs";
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
      racingLine: false,
      sound: false,
      weather: "dry",
      mode: "practice",
    }),
  ),
);
const views = [
  {
    id: "yas-hotel",
    track: 10,
    station: 886,
    offset: [160, 130, -80],
    fov: 57,
    title: "Abu Dhabi \u00b7 hotel and marina",
  },
  {
    id: "yas-marsa",
    track: 10,
    station: 720,
    offset: [30, 170, 160],
    fov: 55,
    title: "Abu Dhabi \u00b7 sweeping Marsa corner",
  },
  {
    id: "zandvoort-hugenholtz",
    track: 11,
    station: 166,
    offset: [-65, 55, 60],
    fov: 56,
    title: "Zandvoort \u00b7 Hugenholtz banking",
  },
  {
    id: "zandvoort-luyendyk",
    track: 11,
    station: 766,
    offset: [-50, 65, 95],
    fov: 58,
    title: "Zandvoort \u00b7 Arie Luyendyk banking",
  },
  {
    id: "baku-castle",
    track: 12,
    station: 531,
    fromStation: 520,
    eye: 3.2,
    targetHeight: 5,
    fov: 65,
    title: "Baku \u00b7 rising castle corridor",
  },
  {
    id: "baku-waterfront",
    track: 12,
    station: 0,
    offset: [60, 170, -180],
    fov: 62,
    title: "Baku \u00b7 start straight and Caspian context",
  },
];
const captures = [];
try {
  await page.goto(process.env.APEX_URL || "http://127.0.0.1:5186/");
  await page.waitForFunction(
    () => window.__showroom?.container.dataset.ready === "true",
  );
  await page.evaluate(() => cancelAnimationFrame(window.__showroom.animation));
  fs.mkdirSync("artifacts/expansion-captures", { recursive: true });
  for (const view of views) {
    await page.evaluate(
      (track) => document.querySelector(`[data-track="${track}"]`).click(),
      view.track,
    );
    await launchSession(page);
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
      `artifacts/expansion-captures/${view.id}.jpg`,
      Buffer.from(result.image, "base64"),
    );
    delete result.image;
    captures.push({ ...view, ...result });
    console.log("Captured", view.id, result.version);
    await page.evaluate(() => document.getElementById("exit-race").click());
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  fs.writeFileSync(
    "artifacts/expansion-captures/cameras.json",
    JSON.stringify(captures, null, 2) + "\n",
  );
} finally {
  await browser.close();
}

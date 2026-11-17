import { chromium } from "playwright";
import fs from "node:fs";
const b = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(process.env.APEX_URL || "http://127.0.0.1:5186/");
await p.waitForFunction(
  () => window.__showroom?.container.dataset.ready === "true",
  null,
  { timeout: 60000 },
);
fs.mkdirSync("artifacts/car-captures", { recursive: true });
for (const [era, team, id] of [
  ...JSON.parse(fs.readFileSync("data/roster.json")).eras[4].teams.map(
    (t, i) => [4, i, t.id],
  ),
  [3, 0, "2023-red-bull"],
  [3, 1, "2023-mercedes"],
  [0, 0, "1967-lotus"],
  [1, 0, "1988-mclaren"],
  [2, 0, "2004-ferrari"],
]) {
  const image = await p.evaluate(
    async ({ era, team }) => {
      const s = window.__showroom;
      s.inView = false;
      s.controls.autoRotate = false;
      await s.select(era, team);
      s.car.rotation.set(0, 0, 0);
      s.car.position.set(0, 0, 0);
      s.renderer.setPixelRatio(1);
      s.renderer.setSize(1200, 675, false);
      s.renderer.setClearColor("#b4bec6", 1);
      s.scene.background = null;
      s.camera.aspect = 1200 / 675;
      s.camera.fov = 28;
      s.camera.zoom = 1;
      s.camera.position.set(8.7, 2.7, 0.01);
      s.camera.lookAt(0, 0.52, 0);
      s.camera.updateProjectionMatrix();
      s.renderer.render(s.scene, s.camera);
      return s.renderer.domElement.toDataURL("image/jpeg", 0.9).split(",")[1];
    },
    { era, team },
  );
  fs.writeFileSync(
    `artifacts/car-captures/${id}.jpg`,
    Buffer.from(image, "base64"),
  );
  console.log("Captured", id);
}
if (errors.length) throw Error(JSON.stringify(errors));
await b.close();

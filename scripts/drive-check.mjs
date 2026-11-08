import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on("pageerror", (e) => console.log("PAGE ERROR", e));
await page.addInitScript(() =>
  localStorage.setItem(
    "apex-config",
    JSON.stringify({ quality: "low", sound: false }),
  ),
);
await page.goto("http://127.0.0.1:5173");
await page.locator("#start-race").click();
await page.waitForFunction(() => window.__apex?.race);
console.log("READY");
await page.waitForFunction(() => window.__apex.race.countdown <= 0, {
  timeout: 90000,
});
console.log("COUNTDOWN DONE");
await page.keyboard.down("KeyW");
await page.waitForFunction(() => window.__apex.getState().speed > 4, {
  timeout: 45000,
});
console.log("ACCEL", await page.evaluate(() => window.__apex.getState()));
await page.keyboard.up("KeyW");
await page.keyboard.down("Space");
await page.waitForFunction(() => window.__apex.getState().speed < 1, {
  timeout: 45000,
});
await page.keyboard.up("Space");
console.log("BRAKE OK");
await page.keyboard.press("KeyC");
console.log(
  "CAMERA",
  await page.evaluate(() => window.__apex.race.world.cameraMode),
);
await page.keyboard.press("KeyR");
console.log("RECOVER", await page.evaluate(() => window.__apex.getState()));
await page.keyboard.press("Escape");
console.log("PAUSED", await page.evaluate(() => window.__apex.race.paused));
await page.screenshot({ path: "artifacts/drive-check.png" });
await browser.close();

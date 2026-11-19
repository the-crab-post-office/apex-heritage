// Shared automation helper: use the same visible setup route as the player.
export async function openSetup(page, destination = "team") {
  const order = ["mode", "era", "track", "team"];
  let screen = await page.locator("#app").getAttribute("data-screen");
  if (!order.includes(screen)) {
    await page.locator('[data-nav="drive"]').click();
    screen = "mode";
  }
  while (order.indexOf(screen) > order.indexOf(destination)) {
    await page.locator("#setup-back").click();
    screen = await page.locator("#app").getAttribute("data-screen");
  }
  while (order.indexOf(screen) < order.indexOf(destination)) {
    await page.locator("#setup-next").click();
    screen = await page.locator("#app").getAttribute("data-screen");
  }
}
export async function launchSession(page) {
  await openSetup(page, "team");
  await page.locator("#start-race").click();
}

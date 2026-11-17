import { test, expect } from "@playwright/test";

test("self-contained comparison decodes all twenty images and filters teams offline", async ({
  page,
}) => {
  const external = [];
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request
        .url()
        .startsWith(
          new URL(process.env.APEX_URL || "http://127.0.0.1:5173").origin,
        )
    )
      external.push(request.url());
  });
  await page.goto("/car-comparison.html");
  await expect(page.locator("article.car")).toHaveCount(10);
  const images = await page.evaluate(async () => {
    const images = [...document.images];
    await Promise.all(
      images.map(async (image) => {
        image.loading = "eager";
        await image.decode();
      }),
    );
    return images.map((image) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
  });
  expect(images).toHaveLength(20);
  expect(
    images.every((image) => image.width >= 960 && image.height >= 540),
  ).toBe(true);
  await page.locator("#team").selectOption("2021-red-bull");
  await expect(page.locator("article.car:visible")).toHaveCount(1);
  await expect(page.locator("#count")).toHaveText("1 comparison");
  await expect(page.locator("article.car:visible .drive")).toHaveAttribute(
    "href",
    /season=2021&constructor=2021-red-bull/,
  );
  await page.locator("#team").selectOption("all");
  await page.locator("#search").fill("SF21");
  await expect(page.locator("article.car:visible")).toHaveAttribute(
    "id",
    "2021-ferrari",
  );
  expect(external).toEqual([]);
});

test("comparison pairs stack without overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/car-comparison.html");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const figures = page.locator("article.car").first().locator("figure");
  const photo = await figures.nth(0).boundingBox();
  const render = await figures.nth(1).boundingBox();
  expect(render.y).toBeGreaterThan(photo.y + photo.height - 2);
});

test("broad audit embeds 30 valid images, source credits and track/car filters", async ({
  page,
}) => {
  await page.goto("/photo-accuracy.html");
  await expect(page.locator("article")).toHaveCount(15);
  const images = await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map(async (image) => {
        image.loading = "eager";
        await image.decode();
      }),
    );
    return [...document.images].map((image) => [
      image.naturalWidth,
      image.naturalHeight,
    ]);
  });
  expect(images).toHaveLength(30);
  expect(images.every(([width, height]) => width >= 800 && height >= 150)).toBe(
    true,
  );
  await page.locator('button[data-kind="track"]').click();
  await expect(page.locator("article:visible")).toHaveCount(10);
  await page.locator('button[data-kind="car"]').click();
  await expect(page.locator("article:visible")).toHaveCount(5);
  await expect(page.locator("#count")).toHaveText("5 reviews");
  await expect(
    page.locator('[id="1988"] a[href*="creativecommons.org"]'),
  ).toHaveText("CC BY-SA 4.0");
});

test("broad audit stacks on a 390 pixel screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/photo-accuracy.html");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const figures = page.locator("article").first().locator("figure");
  const source = await figures.nth(0).boundingBox(),
    game = await figures.nth(1).boundingBox();
  expect(game.y).toBeGreaterThanOrEqual(source.y + source.height - 1);
});

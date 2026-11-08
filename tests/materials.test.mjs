import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const assets = [
  "Grass004",
  "Gravel001",
  "Concrete023",
  "Bricks001",
  "Asphalt012",
];
function dimensions(b) {
  for (let p = 2; p < b.length - 9;) {
    if (b[p] !== 255) {
      p++;
      continue;
    }
    const marker = b[p + 1];
    if ([0xc0, 0xc1, 0xc2].includes(marker))
      return [b.readUInt16BE(p + 7), b.readUInt16BE(p + 5)];
    if (marker === 0xd8 || marker === 0xd9) {
      p += 2;
      continue;
    }
    p += 2 + b.readUInt16BE(p + 2);
  }
  throw Error("missing JPEG frame");
}
for (const asset of assets)
  test(`${asset}: real local 1K colour/normal and available roughness maps`, () => {
    for (const channel of asset === "Gravel001"
      ? ["Color", "NormalGL"]
      : ["Color", "NormalGL", "Roughness"]) {
      const b = fs.readFileSync(
        new URL(
          `../web/assets/materials/${asset}_1K-JPG_${channel}.jpg`,
          import.meta.url,
        ),
      );
      assert.equal(b[0], 255);
      assert.equal(b[1], 216);
      const [width, height] = dimensions(b);
      assert.equal(width, 1024);
      assert.ok(height >= 640 && height <= 1024);
      assert.ok(b.length > 20000 && b.length < 500000);
    }
    const notice = fs.readFileSync(
      new URL("../data/MATERIALS-NOTICE.md", import.meta.url),
      "utf8",
    );
    assert.ok(notice.includes(asset) && notice.includes("CC0"));
  });

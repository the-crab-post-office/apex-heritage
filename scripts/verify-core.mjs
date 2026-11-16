import fs from "node:fs";
import * as Core from "../web/wasm/apex.js";
const version = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url)),
).version;
let hash = 0x811c9dc5;
for (const byte of fs.readFileSync(
  new URL("../data/tracks.json", import.meta.url),
))
  hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
hash = hash.toString(16).padStart(8, "0");
await Core.default({
  module_or_path: fs.readFileSync(
    new URL("../web/wasm/apex_bg.wasm", import.meta.url),
  ),
});
if (Core.build_version() !== version || Core.track_data_hash() !== hash) {
  throw new Error(
    `Refusing to publish mixed build: package ${version}/${hash}, WASM ${Core.build_version()}/${Core.track_data_hash()}. Run bash scripts/build-web.sh.`,
  );
}
console.log(`Verified WASM ${version} / ${hash}`);

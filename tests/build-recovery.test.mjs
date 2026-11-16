import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import config from "../vite.config.js";
import {
  freshBuildURL,
  shouldResumeRace,
  cleanBuildURL,
} from "../web/build-recovery.js";
test("a stale tab gets one cache-busting reload and resumes the requested race", () => {
  const next = freshBuildURL("https://game.example/?track=spa#garage", {
    automatic: true,
    resume: true,
    now: 123,
  });
  const u = new URL(next);
  assert.equal(u.searchParams.get("track"), "spa");
  assert.equal(u.hash, "#garage");
  assert.equal(u.searchParams.get("apex-refresh"), "123");
  assert.equal(shouldResumeRace(next), true);
  assert.equal(freshBuildURL(next, { automatic: true, now: 124 }), null);
});
test("manual reload remains available after automatic recovery is exhausted", () => {
  const next = freshBuildURL("https://game.example/?apex-refresh=1", {
    now: 2,
  });
  assert.equal(new URL(next).searchParams.get("apex-refresh"), "2");
  assert.equal(shouldResumeRace(next), false);
});
test("successful startup removes only internal recovery parameters", () => {
  assert.equal(
    cleanBuildURL(
      "https://game.example/?track=spa&apex-refresh=1&apex-resume=1#view",
    ),
    "https://game.example/?track=spa#view",
  );
});
test("HTML, CSS and JS build identity derive from the owned package version", () => {
  const version = JSON.parse(fs.readFileSync("package.json")).version;
  assert.ok(
    fs.readFileSync("Cargo.toml", "utf8").includes(`version = "${version}"`),
  );
  const plugin = config.plugins.find(
    (p) => p.name === "consistent-build-identity",
  );
  const html = plugin.transformIndexHtml(
    fs.readFileSync("web/index.html", "utf8"),
  );
  assert.ok(html.includes(`content="${version}"`));
  assert.ok(!html.includes("__APEX_VERSION__"));
  const css = plugin.transform(
    fs.readFileSync("web/style.css", "utf8"),
    "/project/web/style.css",
  );
  assert.ok(css.includes(`--apex-build: "${version}"`));
  assert.ok(!css.includes("__APEX_VERSION__"));
  assert.ok(config.build.outDir.includes("staging-site"));
});

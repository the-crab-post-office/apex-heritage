import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import config from "../vite.config.js";
test("static game supports both a domain root and GitHub project Pages", () => {
  assert.equal(config.base, "./");
  const race = fs.readFileSync("web/race.js", "utf8");
  assert.ok(race.includes("fetch(`./version.json?check="));
  for (const base of [
    "https://example.test/",
    "https://example.test/apex-heritage/",
  ])
    assert.equal(
      new URL("./version.json", base).pathname,
      new URL(base).pathname + "version.json",
    );
  assert.ok(
    !fs.readFileSync("web/main.js", "utf8").includes('href="/licenses/'),
  );
});

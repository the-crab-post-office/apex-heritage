import test from "node:test";
import assert from "node:assert/strict";
import { assertCompatibleBuild } from "../web/build-check.js";
const good = {
  version: "0.4.0",
  hash: "abc12345",
  htmlVersion: "0.4.0",
  cssVersion: "0.4.0",
  coreVersion: "0.4.0",
  serverVersion: "0.4.0",
  coreHash: "abc12345",
  serverHash: "abc12345",
};
test("all build parts agree before constructing a race", () =>
  assert.deepEqual(assertCompatibleBuild(good), {
    version: "0.4.0",
    hash: "abc12345",
  }));
for (const key of [
  "htmlVersion",
  "cssVersion",
  "coreVersion",
  "serverVersion",
  "coreHash",
  "serverHash",
])
  test(`rejects stale or missing ${key}`, () => {
    for (const value of ["outdated", undefined])
      assert.throws(() => assertCompatibleBuild({ ...good, [key]: value }), {
        code: "APEX_BUILD_MISMATCH",
      });
  });

import test from "node:test";
import assert from "node:assert/strict";
import { assertCompatibleBuild } from "../web/build-check.js";
const good = {
  version: "0.3.2",
  hash: "abc12345",
  htmlVersion: "0.3.2",
  cssVersion: "0.3.2",
  coreVersion: "0.3.2",
  serverVersion: "0.3.2",
  coreHash: "abc12345",
  serverHash: "abc12345",
};
test("all build parts agree before constructing a race", () =>
  assert.deepEqual(assertCompatibleBuild(good), {
    version: "0.3.2",
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

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  nextSetupScreen,
  previousSetupScreen,
  SETUP_STEPS,
} from "../web/menu-flow.js";
import {
  startSequence,
  startDuration,
  LIGHT_INTERVAL,
} from "../web/start-sequence.js";
import { racingGuide, guideColour } from "../web/racing-guide.js";
import { roadPoint } from "../web/road-surface.js";
const tracks = JSON.parse(fs.readFileSync("data/tracks.json"));
test("setup has exactly the requested four ordered steps, with reversible back navigation", () => {
  assert.deepEqual(SETUP_STEPS, ["mode", "era", "track", "team"]);
  for (let i = 0; i < 3; i++) {
    assert.equal(nextSetupScreen(SETUP_STEPS[i]), SETUP_STEPS[i + 1]);
    assert.equal(previousSetupScreen(SETUP_STEPS[i + 1]), SETUP_STEPS[i]);
  }
  assert.equal(previousSetupScreen("mode"), "home");
  assert.equal(nextSetupScreen("team"), "team");
});
test("five individual red lights accumulate, hold together and go out together", () => {
  for (const random of [0, 0.5, 1]) {
    const total = startDuration(random);
    assert.ok(total >= 4.5 && total <= 6);
    for (let count = 0; count <= 5; count++) {
      const state = startSequence(total - count * LIGHT_INTERVAL, total);
      assert.equal(state.lit, count);
      assert.equal(state.released, false);
    }
    assert.equal(startSequence(0.001, total).lit, 5);
    assert.deepEqual(startSequence(0, total), {
      released: true,
      lit: 0,
      label: "LIGHTS OUT — GO",
    });
    assert.equal(startSequence(-1, total).lit, 0);
  }
});
test("all circuits and eras have finite, closed-loop braking envelopes; wet guidance is slower", () => {
  for (const t of tracks)
    for (let era = 0; era < 5; era++) {
      const dry = racingGuide(t, era),
        wet = racingGuide(t, era, true),
        n = t.points.length;
      assert.equal(dry.targets.length, n);
      for (let i = 0; i < n; i++) {
        assert.ok(Number.isFinite(dry.targets[i]) && dry.targets[i] >= 9);
        assert.ok(wet.targets[i] <= dry.targets[i] + 1e-10);
        assert.ok(
          dry.targets[i] ** 2 <=
            dry.targets[(i + 1) % n] ** 2 +
              2 * dry.decel * dry.distances[i] +
              1e-7,
        );
      }
    }
});
test("line colours distinguish acceleration, lifting and braking without automatic steering", () => {
  assert.deepEqual(guideColour(20, 40, 40), [0.16, 0.95, 0.34]);
  assert.deepEqual(guideColour(40, 40, 40), [1, 0.64, 0.04]);
  assert.deepEqual(guideColour(50, 40, 40), [1, 0.1, 0.12]);
  assert.deepEqual(guideColour(15, 40, 38), [1, 0.1, 0.12]);
});
test("racing guide remains within pavement and follows authored bridge/tunnel/bank heights", () => {
  for (const t of tracks)
    for (let i = 0; i < t.points.length; i += 13)
      for (const offset of [-0.2, 0.2]) {
        const p = roadPoint(t, i, offset, 0.095);
        assert.ok(p.every(Number.isFinite));
        assert.ok(
          Math.abs(
            Math.hypot(p[0] - t.points[i][0], p[2] - t.points[i][1]) - 0.2,
          ) < 1e-8,
        );
        assert.ok(
          Math.abs(
            p[1] - (t.heights[i] + 0.095 + offset * (t.banking?.[i] || 0)),
          ) < 1e-8,
        );
        assert.ok(0.2 < t.width / 2);
      }
});

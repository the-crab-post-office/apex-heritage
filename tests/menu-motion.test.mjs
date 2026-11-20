import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  revealMenu,
  centerSelection,
  wireCarousel,
} from "../web/menu-motion.js";
globalThis.matchMedia = () => ({ matches: false });
test("menu entrance cancels superseded animations, reverses with navigation, and disables motion when requested", () => {
  let cancelled = 0,
    frames = null;
  const e = {
    getAnimations: () => [{ cancel: () => cancelled++ }],
    animate: (f) => {
      frames = f;
    },
  };
  revealMenu(e, -1);
  assert.equal(cancelled, 1);
  assert.match(frames[0].transform, /-28px/);
  frames = null;
  globalThis.matchMedia = () => ({ matches: true });
  revealMenu(e);
  assert.equal(cancelled, 2);
  assert.equal(frames, null);
  globalThis.matchMedia = () => ({ matches: false });
});
test("carousel centering scrolls only the strip, never the document", () => {
  let result;
  const strip = {
    scrollLeft: 200,
    getBoundingClientRect: () => ({ left: 100, width: 400 }),
    querySelector: () => ({
      getBoundingClientRect: () => ({ left: 450, width: 100 }),
    }),
    scrollTo: (o) => (result = o),
  };
  centerSelection(strip);
  assert.equal(result.left, 400);
  assert.equal(result.behavior, "smooth");
  centerSelection(strip, false);
  assert.equal(result.behavior, "instant");
});
test("carousel arrows, Home/End and horizontal keys select and retain focus without wrapping at the edges", () => {
  let index = 0,
    focused = -1,
    keydown;
  const list = Array.from({ length: 3 }, (_, i) => ({
    getAttribute: () => String(i === index),
    click: () => (index = i),
    focus: () => (focused = i),
  }));
  const strip = {
    scrollLeft: 0,
    querySelectorAll: () => list,
    querySelector: () => ({
      ...list[index],
      getBoundingClientRect: () => ({ left: 0, width: 100 }),
    }),
    getBoundingClientRect: () => ({ left: 0, width: 200 }),
    scrollTo: () => {},
    addEventListener: (n, f) => (keydown = f),
  };
  const prev = {},
    next = {},
    sync = wireCarousel(strip, prev, next);
  sync();
  assert.equal(prev.disabled, true);
  next.onclick();
  assert.equal(index, 1);
  sync();
  assert.equal(prev.disabled, false);
  keydown({ key: "End", preventDefault() {} });
  assert.equal(index, 2);
  assert.equal(focused, 2);
  sync();
  assert.equal(next.disabled, true);
  next.onclick();
  assert.equal(index, 2);
  keydown({ key: "Home", preventDefault() {} });
  assert.equal(index, 0);
  prev.onclick();
  assert.equal(index, 0);
  keydown({ key: "ArrowRight", preventDefault() {} });
  assert.equal(index, 1);
  keydown({ key: "ArrowLeft", preventDefault() {} });
  assert.equal(index, 0);
});
test("all thirteen circuit preview photos are bundled, individually credited, licensed and checksum verified", () => {
  const dir = new URL("../web/assets/track-photos/", import.meta.url),
    credits = JSON.parse(fs.readFileSync(new URL("credits.json", dir)));
  assert.equal(credits.length, 13);
  assert.equal(new Set(credits.map((c) => c.id)).size, 13);
  for (const c of credits) {
    const bytes = fs.readFileSync(new URL(c.id + ".jpg", dir));
    assert.equal(bytes[0], 255);
    assert.equal(bytes[1], 216);
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      c.sha256,
    );
    assert.ok(c.author);
    assert.match(c.source_page, /commons.wikimedia.org/);
    assert.match(c.license, /^CC/);
    assert.match(c.license_url, /creativecommons.org/);
    assert.match(c.changes, /cropping/);
  }
});

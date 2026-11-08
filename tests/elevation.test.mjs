import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ElevationField,
  terrainGridHeight,
  profileAt,
} from "../web/elevation.js";
const tracks = JSON.parse(
  fs.readFileSync(new URL("../data/tracks.json", import.meta.url)),
);
test("terrain grid is bilinear in WORLD coordinates, not progress", () => {
  const t = {
    terrain: {
      x0: 0,
      z0: 0,
      dx: 10,
      dz: 20,
      nx: 2,
      nz: 2,
      heights: [0, 10, 20, 30],
    },
  };
  assert.equal(terrainGridHeight(t, 5, 10), 15);
});
for (const track of tracks)
  test(`${track.name}: georeferenced terrain, road bed and closed seam`, () => {
    const field = new ElevationField(track),
      g = track.terrain;
    assert.ok(g);
    assert.equal(g.heights.length, g.nx * g.nz);
    assert.ok(track.elevation_source.includes("Copernicus"));
    assert.equal(track.profile_offset, undefined);
    for (let i = 0; i < track.points.length; i += 17) {
      const [x, z] = track.points[i];
      assert.ok(Math.abs(field.height(x, z) - track.ground_heights[i]) < 0.01);
      assert.ok(
        Math.abs(profileAt(track, i / track.points.length) - track.heights[i]) <
          0.001,
      );
    }
    // In the far field, a real two-dimensional height grid replaces the old
    // extrusion of the closest piece of race track.
    const x = g.x0 + 5,
      z = g.z0 + 5;
    assert.ok(
      Math.abs(field.height(x, z) - terrainGridHeight(track, x, z)) < 0.001,
    );
    assert.ok(
      Math.abs(profileAt(track, 0) - profileAt(track, 1 - 1e-9)) < 0.001,
    );
  });
test("Monaco and Suzuka road structures cannot be read straight from DSM rooftops", () => {
  const mc = tracks[1],
    tunnel = mc.road_corrections.find((c) => c.type === "tunnel");
  const middle = Math.round((tunnel.start_index + tunnel.end_index) / 2),
    p = mc.points[middle];
  assert.ok(terrainGridHeight(mc, ...p) - mc.heights[middle] > 8);
  const jp = tracks[4],
    bridge = jp.road_corrections.find((c) => c.type === "bridge");
  assert.ok(
    jp.heights[bridge.upper_index] - jp.heights[bridge.lower_index] > 7.5,
  );
});

test("Montréal river and Monaco sea share the track datum without treating the river as ocean", () => {
  const ca = tracks[8],
    mc = tracks[1];
  assert.ok(ca.water_level > ca.sea_level + 2);
  assert.ok(ca.water_level < 0);
  assert.ok(Math.abs(mc.water_level - mc.sea_level) < 0.001);
});

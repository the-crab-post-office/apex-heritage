import * as THREE from "three";
// All placement/collision geometry comes from Rust's same editable venue data.
export function buildVenue(world) {
  const data = world.config.venue;
  if (!data) return;
  const batches = new Map(),
    box = new THREE.BoxGeometry(1, 1, 1),
    sphere = new THREE.SphereGeometry(1, 7, 5),
    tyre = new THREE.TorusGeometry(
      0.29,
      0.115,
      world.config.quality === "high" ? 6 : 4,
      12,
    ),
    matrix = new THREE.Object3D();
  const mat = (color, roughness = 0.8, metalness = 0.05) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const concrete = world.surfaces.pbr("Concrete023", "#c3c6bd", 0.25),
    steel = mat("#8a979a", 0.4, 0.65),
    dark = mat("#1a2022", 0.6, 0.25),
    rubber = mat("#ffffff", 0.94),
    seat = mat("#ffffff", 0.8),
    roof = mat("#b7bfc0", 0.55, 0.25),
    clothes = mat("#ffffff"),
    skin = mat("#d0b591");
  const wires = [],
    counts = new Map();
  function put(
    key,
    geo,
    material,
    x,
    y,
    z,
    sx,
    sy,
    sz,
    yaw = 0,
    pitch = 0,
    color = null,
  ) {
    matrix.position.set(x, y, z);
    matrix.scale.set(sx, sy, sz);
    matrix.rotation.set(pitch, yaw, 0, "YXZ");
    matrix.updateMatrix();
    counts.set(key, (counts.get(key) || 0) + 1);
    const bucket = `${key}:${Math.floor(x / 160)},${Math.floor(z / 160)}`;
    if (!batches.has(bucket))
      batches.set(bucket, { geo, material, instances: [] });
    batches
      .get(bucket)
      .instances.push({ matrix: matrix.matrix.clone(), color });
  }
  const n = world.track.points.length;
  const ground = (x, z, index) =>
    Math.max(
      world.height(x, z) - 1.25,
      world.roadHeight(x, z, index / n) - 0.18,
    );
  for (const b of data.barriers) {
    const dx = b.b[0] - b.a[0],
      dz = b.b[1] - b.a[1],
      len = Math.hypot(dx, dz),
      yaw = Math.atan2(dx, dz),
      cx = (b.a[0] + b.b[0]) / 2,
      cz = (b.a[1] + b.b[1]) / 2;
    const ya = ground(...b.a, b.index),
      yb = ground(...b.b, b.index),
      y = (ya + yb) / 2,
      pitch = -Math.atan2(yb - ya, len);
    if (b.kind === "tyres") {
      const count = Math.max(2, Math.ceil(len / 0.79));
      for (let j = 0; j < count; j++) {
        const f = (j + 0.5) / count,
          x = b.a[0] + dx * f,
          z = b.a[1] + dz * f;
        const yy = ground(x, z, b.index);
        for (let row = 0; row < 3; row++)
          put(
            "tyres",
            tyre,
            rubber,
            x,
            yy + 0.2 + row * 0.39,
            z,
            1,
            1,
            1.7,
            0,
            Math.PI / 2,
            j % 9 === 0 ? "#ddd9d0" : j % 9 === 1 ? "#b6392d" : "#161b1c",
          );
      }
    } else if (b.kind === "concrete") {
      put(
        "walls",
        box,
        concrete,
        cx,
        y + b.height / 2,
        cz,
        b.radius * 2,
        b.height,
        len + 0.05,
        yaw,
        pitch,
      );
      put(
        "wall-caps",
        box,
        steel,
        cx,
        y + b.height + 0.025,
        cz,
        b.radius * 2 + 0.08,
        0.06,
        len + 0.07,
        yaw,
        pitch,
      );
    } else {
      for (const level of [0.35, 0.62, 0.89])
        put(
          "armco",
          box,
          steel,
          cx,
          y + level,
          cz,
          0.16,
          0.19,
          len + 0.06,
          yaw,
          pitch,
        );
    }
    const posts = Math.max(1, Math.ceil(len / 4));
    for (let j = 0; j <= posts; j++) {
      const f = j / posts,
        x = b.a[0] + dx * f,
        z = b.a[1] + dz * f,
        yy = ground(x, z, b.index);
      if (b.kind !== "tyres")
        put("posts", box, steel, x, yy + 0.55, z, 0.12, 1.1, 0.14, yaw);
      if (b.fence) {
        put("fence-posts", box, steel, x, yy + 2.65, z, 0.065, 3.3, 0.07, yaw);
      }
    }
    if (b.fence) {
      const top = b.height + 3.1;
      for (let h = b.height + 0.35; h < top; h += 0.48)
        wires.push(...[b.a[0], ya + h, b.a[1], b.b[0], yb + h, b.b[1]]);
      const count = Math.ceil(len / 1.4);
      for (let j = 0; j <= count; j++) {
        let f = j / count;
        wires.push(
          b.a[0] + dx * f,
          ya + (yb - ya) * f + b.height,
          b.a[1] + dz * f,
          b.a[0] + dx * f,
          ya + (yb - ya) * f + top,
          b.a[1] + dz * f,
        );
      }
    }
  }
  for (const [id, s] of data.grandstands.entries()) {
    const floor =
      Math.max(...s.footprint.map(([x, z]) => world.height(x, z) - 1.25)) +
      0.25;
    const local = (x, y, z) => [
      s.x + x * Math.cos(s.yaw) + z * Math.sin(s.yaw),
      floor + y,
      s.z - x * Math.sin(s.yaw) + z * Math.cos(s.yaw),
    ];
    const cube = (key, m, x, y, z, w, h, d, color = null) =>
      put(key, box, m, ...local(x, y, z), w, h, d, s.yaw, 0, color);
    cube("stand-platforms", concrete, 0, 0.1, 0, s.width, 0.3, s.depth);
    const cols = Math.max(4, Math.min(160, Math.floor((s.width - 1.4) / 0.82))),
      rowDepth = Math.max(0.6, (s.depth - 1) / s.rows);
    for (let row = 0; row < s.rows; row++) {
      const z = s.depth / 2 - 0.5 - (row + 0.5) * rowDepth,
        rise = 0.48 * row;
      cube(
        "tiers",
        concrete,
        0,
        (rise + 0.65) / 2,
        z,
        s.width,
        rise + 0.65,
        rowDepth,
      );
      for (let j = 0; j < cols; j++) {
        if (j % 16 === 15) continue;
        const x = -s.width / 2 + 0.7 + (j * (s.width - 1.4)) / (cols - 1);
        const color = ["#375f89", "#d8d8cf", "#a6352a", "#ddb33b"][
          (id + Math.floor(j / 9)) % 4
        ];
        cube("seats", seat, x, rise + 0.78, z, 0.65, 0.12, 0.56, color);
        cube(
          "seat-backs",
          seat,
          x,
          rise + 1.0,
          z - 0.28,
          0.65,
          0.44,
          0.08,
          color,
        );
        if ((j + row * 3 + id) % 3 === 0) {
          put(
            "spectators",
            box,
            clothes,
            ...local(x, rise + 1.2, z),
            0.37,
            0.52,
            0.25,
            s.yaw,
            0,
            ["#3c5d76", "#d4c8b9", "#792d28", "#d1a45d"][(j + row) % 4],
          );
          put(
            "heads",
            sphere,
            skin,
            ...local(x, rise + 1.59, z + 0.01),
            0.125,
            0.15,
            0.125,
          );
        }
      }
    }
    // Continuous stair aisles, rear rail, supporting piers and an optional roof.
    for (const x of [-s.width / 2 + 10.4, -s.width / 2 + 21.8])
      for (let row = 0; row < s.rows * 2; row++)
        cube(
          "stairs",
          steel,
          x,
          0.21 + row * 0.24,
          s.depth / 2 - 0.5 - (row * rowDepth) / 2,
          0.7,
          0.14,
          0.8,
        );
    cube(
      "stand-rail",
      steel,
      0,
      s.rows * 0.48 + 1.3,
      -s.depth / 2,
      s.width,
      0.07,
      0.08,
    );
    for (const x of [-s.width / 2 + 0.6, 0, s.width / 2 - 0.6])
      for (const z of [-s.depth / 2 + 0.5, s.depth / 2 - 0.5]) {
        const [px, , pz] = local(x, 0, z),
          base = world.height(px, pz) - 1.25,
          top = floor + (s.roof ? s.rows * 0.48 + 3.3 : 0.1),
          height = top - base;
        put(
          "stand-columns",
          box,
          steel,
          px,
          base + height / 2,
          pz,
          0.24,
          height,
          0.24,
          s.yaw,
        );
      }
    if (s.roof) {
      cube(
        "stand-roof",
        roof,
        0,
        s.rows * 0.48 + 3.35,
        0,
        s.width + 2,
        0.16,
        s.depth + 3,
      );
      for (const x of [-14, 0, 14])
        cube(
          "roof-trusses",
          steel,
          x,
          s.rows * 0.48 + 3.0,
          0,
          0.1,
          0.45,
          s.depth + 2,
        );
    }
    cube("stand-fascia", dark, 0, 0.9, s.depth / 2 + 0.04, s.width, 1.3, 0.15);
  }
  for (const { geo, material, instances } of batches.values()) {
    const mesh = new THREE.InstancedMesh(geo, material, instances.length);
    instances.forEach((o, i) => {
      mesh.setMatrixAt(i, o.matrix);
      if (o.color) mesh.setColorAt(i, new THREE.Color(o.color));
      else mesh.setColorAt(i, new THREE.Color("#ffffff"));
    });
    mesh.castShadow = world.config.quality === "high";
    mesh.receiveShadow = true;
    world.scene.add(mesh);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(wires, 3));
  world.scene.add(
    new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({
        color: "#7d8c8e",
        transparent: true,
        opacity: 0.62,
      }),
    ),
  );
  world.venueAudit = {
    barriers: data.barriers,
    grandstands: data.grandstands,
    tyres: counts.get("tyres") || 0,
    seats: counts.get("seats") || 0,
    spectators: counts.get("heads") || 0,
    source:
      "mapped/photo-referenced facilities; extents and historical substitutes labelled",
  };
}

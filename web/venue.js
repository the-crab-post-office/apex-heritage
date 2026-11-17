import * as THREE from "three";
import { GroundSupport, groundSpans } from "./ground-support.js";
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
    roof = mat("#454e53", 0.65, 0.25),
    clothes = mat("#ffffff"),
    skin = mat("#d0b591");
  const wallFaces = [],
    wallColors = [];
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
  const support = new GroundSupport([
    world.terrainMesh,
    world.roadMesh,
    world.pitMesh,
    ...world.surfaceOverlays,
  ]);
  world.barrierSupport = support;
  const footings = [],
    unsupported = [];
  const ground = (x, z) => {
    const y = support.height(x, z);
    if (y === null) {
      unsupported.push([x, z]);
      return world.height(x, z) - 1.25;
    }
    return y;
  };
  for (const source of data.barriers) {
    const spans =
      source.kind === "tyres"
        ? [[[...source.a], [...source.b]]]
        : groundSpans(source, ground).map(([a, b]) => [
            [a[0], a[2]],
            [b[0], b[2]],
          ]);
    for (const [a, end] of spans) {
      const b = { ...source, a, b: end };
      const dx = b.b[0] - b.a[0],
        dz = b.b[1] - b.a[1],
        len = Math.hypot(dx, dz),
        yaw = Math.atan2(dx, dz),
        cx = (b.a[0] + b.b[0]) / 2,
        cz = (b.a[1] + b.b[1]) / 2;
      const ya = ground(...b.a),
        yb = ground(...b.b),
        y = (ya + yb) / 2,
        pitch = -Math.atan2(yb - ya, len),
        slopedLength = Math.hypot(len, yb - ya);
      if (b.kind === "tyres") {
        const count = Math.max(2, Math.ceil(len / 0.79));
        for (let j = 0; j < count; j++) {
          const f = (j + 0.5) / count,
            x = b.a[0] + dx * f,
            z = b.a[1] + dz * f;
          const yy = ground(x, z);
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
      } else if (b.kind === "concrete" || b.kind.startsWith("spa-")) {
        const nx = (dz / Math.max(len, 0.0001)) * b.radius,
          nz = (-dx / Math.max(len, 0.0001)) * b.radius;
        const base = [
          [b.a[0] - nx, b.a[1] - nz],
          [b.a[0] + nx, b.a[1] + nz],
          [b.b[0] + nx, b.b[1] + nz],
          [b.b[0] - nx, b.b[1] - nz],
        ].map(([x, z]) => [x, ground(x, z) - 0.06, z]);
        // Ground layers can have steps at apron/grass boundaries. Extend the
        // foundation below the lowest support along every lower edge, keeping
        // the visible wall top aligned with the independently sampled corners.
        let extension = 0;
        for (let edge = 0; edge < 4; edge++)
          for (const f of [0.25, 0.5, 0.75]) {
            const a = base[edge],
              b = base[(edge + 1) % 4];
            const x = a[0] + (b[0] - a[0]) * f,
              z = a[2] + (b[2] - a[2]) * f;
            extension = Math.max(
              extension,
              a[1] + (b[1] - a[1]) * f - ground(x, z) + 0.06,
            );
          }
        const corners = [
          ...base.map(([x, y, z]) => [x, y - extension, z]),
          ...base.map(([x, y, z]) => [x, y + b.height, z]),
        ];
        for (const face of [
          [0, 1, 2, 3],
          [4, 7, 6, 5],
          [0, 4, 5, 1],
          [1, 5, 6, 2],
          [2, 6, 7, 3],
          [3, 7, 4, 0],
        ])
          for (const i of [
            face[0],
            face[1],
            face[2],
            face[0],
            face[2],
            face[3],
          ]) {
            wallFaces.push(...corners[i]);
            const color = new THREE.Color(
              b.kind === "spa-red"
                ? "#b5352c"
                : b.kind === "spa-yellow"
                  ? "#dfc644"
                  : "#ffffff",
            );
            wallColors.push(color.r, color.g, color.b);
          }
        put(
          "wall-caps",
          box,
          steel,
          cx,
          y + b.height + 0.025,
          cz,
          b.radius * 2 + 0.08,
          0.06,
          slopedLength + 0.03,
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
            slopedLength + 0.02,
            yaw,
            pitch,
          );
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
    const sourceDx = source.b[0] - source.a[0],
      sourceDz = source.b[1] - source.a[1],
      sourceLength = Math.hypot(sourceDx, sourceDz),
      sourceYaw = Math.atan2(sourceDx, sourceDz);
    const posts = Math.max(1, Math.ceil(sourceLength / 4));
    for (let j = 0; j <= posts; j++) {
      const f = j / posts,
        x = source.a[0] + sourceDx * f,
        z = source.a[1] + sourceDz * f,
        yy = ground(x, z);
      if (source.kind !== "tyres") {
        put("posts", box, steel, x, yy + 0.5, z, 0.12, 1.2, 0.14, sourceYaw);
        footings.push({ x, z, bottom: yy - 0.1, ground: yy });
      }
      if (source.fence) {
        put(
          "fence-posts",
          box,
          steel,
          x,
          yy + 2.1,
          z,
          0.065,
          4.4,
          0.07,
          sourceYaw,
        );
        footings.push({ x, z, bottom: yy - 0.1, ground: yy });
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
        if (
          (world.track.code === "MC" && s.index >= 497 && s.index <= 555) ||
          (j + row * 3 + id) % 3 === 0
        ) {
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
    for (const x of s.width < 14
      ? [0]
      : [-s.width / 2 + 10.4, -s.width / 2 + 21.8])
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
      for (const x of [-s.width * 0.35, 0, s.width * 0.35])
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
  for (const [bucket, { geo, material, instances }] of batches.entries()) {
    const mesh = new THREE.InstancedMesh(geo, material, instances.length);
    instances.forEach((o, i) => {
      mesh.setMatrixAt(i, o.matrix);
      if (o.color) mesh.setColorAt(i, new THREE.Color(o.color));
      else mesh.setColorAt(i, new THREE.Color("#ffffff"));
    });
    mesh.userData.venueKey = bucket.split(":")[0];
    mesh.castShadow = world.config.quality === "high";
    mesh.receiveShadow = true;
    world.scene.add(mesh);
  }
  if (wallFaces.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(wallFaces, 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(wallColors, 3),
    );
    geometry.computeVertexNormals();
    concrete.vertexColors = true;
    const wall = new THREE.Mesh(geometry, concrete);
    wall.material.side = THREE.DoubleSide;
    wall.userData.venueKey = "concrete-walls";
    wall.castShadow = wall.receiveShadow = true;
    world.scene.add(wall);
  }
  world.auditBarrierGrounding = (stride = 31) => {
    const meshes = [
      ...new Set(
        [
          world.terrainMesh,
          world.roadMesh,
          world.pitMesh,
          ...world.surfaceOverlays,
        ].filter(Boolean),
      ),
    ];
    const ray = new THREE.Raycaster(),
      matrix = new THREE.Matrix4(),
      p = new THREE.Vector3(),
      direction = new THREE.Vector3(0, -1, 0);
    let checked = 0,
      missing = 0,
      maxGap = -Infinity,
      maxEmbedding = 0,
      total = 0;
    let wallsChecked = 0,
      maxPostEmbedding = 0;
    const checkPoint = (post = false) => {
      ray.set(new THREE.Vector3(p.x, p.y + 500, p.z), direction);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) {
        missing++;
        return;
      }
      const gap = p.y - hit.point.y;
      checked++;
      maxGap = Math.max(maxGap, gap);
      maxEmbedding = Math.max(maxEmbedding, -gap);
      if (post) maxPostEmbedding = Math.max(maxPostEmbedding, -gap);
    };
    for (const mesh of world.scene.children) {
      if (mesh.userData.venueKey === "concrete-walls") {
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += 36 * stride * 4) {
          // The first face contains the four lower corners. Also check side midpoints.
          const corners = [0, 1, 2, 5].map((j) =>
            new THREE.Vector3().fromBufferAttribute(pos, i + j),
          );
          for (let j = 0; j < 4; j++) {
            p.copy(corners[j]);
            checkPoint();
            wallsChecked++;
            p.copy(corners[j]).lerp(corners[(j + 1) % 4], 0.5);
            checkPoint();
            wallsChecked++;
          }
        }
      }
      if (!["posts", "fence-posts"].includes(mesh.userData.venueKey)) continue;
      mesh.updateMatrixWorld(true);
      for (let i = 0; i < mesh.count; i++) {
        if (total++ % stride) continue;
        mesh.getMatrixAt(i, matrix);
        p.set(0, -0.5, 0).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
        checkPoint(true);
      }
    }
    return {
      checked,
      wallsChecked,
      missing,
      maxGap,
      maxEmbedding,
      maxPostEmbedding,
    };
  };
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
    groundFootings: footings,
    unsupportedGround: unsupported,
    barriers: data.barriers,
    grandstands: data.grandstands,
    tyres: counts.get("tyres") || 0,
    seats: counts.get("seats") || 0,
    spectators: counts.get("heads") || 0,
    source:
      "mapped/photo-referenced facilities; extents and historical substitutes labelled",
  };
}

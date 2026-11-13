import { eras } from "./catalog.js";
import { liveryMaterials, bodyUV } from "./livery.js";
import * as THREE from "three";
import {
  mergeBody,
  boxGeo,
  cylGeo,
  sphereGeo,
  material,
} from "./mesh-utils.js";
export function makeCar(era = 2, color = "#e53c2f", selectedTeam = null) {
  const team =
      selectedTeam ||
      eras[era].teams.find((t) => t.color === color) ||
      eras[era].teams[0],
    livery = liveryMaterials(team);
  color = team.color;
  const car = new THREE.Group();
  const paint = livery.body,
    black = material("#111612", 0.75, 0.13),
    carbon = material("#161c1b", 0.55, 0.4),
    silver = material("#788481", 0.3, 0.82),
    white = material("#e3e4d9", 0.45, 0.08),
    gold = material("#e3b649", 0.45, 0.25),
    helmet = material("#f0e5c6", 0.28, 0.28);
  const box = (x, y, z, w, h, d, m) => {
    let geometry = boxGeo;
    if (m === paint) {
      m =
        w > 0.9 && h < 0.16 && d < 1 && Math.abs(z) > 1.5
          ? livery.wing
          : w < 0.15 && h > 0.25 && Math.abs(z) > 1.5
            ? livery.end
            : livery.plain;
      if (m === livery.wing || m === livery.end) {
        geometry = boxGeo.clone();
        const pos = geometry.attributes.position,
          uv = geometry.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          if (m === livery.wing)
            uv.setXY(
              i,
              (pos.getX(i) + 0.5) * 0.5,
              0.5 - (pos.getZ(i) + 0.5) * 0.25,
            );
          else
            uv.setXY(
              i,
              0.5 +
                (0.5 -
                  pos.getZ(i) *
                    (geometry.attributes.normal.getX(i) >= 0 ? 1 : -1)) *
                  0.25,
              0.25 + (pos.getY(i) + 0.5) * 0.25,
            );
        }
      }
    }
    const a = new THREE.Mesh(geometry, m);
    a.position.set(x, y, z);
    a.scale.set(w, h, d);
    a.castShadow = true;
    a.receiveShadow = true;
    car.add(a);
    return a;
  };
  const sphere = (x, y, z, w, h, d, m) => {
    let geometry = sphereGeo;
    if (m === paint) {
      geometry = sphereGeo.clone();
      const pos = geometry.attributes.position,
        uv = geometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const theta =
          ((Math.atan2(pos.getX(i), pos.getY(i)) + Math.PI * 2) %
            (Math.PI * 2)) /
          (Math.PI * 2);
        uv.setXY(i, ...bodyUV(theta, z + pos.getZ(i) * d));
      }
    }
    const a = new THREE.Mesh(geometry, m);
    a.position.set(x, y, z);
    a.scale.set(w, h, d);
    a.castShadow = true;
    car.add(a);
    return a;
  };
  const rod = (a, b, r, m) => {
    a = new THREE.Vector3(...a);
    b = new THREE.Vector3(...b);
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8),
      m,
    );
    c.position.copy(a).add(b).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    c.castShadow = true;
    car.add(c);
    return c;
  };
  // Every car points +Z. Distinct proportions and aero packages per era.
  const modern = era === 3,
    classic = era === 0,
    turbo = era === 1;
  const length = modern ? 5.25 : classic ? 3.65 : 4.55;
  const loft = (sections, mat) => {
    const pods = mat === paint && !!sections[0][4];
    if (pods) mat = livery.pods;
    const pos = [],
      idx = [],
      uvs = [],
      steps = 32;
    sections.forEach(([z, w, y, h, cx = 0], i) => {
      for (let j = 0; j <= steps; j++) {
        const a = (j / steps) * Math.PI * 2;
        pos.push(cx + Math.sin(a) * w, y + Math.cos(a) * h, z);
        uvs.push(...bodyUV(j / steps, z, pods));
        if (i < sections.length - 1 && j < steps) {
          let k = i * (steps + 1) + j,
            l = k + 1;
          idx.push(k, k + steps + 1, l, l, k + steps + 1, l + steps + 1);
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    car.add(m);
    return m;
  };
  loft(
    [
      [-1.85, 0.1, 0.4, 0.1],
      [-1.1, 0.32, 0.48, 0.26],
      [-0.4, 0.4, 0.51, 0.3],
      [0.3, 0.34, 0.52, 0.26],
      [0.95, 0.21, 0.43, 0.18],
      [1.75, 0.11, 0.32, 0.1],
      [2.1, 0.05, 0.27, 0.05],
    ],
    paint,
  );
  if (!classic) {
    box(0, 0.18, -0.1, 1.55, 0.09, 3.1, carbon);
    for (const side of [-1, 1]) {
      loft(
        [
          [-1.65, 0.14, 0.34, 0.12, side * 0.43],
          [-1.05, 0.29, 0.4, 0.22, side * 0.62],
          [-0.35, 0.34, 0.45, 0.27, side * 0.65],
          [0.35, 0.32, 0.48, 0.2, side * 0.61],
          [0.61, 0.27, 0.48, 0.12, side * 0.58],
        ],
        paint,
      );
      box(side * 0.59, 0.51, 0.63, 0.48, 0.17, 0.045, black); // recessed radiator mouth
      for (let j = 0; j < 9; j++)
        box(side * (0.41 + j * 0.044), 0.51, 0.657, 0.009, 0.15, 0.012, silver);
    }
  } else {
    box(0, 0.7, -1.08, 0.45, 0.25, 1.1, silver);
    for (let x of [-0.24, 0.24]) {
      for (let z = -1.2; z < -0.4; z += 0.15) {
        rod([x, 0.75, z], [x * 1.45, 1, z], 0.045, silver);
      }
    }
    box(0, 0.14, -0.1, 0.7, 0.08, 3.2, carbon);
  }
  // Cockpit, seat, driver, visor and steering wheel.
  sphere(0, 0.85, 0.1, 0.29, 0.15, 0.48, black);
  sphere(0, 0.89, -0.03, 0.21, 0.22, 0.26, black);
  sphere(0, 1.02, 0.1, 0.185, 0.21, 0.2, helmet);
  sphere(0, 1.04, 0.235, 0.17, 0.075, 0.055, black);
  const steering = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.03, 6, 16),
    carbon,
  );
  steering.position.set(0, 0.86, 0.45);
  steering.rotation.x = -0.55;
  car.add(steering);
  if (!classic) {
    box(0, 1.35, -0.65, 0.22, 0.17, 0.22, black);
    box(0, 1.4, -0.65, 0.13, 0.1, 0.14, carbon);
  }
  if (modern) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.035, 7, 24, Math.PI),
      carbon,
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 1.1, 0.12);
    car.add(halo);
    rod([0, 0.67, 0.64], [0, 1.1, 0.51], 0.035, carbon);
    rod([-0.35, 1.1, 0.1], [-0.34, 0.8, -0.35], 0.035, carbon);
    rod([0.35, 1.1, 0.1], [0.34, 0.8, -0.35], 0.035, carbon);
  }
  // Suspension rods and four detailed slick tyres.
  const wheels = [];
  const front = classic ? 1.12 : 1.43,
    rear = classic ? -1.1 : -1.44;
  const track = classic ? 0.82 : 1.02;
  for (let side of [-1, 1])
    for (let z of [front, rear]) {
      const wheel = new THREE.Group();
      wheel.position.set(side * track, 0.35, z);
      const radius = classic ? 0.34 : modern ? 0.38 : 0.35;
      const width = classic ? 0.24 : z === rear ? 0.44 : 0.34;
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, width, 48, 1),
        black,
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheel.add(tire);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius * 0.54,
          radius * 0.54,
          width + 0.015,
          16,
        ),
        livery.rim,
      );
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius * 0.18,
          radius * 0.18,
          width + 0.035,
          10,
        ),
        carbon,
      );
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.82, 0.009, 4, 32),
        classic ? silver : gold,
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = side * width * 0.51;
      wheel.add(ring);
      if (era === 2) {
        for (let v of [-0.1, 0, 0.1]) {
          const groove = new THREE.Mesh(
            new THREE.TorusGeometry(radius + 0.002, 0.006, 3, 32),
            carbon,
          );
          groove.rotation.y = Math.PI / 2;
          groove.position.x = v;
          wheel.add(groove);
        }
      }
      car.add(wheel);
      wheels.push({ mesh: wheel, front: z === front });
      for (let y of [0.28, 0.55]) {
        rod([side * 0.27, y, z - 0.33], [side * track, 0.35, z], 0.018, carbon);
        rod([side * 0.27, y, z + 0.33], [side * track, 0.35, z], 0.018, carbon);
      }
    }
  if (!classic) {
    const fwz = length * 0.49;
    box(0, 0.19, fwz, modern ? 2.05 : 1.9, 0.055, 0.64, carbon);
    for (let i = 0; i < 3; i++) {
      let flap = box(
        0,
        0.21 + i * 0.045,
        fwz - 0.14 + i * 0.14,
        1.85,
        0.04,
        0.16,
        paint,
      );
      flap.rotation.x = -0.13;
    }
    for (let side of [-1, 1]) {
      box(side * 0.98, 0.32, fwz, 0.055, 0.31, 0.68, paint);
      box(side * 0.82, 0.93, -length * 0.43, 0.055, 0.7, 0.7, paint);
      rod(
        [side * 0.45, 0.2, -1.4],
        [side * 0.45, 1.12, -length * 0.43],
        0.026,
        carbon,
      );
    }
    box(0, 1.25, -length * 0.43, 1.68, 0.07, 0.55, paint);
    box(0, 1.12, -length * 0.43 + 0.08, 1.65, 0.06, 0.39, carbon);
    for (let side of [-1, 1]) {
      box(side * 0.7, 0.69, -0.46, 0.34, 0.035, 0.8, carbon);
      if (modern) {
        box(side * 0.78, 0.24, -0.25, 0.035, 0.13, 2.6, carbon);
      }
    }
  }

  // Distinct, original mechanical detail; no official logos or copied car meshes.
  const accent = material(classic ? "#dfbf65" : "#e8ebdf", 0.32, 0.25);
  const hot = material("#b76234", 0.45, 0.7);
  if (!classic) {
    loft(
      [
        [-1.7, 0.07, 0.5, 0.1],
        [-1.2, 0.21, 0.67, 0.34],
        [-0.7, 0.23, 0.85, 0.48],
        [-0.45, 0.2, 0.87, 0.37],
      ],
      paint,
    );
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const l = box(
          side * (0.58 + i * 0.013),
          0.69,
          -0.35 - i * 0.1,
          0.25,
          0.012,
          0.035,
          black,
        );
        l.rotation.z = side * 0.18;
      }
      box(side * 0.55, 0.5, 0.72, 0.28, 0.035, 0.22, carbon); // mirror stalks
      box(side * 0.77, 0.57, 0.73, 0.18, 0.1, 0.25, paint);
      for (let i = 0; i < 4; i++)
        box(side * (0.19 + i * 0.14), 0.19, -1.95, 0.018, 0.22, 0.55, carbon); // diffuser vanes
      box(side * 0.94, 0.47, -1.3, 0.065, 0.2, 0.2, hot); // stationary brake calipers
      box(side * 0.94, 0.47, 1.43, 0.065, 0.18, 0.17, hot);
      for (let i = 0; i < 3; i++)
        box(
          side * 0.98,
          0.35 + i * 0.065,
          length * 0.49 - 0.04,
          0.012,
          0.012,
          0.4,
          accent,
        );
    }
    const exhaust = rod([0, 0.6, -1.55], [0, 0.69, -2.03], 0.075, silver);
    box(
      0,
      0.52,
      -2.12,
      0.1,
      0.07,
      0.04,
      new THREE.MeshStandardMaterial({
        color: "#d3261e",
        emissive: "#e32a18",
        emissiveIntensity: 1.5,
      }),
    );
    if (modern) {
      for (const side of [-1, 1]) {
        box(side * 0.8, 0.24, -0.25, 0.045, 0.13, 2.4, carbon);
        for (let j = 0; j < 4; j++)
          box(side * 0.8, 0.2, 0.55 - j * 0.4, 0.2, 0.035, 0.24, carbon);
      }
    }
  } else {
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const z = -0.55 - i * 0.18;
        rod(
          [side * 0.25, 0.72, z],
          [side * 0.47, 0.58, z - 0.12],
          0.04,
          silver,
        );
        rod(
          [side * 0.47, 0.58, z - 0.12],
          [side * 0.5, 0.43, -1.65],
          0.035,
          hot,
        );
        rod([side * 0.19, 0.83, z], [side * 0.26, 1.02, z], 0.05, silver);
      }
    for (const side of [-1, 1])
      rod([side * 0.5, 0.43, -1.65], [side * 0.5, 0.43, -1.9], 0.075, silver);
    rod([-0.25, 0.85, -0.34], [0, 1.16, -0.4], 0.027, silver);
    rod([0, 1.16, -0.4], [0.25, 0.85, -0.34], 0.027, silver);
    for (let i = 0; i < 12; i++)
      box(0.14, 0.62, 1.05 + i * 0.04, 0.22, 0.013, 0.015, silver);
  }
  // Real spoke geometry/fasteners and tyre sidewalls instead of solid silver discs.
  for (const w of wheels) {
    const side = Math.sign(w.mesh.position.x),
      x = side * (classic ? 0.13 : w.front ? 0.18 : 0.23),
      r = classic ? 0.34 : modern ? 0.38 : 0.35;
    const rimMat = livery.rim;
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(boxGeo, rimMat);
      spoke.position.set(x, Math.sin(a) * r * 0.31, Math.cos(a) * r * 0.31);
      spoke.scale.set(0.03, 0.028, r * 0.45);
      spoke.rotation.x = -a;
      w.mesh.add(spoke);
    }
    const nut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.045, 6),
      gold,
    );
    nut.rotation.z = Math.PI / 2;
    nut.position.x = x + side * 0.025;
    w.mesh.add(nut);
  }
  // Atlas-backed sidewall lettering shares the same source with native body textures.
  for (const w of wheels) {
    const radius = classic ? 0.34 : modern ? 0.38 : 0.35;
    const side = Math.sign(w.mesh.position.x),
      width = classic ? 0.24 : w.front ? 0.34 : 0.44;
    const geo = new THREE.RingGeometry(radius * 0.67, radius * 0.98, 64, 1);
    const pos = geo.attributes.position,
      uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        a = ((Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2),
        r = Math.hypot(x, y);
      uv.setXY(i, a, 0.25 - ((r / radius - 0.67) / 0.31) * 0.25);
    }
    const sidewall = new THREE.Mesh(geo, livery.tyre);
    sidewall.rotation.y = (side * Math.PI) / 2;
    sidewall.position.x = side * (width / 2 + 0.003);
    w.mesh.add(sidewall);
  }
  car.userData.livery = {
    id: team.id,
    number: team.number,
    sponsor: team.sponsor,
    style: team.style,
    atlas: true,
  };
  car.userData.liveryReady = livery.ready;
  car.userData.detail = {
    profiledBody: true,
    radiators: !classic,
    spokedWheels: 4,
    exhausts: classic ? 2 : 1,
    diffuser: !classic,
  };

  const floorOffset = [0.105, 0.065, 0.045, 0.04][era] - 0.195;
  for (const child of car.children)
    if (!wheels.some((w) => w.mesh === child)) child.position.y += floorOffset;
  mergeBody(car);
  car.userData.detail.paintedVertices = car.children
    .filter((m) =>
      [paint, livery.pods, livery.wing, livery.end, livery.plain].includes(
        m.material,
      ),
    )
    .reduce((n, m) => n + m.geometry.attributes.position.count, 0);
  for (const w of wheels) mergeBody(w.mesh);
  car.userData.wheels = wheels;
  car.userData.materials = [
    paint,
    livery.pods,
    livery.wing,
    livery.end,
    livery.tyre,
    livery.plain,
    livery.rim,
    black,
    carbon,
    silver,
    white,
    gold,
    helmet,
  ];
  return car;
}

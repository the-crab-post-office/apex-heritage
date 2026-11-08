import imageryManifest from "../data/imagery.json";
import { imageryFor, forestAt } from "./imagery.js";
import { SurfaceLibrary } from "./materials.js";
import { RoadMask, ribbon, roadPoint } from "./road-surface.js";
import mappedScenery from "./assets/buildings.json";
import { CircuitClearance, inside, pointSegmentDistance } from "./scenery.js";
import * as THREE from "three";
import { ElevationField, profileAt } from "./elevation.js";
import { Sky } from "three/addons/objects/Sky.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
function mergeBody(group) {
  const batches = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh || o.isInstancedMesh) continue;
    o.updateMatrix();
    const g = o.geometry.clone().applyMatrix4(o.matrix);
    if (!batches.has(o.material)) batches.set(o.material, []);
    batches.get(o.material).push(g);
    group.remove(o);
  }
  for (const [m, geometries] of batches) {
    const g = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (g) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
const rnd = ((seed) => () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
})(73191);
const boxGeo = new THREE.BoxGeometry(1, 1, 1),
  cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20),
  sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const material = (color, roughness = 0.6, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
export function makeCar(era = 2, color = "#e53c2f") {
  const car = new THREE.Group();
  const paint = material(color, 0.28, 0.42),
    black = material("#111612", 0.75, 0.13),
    carbon = material("#161c1b", 0.55, 0.4),
    silver = material("#788481", 0.3, 0.82),
    white = material("#e3e4d9", 0.45, 0.08),
    gold = material("#e3b649", 0.45, 0.25),
    helmet = material("#f0e5c6", 0.28, 0.28);
  const box = (x, y, z, w, h, d, m) => {
    const a = new THREE.Mesh(boxGeo, m);
    a.position.set(x, y, z);
    a.scale.set(w, h, d);
    a.castShadow = true;
    a.receiveShadow = true;
    car.add(a);
    return a;
  };
  const sphere = (x, y, z, w, h, d, m) => {
    const a = new THREE.Mesh(sphereGeo, m);
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
    const pos = [],
      idx = [],
      steps = 20;
    sections.forEach(([z, w, y, h, cx = 0], i) => {
      for (let j = 0; j < steps; j++) {
        const a = (j / steps) * Math.PI * 2;
        pos.push(cx + Math.sin(a) * w, y + Math.cos(a) * h, z);
        if (i < sections.length - 1) {
          let k = i * steps + j,
            l = i * steps + ((j + 1) % steps);
          idx.push(k, k + steps, l, l, k + steps, l + steps);
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
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
    sphere(0, 0.45, 1.18, 0.31, 0.3, 0.94, paint);
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
    sphere(0, 0.92, -0.71, 0.24, 0.49, 0.73, paint);
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
        silver,
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
    if (turbo) {
      box(0, 0.62, 1.1, 0.44, 0.055, 2.1, white);
      box(0, 0.5, -0.6, 1.45, 0.08, 0.38, white);
    }
    if (era === 2) {
      box(0, 0.68, 1.16, 0.15, 0.015, 1.5, white);
      box(0, 1.3, -1.93, 0.8, 0.015, 0.22, white);
    }
    for (let side of [-1, 1]) {
      box(side * 0.7, 0.69, -0.46, 0.34, 0.035, 0.8, carbon);
      if (modern) {
        box(side * 0.78, 0.24, -0.25, 0.035, 0.13, 2.6, carbon);
      }
    }
  }
  if (classic) {
    box(0, 0.76, 0.92, 0.14, 0.035, 1.35, gold);
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
    const rimMat = silver;
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
  const label = document.createElement("canvas");
  label.width = 256;
  label.height = 128;
  const lc = label.getContext("2d");
  lc.fillStyle = color;
  lc.fillRect(0, 0, 256, 128);
  lc.fillStyle = "#f0eddf";
  lc.font = "italic bold 76px sans-serif";
  lc.textAlign = "center";
  lc.fillText("01", 128, 92);
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.42),
    new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(label),
      roughness: 0.35,
    }),
  );
  badge.rotation.x = -Math.PI / 2;
  badge.position.set(0, 0.59, 1.22);
  car.add(badge);
  car.userData.detail = {
    profiledBody: true,
    radiators: !classic,
    spokedWheels: 4,
    exhausts: classic ? 2 : 1,
    diffuser: !classic,
  };

  mergeBody(car);
  for (const w of wheels) mergeBody(w.mesh);
  car.userData.wheels = wheels;
  car.userData.materials = [paint, black, carbon, silver, white, gold, helmet];
  return car;
}
function texture(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  let image = ctx.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    let n = rnd();
    if (kind === "road") {
      let a = 57 + n * 29;
      image.data[i] = a;
      image.data[i + 1] = a + 1;
      image.data[i + 2] = a + 2;
    } else {
      image.data[i] = 61 + n * 32;
      image.data[i + 1] = 76 + n * 39;
      image.data[i + 2] = 36 + n * 23;
    }
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export class World {
  constructor(canvas, track, config) {
    this.track = track;
    this.config = config;
    this.scene = new THREE.Scene();
    const wet = config.weather === "wet";
    this.scene.background = new THREE.Color(wet ? "#8c9f9d" : "#b0c5bd");
    this.scene.fog = new THREE.FogExp2(
      wet ? "#8c9f9d" : "#aebfb1",
      wet ? 0.0014 : 0.00065,
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, config.quality === "high" ? 1.7 : 1),
    );
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = config.quality === "high";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = wet ? 0.9 : 1.15;
    this.camera = new THREE.PerspectiveCamera(
      60,
      innerWidth / innerHeight,
      0.15,
      11000,
    );
    this.scene.add(
      new THREE.HemisphereLight(
        wet ? "#bdced6" : "#d4e3e6",
        "#5d6545",
        wet ? 2 : 2.8,
      ),
    );
    this.sun = new THREE.DirectionalLight(
      wet ? "#d4dfe1" : "#fff0d2",
      wet ? 1.1 : 3.8,
    );
    this.sun.position.set(100, 180, 130);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -90,
      right: 90,
      top: 90,
      bottom: -90,
      near: 1,
      far: 500,
    });
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.1;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    if (!wet) {
      const sky = new Sky();
      sky.scale.setScalar(10000);
      const u = sky.material.uniforms;
      u.turbidity.value = 6;
      u.rayleigh.value = 1.5;
      u.mieCoefficient.value = 0.004;
      u.mieDirectionalG.value = 0.8;
      u.sunPosition.value.set(0.55, 0.3, 0.4);
      this.scene.add(sky);
    }
    this.pitTrack = config.pit
      ? {
          points: config.pit.points.map((p) => [p[0], p[2]]),
          heights: config.pit.points.map((p) => p[1]),
          width: config.pit.width,
          closed: false,
        }
      : null;
    this.pitClearance = this.pitTrack
      ? new CircuitClearance(this.pitTrack, 3)
      : null;
    this.pitMask = this.pitTrack ? new RoadMask(this.pitTrack) : null;
    this.surfaces = new SurfaceLibrary(this.renderer);
    this.photoArea = imageryFor(imageryManifest, track.id);
    this.elevationField = new ElevationField(track);
    this.clearance = new CircuitClearance(track);
    this.sceneryAudit = { trees: [], buildings: [], omittedBuildings: 0 };
    this.buildMappedBuildings();
    this.surfaceOverlays = [];
    this.buildTrack();
    this.buildPits();
    this.buildScenery();
    this.buildLandmarks();
    this.buildTunnel();
    this.photoReady = Promise.all(this.surfaces.pending);
    this.player = makeCar(config.era, config.color);
    this.scene.add(this.player);
    this.ai = [];
    this.cameraMode = 0;
    this.cameraInitialized = false;
    this.rain = null;
    if (wet) this.buildRain();
    this.resize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    };
    window.addEventListener("resize", this.resize);
  }
  height(x, z) {
    return this.elevationField.height(x, z);
  }
  roadHeight(x, z, u) {
    return profileAt(this.track, u);
  }
  sample(u) {
    const p = this.track.points,
      n = p.length;
    u = ((u % 1) + 1) % 1;
    let f = u * n,
      i = Math.floor(f),
      a = p[i],
      b = p[(i + 1) % n],
      v = f - i;
    const x = a[0] * (1 - v) + b[0] * v,
      z = a[1] * (1 - v) + b[1] * v;
    return {
      x,
      z,
      y: this.roadHeight(x, z, u) + 0.07,
      yaw: Math.atan2(b[0] - a[0], b[1] - a[1]),
      grade:
        (this.track.heights[(i + 1) % n] - this.track.heights[i]) /
        Math.hypot(b[0] - a[0], b[1] - a[1]),
      pitch: -Math.atan(
        (this.track.heights[(i + 1) % n] - this.track.heights[i]) /
          Math.hypot(b[0] - a[0], b[1] - a[1]),
      ),
    };
  }
  surfaceMesh(triangles, mat, uvScale = 12) {
    const positions = [],
      uvs = [];
    for (const tri of triangles)
      for (const p of tri) {
        positions.push(...p);
        uvs.push(p[0] / uvScale, p[2] / uvScale);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }
  buildTrack() {
    const groundMat = this.surfaces.pbr("Grass004", "#d5dcba", 0.38);
    groundMat.name = "metre-scale-grass-not-satellite";
    const xs = this.track.points.map((p) => p[0]),
      zs = this.track.points.map((p) => p[1]);
    const minX = Math.min(...xs) - 420,
      maxX = Math.max(...xs) + 420,
      minZ = Math.min(...zs) - 420,
      maxZ = Math.max(...zs) + 420;
    const terrain = new THREE.PlaneGeometry(
      maxX - minX,
      maxZ - minZ,
      Math.ceil((maxX - minX) / 24),
      Math.ceil((maxZ - minZ) / 24),
    );
    terrain.rotateX(-Math.PI / 2);
    terrain.translate((maxX + minX) / 2, 0, (maxZ + minZ) / 2);
    const pos = terrain.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i),
        z = pos.getZ(i),
        h = this.height(x, z) - 1.25;
      // Coastlines and inland hills now come from the geographic height field.
      pos.setY(i, h);
    }
    const roadMask = new RoadMask(this.track),
      terrainMask = new RoadMask(this.track, 2);
    const triangles = [],
      index = terrain.index.array;
    for (let i = 0; i < index.length; i += 3)
      triangles.push(
        [0, 1, 2].map((k) => {
          const j = index[i + k];
          return [pos.getX(j), pos.getY(j), pos.getZ(j)];
        }),
      );
    const ground = this.surfaceMesh(
      this.pitMask
        ? this.pitMask.cutAll(terrainMask.cutAll(triangles))
        : terrainMask.cutAll(triangles),
      groundMat,
      4,
    );
    terrain.dispose();
    this.terrainMesh = ground;
    const wet = this.config.weather === "wet";
    // Multiplying a dark road texture by a dark metallic material made wet
    // asphalt nearly black; keep it readable without pretending to be a mirror.
    const roadMat = this.surfaces.pbr(
      "Asphalt012",
      wet ? "#adb7b9" : "#d9dddd",
      wet ? 0.12 : 0.3,
    );
    roadMat.roughness = wet ? 0.43 : 0.96;
    roadMat.side = THREE.DoubleSide;
    const w = this.track.width / 2;
    const lineMat = material("#e6e6cd", 0.8, 0);
    const bands = [-w, -w + 0.11, -w + 0.25, 0, w - 0.25, w - 0.11, w];
    const roadFaces = [],
      paintFaces = [];
    for (let k = 0; k < bands.length - 1; k++)
      (k === 1 || k === 4 ? paintFaces : roadFaces).push(
        ...ribbon(this.track, bands[k], bands[k + 1], 0.05),
      );
    // A shared centreline and disjoint paint/asphalt bands eliminate warped,
    // independently triangulated full-width layers and z-fighting.
    this.roadMesh = this.surfaceMesh(
      [...roadFaces, ...paintFaces],
      [roadMat, lineMat],
      4,
    );
    this.roadMesh.geometry.clearGroups();
    this.roadMesh.geometry.addGroup(0, roadFaces.length * 3, 0);
    this.roadMesh.geometry.addGroup(
      roadFaces.length * 3,
      paintFaces.length * 3,
      1,
    );
    for (const side of [-1, 1]) {
      for (const [a, b, h, color] of [
        [w, w + 2, 0.01, "#8c9270"],
        [w + 2, w + 14, -0.18, "#758253"],
      ]) {
        const triangles = ribbon(this.track, side * a, side * b, h);
        const layer = this.surfaceMesh(
          this.pitMask
            ? this.pitMask.cutAll(roadMask.cutAll(triangles))
            : roadMask.cutAll(triangles),
          this.surfaces.pbr(
            this.track.code === "MC"
              ? "Concrete023"
              : a === w
                ? "Gravel001"
                : "Grass004",
            "#e0e0ce",
            0.3,
          ),
          4,
        );
        this.surfaceOverlays.push(layer);
      }
    }
    // Alternating red and cream curbs, continuous guardrails and fence poles.
    const curbMat = [
      material("#ffffff", 0.85, 0.05),
      material("#e2d7b3", 0.9, 0.02),
    ];
    const railMat = material("#8d9991", 0.48, 0.7);
    const matrix = new THREE.Object3D();
    const n = this.track.points.length;
    const rails = new THREE.InstancedMesh(boxGeo, railMat, n * 2),
      curbs = new THREE.InstancedMesh(boxGeo, curbMat[0], n * 2);
    const c = new THREE.Color();
    let ri = 0,
      ci = 0;
    for (let i = 0; i < n; i++) {
      let a = this.track.points[i],
        b = this.track.points[(i + 1) % n];
      let dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz),
        rx = dz / len,
        rz = -dx / len;
      for (let side of [-1, 1]) {
        let cx = (a[0] + b[0]) / 2 + rx * side * (w + 0.42),
          cz = (a[1] + b[1]) / 2 + rz * side * (w + 0.42);
        matrix.position.set(
          cx,
          this.roadHeight(cx, cz, (i + 0.5) / n) + 0.08,
          cz,
        );
        matrix.rotation.set(
          -Math.atan(
            (this.track.heights[(i + 1) % n] - this.track.heights[i]) / len,
          ),
          Math.atan2(dx, dz),
          0,
          "YXZ",
        );
        matrix.scale.set(0.8, 0.1, len + 0.1);
        matrix.updateMatrix();
        if (!this.pitClearance || this.pitClearance.circleClear(cx, cz, 0)) {
          curbs.setMatrixAt(ci, matrix.matrix);
          c.set(
            i % 2
              ? this.track.code === "BE"
                ? "#e5c143"
                : "#ded8bd"
              : "#b94330",
          );
          curbs.setColorAt(ci++, c);
        }
        let x = cx + rx * side * 5,
          z = cz + rz * side * 5;
        matrix.position.set(x, this.roadHeight(x, z, (i + 0.5) / n) + 0.8, z);
        matrix.scale.set(0.12, 0.64, len + 0.05);
        matrix.updateMatrix();
        if (!this.pitClearance || this.pitClearance.circleClear(x, z, 0))
          rails.setMatrixAt(ri++, matrix.matrix);
      }
    }
    rails.count = ri;
    curbs.count = ci;
    rails.castShadow = true;
    curbs.receiveShadow = true;
    this.scene.add(rails, curbs);
    // Start line and a pit wall near the map's starting point.
    const start = this.sample(0);
    const lineGroup = new THREE.Group();
    lineGroup.position.set(start.x, start.y + 0.05, start.z);
    lineGroup.rotation.set(start.pitch, start.yaw, 0, "YXZ");
    for (let x = -w; x < w; x += 0.5)
      for (let z = -0.5; z < 0.5; z += 0.5) {
        let q = new THREE.Mesh(
          boxGeo,
          material(
            (Math.round((x + w) * 2) + Math.round((z + 0.5) * 2)) % 2
              ? "#1e2421"
              : "#dcded2",
          ),
        );
        q.position.set(x + 0.25, 0, z + 0.25);
        q.scale.set(0.5, 0.025, 0.5);
        lineGroup.add(q);
      }
    this.scene.add(lineGroup);
    const gantry = new THREE.Group();
    gantry.position.set(start.x, start.y, start.z);
    gantry.rotation.y = start.yaw;
    const metal = material("#3a423d", 0.4, 0.6);
    const obj = (x, y, z, w, h, d, m) => {
      const a = new THREE.Mesh(boxGeo, m);
      a.position.set(x, y, z);
      a.scale.set(w, h, d);
      a.castShadow = true;
      gantry.add(a);
    };
    for (let x of [-w - 2, w + 2]) obj(x, 4, 0, 0.3, 8, 0.3, metal);
    obj(0, 7.9, 0, this.track.width + 4, 0.9, 0.6, metal);
    const banner = document.createElement("canvas");
    banner.width = 1024;
    banner.height = 128;
    const ctx = banner.getContext("2d");
    ctx.fillStyle = "#18211a";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#eae8d7";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.fillText("APEX / HERITAGE", 512, 82);
    const bm = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(banner),
      side: THREE.DoubleSide,
    });
    let panel = new THREE.Mesh(
      new THREE.PlaneGeometry(this.track.width + 2, 1.4),
      bm,
    );
    panel.position.set(0, 7.7, -0.4);
    gantry.add(panel);
    this.scene.add(gantry);
  }
  buildPits() {
    if (!this.pitTrack) return;
    const t = this.pitTrack,
      w = t.width / 2;
    this.pitMesh = this.surfaceMesh(
      new RoadMask(this.track).cutAll(ribbon(t, -w, w, 0.035)),
      material("#676b68", 0.9),
    );
    for (const side of [-1, 1])
      this.surfaceMesh(
        new RoadMask(this.track).cutAll(
          ribbon(t, side * w, side * (w - 0.12), 0.045),
        ),
        material("#eee7bb"),
      );
    const lane = this.config.pit;
    let k = lane.distances.findIndex((d) => d >= lane.box_distance);
    const p = lane.points[k],
      q = lane.points[k + 1],
      yaw = Math.atan2(q[0] - p[0], q[2] - p[2]);
    const box = new THREE.Group();
    box.position.set(p[0], p[1] + 0.13, p[2]);
    box.rotation.y = yaw;
    for (const x of [-2.2, 2.2]) {
      const a = new THREE.Mesh(boxGeo, material("#e2c25a"));
      a.position.x = x;
      a.scale.set(0.12, 0.025, 9);
      box.add(a);
    }
    for (const z of [-4.5, 4.5]) {
      const a = new THREE.Mesh(boxGeo, material("#e2c25a"));
      a.position.z = z;
      a.scale.set(4.5, 0.025, 0.14);
      box.add(a);
    }
    this.pitCrew = [];
    for (const x of [-4.2, 4.2])
      for (const z of [-1.5, 1.5]) {
        const person = new THREE.Group();
        const body = new THREE.Mesh(cylGeo, material(this.config.color));
        body.position.y = 0.8;
        body.scale.set(0.25, 0.5, 0.25);
        person.add(body);
        const head = new THREE.Mesh(sphereGeo, material("#e3d5bb"));
        head.position.y = 1.45;
        head.scale.set(0.22, 0.22, 0.22);
        person.add(head);
        person.position.set(x, 0, z);
        person.userData.side = Math.sign(x);
        box.add(person);
        this.pitCrew.push(person);
      }
    this.scene.add(box);
    const start = lane.points[4],
      next = lane.points[5],
      sign = new THREE.Group();
    sign.position.set(start[0], start[1] + 2.7, start[2]);
    sign.rotation.y = Math.atan2(next[0] - start[0], next[2] - start[2]);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#183d2a";
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = "#ffe5a0";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PIT → 80", 128, 60);
    const map = new THREE.CanvasTexture(canvas);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 1.6),
      new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }),
    );
    sign.add(board);
    this.scene.add(sign);
  }
  updatePit(s) {
    if (this.pitCrew)
      for (const p of this.pitCrew) {
        p.position.x = p.userData.side * (s.pit_phase === 2 ? 1.45 : 4.2);
        p.rotation.z = s.pit_phase === 2 ? p.userData.side * 0.18 : 0;
      }
  }
  buildMappedBuildings() {
    const layer = mappedScenery.tracks.find((t) => t.id === this.track.id);
    this.mappedBuildings = (layer?.buildings || []).filter((b) => {
      const safe =
        this.clearance.polygonClear(b.footprint) &&
        (!this.pitClearance || this.pitClearance.polygonClear(b.footprint));
      if (!safe) this.sceneryAudit.omittedBuildings++;
      return safe;
    });
    const group = new THREE.Group();
    const mats = this.surfaces.facades();
    this.buildingMaterials = mats;
    const roofMat = this.surfaces.pbr("Concrete023", "#999b91", 0.3);
    for (const b of this.mappedBuildings) {
      const shape = new THREE.Shape(
        b.footprint.map(([x, z]) => new THREE.Vector2(x, -z)),
      );
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: b.height,
        bevelEnabled: false,
        steps: 1,
      });
      geo.rotateX(-Math.PI / 2);
      const uv = geo.attributes.uv,
        normal = geo.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        if (Math.abs(normal.getY(i)) > 0.5) uv.setXY(i, 0.02, 0.02);
        else uv.setXY(i, uv.getX(i) / 10, uv.getY(i) / 12);
      }
      uv.needsUpdate = true;
      // Keep the whole floor embedded in sloping terrain, not floating off one edge.
      const y =
        Math.min(...b.footprint.map(([x, z]) => this.height(x, z))) - 0.2;
      const mesh = new THREE.Mesh(geo, [roofMat, mats[b.osm_id % mats.length]]);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.sceneryAudit.buildings.push(b);
    }
    mergeBody(group);
    this.scene.add(group);
  }
  nearBuilding(x, z, radius) {
    return this.mappedBuildings.some(
      (b) =>
        inside([x, z], b.footprint) ||
        b.footprint.some(
          (p, i) =>
            pointSegmentDistance(
              [x, z],
              p,
              b.footprint[(i + 1) % b.footprint.length],
            ) <
            radius + 1,
        ),
    );
  }
  buildScenery() {
    const p = this.track.points,
      n = p.length,
      forest = this.track.biome === "forest" || this.track.biome === "park";
    const count =
      this.config.quality === "high"
        ? forest
          ? 1500
          : this.track.biome === "coast"
            ? 120
            : 500
        : 180;
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.2, 0.35, 1, 5),
      material("#6b6047", 1),
      count,
    );
    const leaf = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 7, 1),
      material("#354b2f", 1),
      count * 2,
    );
    const matrix = new THREE.Object3D(),
      c = new THREE.Color();
    let accepted = 0;
    for (let i = 0; i < count * 4 && accepted < count; i++) {
      let idx = Math.floor(rnd() * n),
        a = p[idx],
        b = p[(idx + 1) % n],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      let side = rnd() < 0.5 ? -1 : 1;
      let offset = side * (this.track.width / 2 + 18 + rnd() * 260);
      let x = a[0] + (dz / len) * offset + (rnd() - 0.5) * 30,
        z = a[1] - (dx / len) * offset + (rnd() - 0.5) * 30;
      const h = 5 + rnd() * 12,
        radius = h * 0.35;
      // Reject, never shove a failed candidate somewhere else without rechecking.
      if (
        !forestAt(this.photoArea, x, z) ||
        !this.clearance.circleClear(x, z, radius) ||
        (this.pitClearance && !this.pitClearance.circleClear(x, z, radius)) ||
        this.nearBuilding(x, z, radius)
      )
        continue;
      const y = this.height(x, z),
        slot = accepted++;
      this.sceneryAudit.trees.push({ x, z, radius });
      matrix.rotation.set(0, 0, 0);
      matrix.position.set(x, y + h * 0.24, z);
      matrix.scale.set(1, h * 0.5, 1);
      matrix.updateMatrix();
      trunk.setMatrixAt(slot, matrix.matrix);
      for (let j = 0; j < 2; j++) {
        matrix.position.set(x, y + h * (j ? 0.72 : 0.48), z);
        matrix.scale.set(h * (j ? 0.25 : 0.35), h * 0.7, h * (j ? 0.25 : 0.35));
        matrix.rotation.y = rnd() * 6;
        matrix.updateMatrix();
        leaf.setMatrixAt(slot * 2 + j, matrix.matrix);
        c.setHSL(0.22 + rnd() * 0.07, 0.2 + rnd() * 0.2, 0.11 + rnd() * 0.13);
        leaf.setColorAt(slot * 2 + j, c);
      }
    }
    trunk.count = accepted;
    leaf.count = accepted * 2;
    trunk.castShadow = true;
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    this.scene.add(trunk, leaf);
    // Buildings, pits and stands now come from the mapped footprint layer.
    // No random city blocks or arbitrary start-relative garage/stand placement.
    // Braking-distance boards every few hundred metres.
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 128;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext("2d");
    ctx.fillStyle = "#dddcc7";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#1e2822";
    ctx.font = "bold 55px Arial";
    ctx.textAlign = "center";
    ctx.fillText("100", 64, 85);
    const sm = new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(signCanvas),
      side: THREE.DoubleSide,
    });
    for (let i = 30; i < n; i += 75) {
      const a = this.sample(i / n);
      const bx = a.x + Math.cos(a.yaw) * (this.track.width / 2 + 5),
        bz = a.z - Math.sin(a.yaw) * (this.track.width / 2 + 5);
      if (!this.clearance.circleClear(bx, bz, 1.3)) continue;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), sm);
      board.position.set(
        a.x + Math.cos(a.yaw) * (this.track.width / 2 + 5),
        a.y + 2.2,
        a.z - Math.sin(a.yaw) * (this.track.width / 2 + 5),
      );
      board.rotation.y = a.yaw + Math.PI;
      this.scene.add(board);
    }
  }
  buildLandmarks() {
    const biome = this.track.biome;
    const makeBox = (x, y, z, w, h, d, color) => {
      if (!this.clearance.circleClear(x, z, Math.hypot(w, d) / 2)) return null;
      const b = new THREE.Mesh(boxGeo, material(color, 0.7, 0.15));
      b.position.set(x, y, z);
      b.scale.set(w, h, d);
      b.castShadow = true;
      b.receiveShadow = true;
      this.scene.add(b);
      return b;
    };
    if (biome === "coast" || biome === "island") {
      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(14000, 14000),
        material(biome === "coast" ? "#387b87" : "#426e70", 0.22, 0.35),
      );
      sea.rotation.x = -Math.PI / 2;
      sea.position.y =
        (this.track.water_level ?? this.track.sea_level ?? -1.4) + 0.1;
      this.scene.add(sea);
      if (biome === "coast")
        for (let i = 0; i < 24; i++) {
          const x = 515 + (i % 4) * 70,
            z = -170 + Math.floor(i / 4) * 95;
          if (!this.clearance.circleClear(x, z, 24)) continue;
          const hull = new THREE.Mesh(
            new THREE.SphereGeometry(1, 12, 8),
            material("#e4e2d5", 0.25, 0.2),
          );
          hull.position.set(x, -0.5, z);
          hull.scale.set(7, 3, 20);
          hull.castShadow = true;
          this.scene.add(hull);
          makeBox(x, 2, z - 3, 8, 4, 12, "#cddbd5");
          makeBox(x, 2.7, z + 4, 7, 1, 4, "#354d55");
          makeBox(x, 7, z - 5, 0.15, 9, 0.15, "#809392");
        }
    }
    if (this.track.code === "JP") {
      const a = this.sample(0.04);
      const x = a.x + 110,
        z = a.z + 35,
        y = this.height(x, z);
      const wheel = new THREE.Group();
      wheel.position.set(x, y + 30, z);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(24, 0.55, 6, 48),
        material("#d6d1bf", 0.5, 0.4),
      );
      wheel.add(rim);
      const hub = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 10, 8),
        material("#f1e8d0"),
      );
      wheel.add(hub);
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const spoke = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 24, 5),
          material("#c6c8b9", 0.5, 0.5),
        );
        spoke.position.set(Math.cos(angle) * 12, Math.sin(angle) * 12, 0);
        spoke.rotation.z = angle - Math.PI / 2;
        wheel.add(spoke);
        const pod = new THREE.Mesh(
          boxGeo,
          material(["#c8614e", "#97ad78", "#d7ba62", "#62979d"][i % 4]),
        );
        pod.position.set(Math.cos(angle) * 24, Math.sin(angle) * 24, 0);
        pod.scale.set(3, 3.7, 2.5);
        wheel.add(pod);
      }
      mergeBody(wheel);
      if (this.clearance.circleClear(x, z, 28)) this.scene.add(wheel);
      for (let side of [-1, 1]) {
        let support = makeBox(x + side * 8, y + 13, z, 1.2, 28, 1.2, "#acb5a2");
        if (support) support.rotation.z = side * 0.32;
      }
    }
  }

  buildTunnel() {
    const tunnel = this.track.road_corrections?.find(
      (c) => c.type === "tunnel",
    );
    if (!tunnel) return;
    const w = this.track.width / 2,
      n = this.track.points.length,
      start = tunnel.start_index,
      end = tunnel.end_index;
    const length = (end - start + n) % n;
    const inTunnel = (_, i) => {
      const k = Math.floor(i / 2);
      return start < end ? k >= start && k < end : k >= start || k < end;
    };
    const ceiling = this.surfaces.pbr("Concrete023", "#615b51", 0.35);
    ceiling.side = THREE.DoubleSide;
    this.tunnelRoof = this.surfaceMesh(
      ribbon(this.track, -w - 0.65, w + 0.65, 4.65).filter(inTunnel),
      ceiling,
      3,
    );
    this.tunnelRoof.castShadow = true;
    const tiles = this.surfaces.pbr("Concrete023", "#c7c6bd", 0.22);
    tiles.side = THREE.DoubleSide;
    const metal = material("#9aabae", 0.36, 0.72),
      rib = material("#515754", 0.78, 0.15);
    const warm = new THREE.MeshStandardMaterial({
      color: "#ffdf99",
      emissive: "#ffbc54",
      emissiveIntensity: 4,
      toneMapped: false,
    });
    const cool = new THREE.MeshStandardMaterial({
      color: "#deeeff",
      emissive: "#a9dcff",
      emissiveIntensity: 4,
      toneMapped: false,
    });
    const group = new THREE.Group();
    this.tunnelFixtures = [];
    const block = (x, y, z, sx, sy, sz, mat, yaw) => {
      const o = new THREE.Mesh(boxGeo, mat);
      o.position.set(x, y, z);
      o.scale.set(sx, sy, sz);
      o.rotation.y = yaw;
      o.castShadow = false;
      group.add(o);
      return o;
    };
    for (let step = 0; step < length; step++) {
      const i = (start + step) % n,
        j = (i + 1) % n,
        a = this.track.points[i],
        b = this.track.points[j];
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz),
        rx = dz / len,
        rz = -dx / len,
        yaw = Math.atan2(dx, dz);
      const h = (this.track.heights[i] + this.track.heights[j]) / 2,
        cx = (a[0] + b[0]) / 2,
        cz = (a[1] + b[1]) / 2;
      for (const side of [-1, 1]) {
        // Continuous inner wall; seaward daylight slots only toward the exit.
        const open = side === 1 && step > length * 0.72,
          wallHeight = open ? 1.5 : 4.55;
        const wall = block(
          cx + rx * side * (w + 0.45),
          h + wallHeight / 2,
          cz + rz * side * (w + 0.45),
          0.35,
          wallHeight,
          len + 0.06,
          tiles,
          yaw,
        );
        // Use metre-space side UVs rather than one giant stretched panel.
        wall.geometry = boxGeo.clone();
        const uv = wall.geometry.attributes.uv;
        for (let k = 0; k < uv.count; k++)
          uv.setXY(
            k,
            (uv.getX(k) * len) / 2.5,
            (uv.getY(k) * wallHeight) / 2.5,
          );
        if (open)
          block(
            cx + rx * side * (w + 0.45),
            h + 3.2,
            cz + rz * side * (w + 0.45),
            0.48,
            2.9,
            0.45,
            rib,
            yaw,
          );
        for (const level of [0.55, 0.78, 1.01]) {
          block(
            cx + rx * side * (w + 0.12),
            h + level,
            cz + rz * side * (w + 0.12),
            0.16,
            0.095,
            len + 0.06,
            metal,
            yaw,
          );
        }
        block(
          cx + rx * side * (w + 0.28),
          h + 2.6,
          cz + rz * side * (w + 0.28),
          0.32,
          3.7,
          0.18,
          rib,
          yaw,
        );
        if (step % 2 === 0) {
          const lx = cx + rx * side * (w - 0.62),
            lz = cz + rz * side * (w - 0.62),
            mat = (step / 2) % 2 ? warm : cool;
          block(lx, h + 4.34, lz, 0.72, 0.2, 1.12, rib, yaw);
          block(lx, h + 4.21, lz, 0.55, 0.045, 0.82, mat, yaw);
          this.tunnelFixtures.push({
            position: new THREE.Vector3(lx, h + 3.8, lz),
            color: mat === warm ? 0xffc475 : 0xb5ddff,
          });
        }
        // Cable trays / ceiling services run the full portal-to-portal distance.
        block(
          cx + rx * side * (w - 1.3),
          h + 4.45,
          cz + rz * side * (w - 1.3),
          0.24,
          0.16,
          len + 0.03,
          metal,
          yaw,
        );
      }
    }
    mergeBody(group);
    this.scene.add(group);
    this.tunnelLights = Array.from({ length: 4 }, () => {
      const light = new THREE.PointLight(0xe3ecff, 22, 22, 2);
      this.scene.add(light);
      return light;
    });
    this.tunnelAudit = {
      ceilingHeight: 4.65,
      wallSides: 2,
      fixtureCount: this.tunnelFixtures.length,
      guardrailBands: 3,
      seawardSlots: true,
    };
  }
  buildRain() {
    const count = 2000,
      pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 100;
      pos[i * 3 + 1] = rnd() * 60;
      pos[i * 3 + 2] = (rnd() - 0.5) * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: "#d2dfdf",
        size: 0.09,
        transparent: true,
        opacity: 0.6,
      }),
    );
    this.scene.add(this.rain);
  }
  addAI(era, color) {
    const c = makeCar(era, color);
    this.scene.add(c);
    this.ai.push(c);
    return c;
  }
  update(state, dt) {
    if (this.tunnelLights) {
      const nearest = [...this.tunnelFixtures].sort(
        (a, b) =>
          a.position.distanceToSquared(
            new THREE.Vector3(state.x, state.y, state.z),
          ) -
          b.position.distanceToSquared(
            new THREE.Vector3(state.x, state.y, state.z),
          ),
      );
      this.tunnelLights.forEach((light, i) => {
        const f = nearest[i];
        if (f) {
          light.position.copy(f.position);
          light.color.setHex(f.color);
        }
      });
    }
    const p = this.player;
    const y = state.y;
    p.position.set(state.x, y, state.z);
    const pitch = state.pitch || 0;
    p.rotation.set(
      pitch,
      state.yaw,
      -state.steering * Math.min(state.speed / 50, 0.8) * 0.035,
      "YXZ",
    );
    const f = new THREE.Vector3(
      Math.sin(state.yaw) * Math.cos(pitch),
      -Math.sin(pitch),
      Math.cos(state.yaw) * Math.cos(pitch),
    );
    for (const w of p.userData.wheels) {
      w.mesh.rotation.x += (state.speed * dt) / 0.35;
      if (w.front) w.mesh.rotation.y = state.steering * 0.22;
    }
    let cameraPos, target;
    const center = p.position.clone();
    if (this.cameraMode === 0) {
      cameraPos = center
        .clone()
        .addScaledVector(f, -8.6)
        .add(new THREE.Vector3(0, 3.7, 0));
      target = center
        .clone()
        .addScaledVector(f, 10)
        .add(new THREE.Vector3(0, 1, 0));
    } else if (this.cameraMode === 1) {
      cameraPos = center
        .clone()
        .addScaledVector(f, 0.25)
        .add(new THREE.Vector3(0, 1.45, 0));
      target = center
        .clone()
        .addScaledVector(f, 28)
        .add(new THREE.Vector3(0, 1.15, 0));
    } else {
      cameraPos = center
        .clone()
        .addScaledVector(f, -15)
        .add(new THREE.Vector3(0, 9, 0));
      target = center.clone().addScaledVector(f, 10);
    }
    if (!this.cameraInitialized || this.cameraMode === 1) {
      this.camera.position.copy(cameraPos);
      this.cameraInitialized = true;
    } else this.camera.position.lerp(cameraPos, 1 - Math.exp(-dt * 7));
    this.camera.lookAt(target);
    let fov = 58 + Math.min(state.speed / 110, 1) * 10;
    if (Math.abs(this.camera.fov - fov) > 0.1) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.sun.position.copy(center).add(new THREE.Vector3(100, 180, 130));
    this.sun.target.position.copy(center);
    if (this.rain) {
      this.rain.position.copy(center);
      const a = this.rain.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - dt * 32;
        if (y < 0) y = 60;
        a.setY(i, y);
      }
      a.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }
  auditPitSurface(stride = 3) {
    this.scene.updateMatrixWorld(true);
    const t = this.pitTrack,
      ray = new THREE.Raycaster();
    let intrusions = 0,
      missing = 0,
      samples = 0;
    if (!t) return { samples, intrusions, missing };
    for (let i = 0; i < t.points.length - 1; i += stride)
      for (const f of [-0.8, 0, 0.8]) {
        const a = roadPoint(t, i, (f * t.width) / 2, 0.07),
          b = roadPoint(t, i + 1, (f * t.width) / 2, 0.07),
          p = a.map((v, k) => (v + b[k]) / 2);
        ray.set(
          new THREE.Vector3(p[0], Math.max(...this.track.heights) + 100, p[2]),
          new THREE.Vector3(0, -1, 0),
        );
        const hit = ray
          .intersectObject(this.pitMesh)
          .find((h) => Math.abs(h.point.y - p[1]) < 0.5);
        samples++;
        if (!hit) {
          missing++;
          continue;
        }
        if (
          ray
            .intersectObjects([this.terrainMesh, ...this.surfaceOverlays])
            .some((h) => h.point.y > hit.point.y + 0.01)
        )
          intrusions++;
      }
    return { samples, intrusions, missing };
  }
  auditRoadSurface(stride = 10) {
    this.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(),
      p = this.track.points,
      n = p.length;
    let terrainIntrusions = 0,
      overlayIntrusions = 0,
      centerErrors = 0,
      missingRoad = 0,
      samples = 0,
      maxIntrusion = 0,
      maxCenterError = 0;
    const section = (i, lateral) => {
      const a = p[i],
        prev = p[(i + n - 1) % n],
        next = p[(i + 1) % n],
        dx = next[0] - prev[0],
        dz = next[1] - prev[1],
        len = Math.hypot(dx, dz);
      return [a[0] + (dz / len) * lateral, a[1] - (dx / len) * lateral];
    };
    for (let i = 0; i < n; i += stride)
      for (const f of [-0.85, -0.4, 0, 0.4, 0.85]) {
        const j = (i + 1) % n,
          a = section(i, (f * this.track.width) / 2),
          b = section(j, (f * this.track.width) / 2),
          x = (a[0] + b[0]) / 2,
          z = (a[1] + b[1]) / 2;
        const expected =
          (this.track.heights[i] + this.track.heights[j]) / 2 + 0.05;
        ray.set(
          new THREE.Vector3(x, Math.max(...this.track.heights) + 100, z),
          new THREE.Vector3(0, -1, 0),
        );
        const road = ray
          .intersectObject(this.roadMesh)
          .find((h) => Math.abs(h.point.y - expected) < 3);
        if (!road) {
          missingRoad++;
          continue;
        }
        samples++;
        if (f === 0) {
          const delta = Math.abs(road.point.y - expected);
          maxCenterError = Math.max(maxCenterError, delta);
          if (delta > 0.015) centerErrors++;
        }
        const ground = ray
          .intersectObject(this.terrainMesh)
          .find((h) => h.point.y > road.point.y + 0.01);
        const overlay = ray
          .intersectObjects(this.surfaceOverlays)
          .find((h) => h.point.y > road.point.y + 0.01);
        if (ground) {
          terrainIntrusions++;
          maxIntrusion = Math.max(maxIntrusion, ground.point.y - road.point.y);
        }
        if (overlay) {
          overlayIntrusions++;
          maxIntrusion = Math.max(maxIntrusion, overlay.point.y - road.point.y);
        }
      }
    return {
      missingRoad,
      terrainIntrusions,
      overlayIntrusions,
      centerErrors,
      samples,
      maxIntrusion,
      maxCenterError,
    };
  }
  dispose() {
    window.removeEventListener("resize", this.resize);
    const gs = new Set(),
      ms = new Set(),
      ts = new Set();
    this.scene.traverse((o) => {
      if (o.geometry && ![boxGeo, cylGeo, sphereGeo].includes(o.geometry))
        gs.add(o.geometry);
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          ms.add(m);
          for (const v of Object.values(m)) if (v?.isTexture) ts.add(v);
        }
      }
    });
    gs.forEach((g) => g.dispose());
    ms.forEach((m) => m.dispose());
    ts.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.scene.clear();
  }
}

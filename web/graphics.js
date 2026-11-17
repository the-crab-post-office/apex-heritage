import piscine from "../data/monaco-piscine.json";
import { cameraRig } from "./cameras.js";
import { makeCar } from "./car.js";
export { makeCar } from "./car.js";
import {
  mergeBody,
  boxGeo,
  cylGeo,
  sphereGeo,
  material,
} from "./mesh-utils.js";
import imageryManifest from "../data/imagery.json";
import { imageryFor, forestAt } from "./imagery.js";
import {
  CornerIndex,
  buildCornerSurfaces,
  updateFloorSparks,
} from "./corners.js";
import { buildVenue } from "./venue.js";
import { addArchitecture } from "./architecture.js";
import { SurfaceLibrary } from "./materials.js";
import { RoadMask, ribbon, roadPoint } from "./road-surface.js";
import mappedScenery from "../data/buildings.json";
import { CircuitClearance, inside, pointSegmentDistance } from "./scenery.js";
import * as THREE from "three";
import { ElevationField, profileAt } from "./elevation.js";
import { Sky } from "three/addons/objects/Sky.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
const rnd = ((seed) => () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
})(73191);

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
      wet ? "#8c9f9d" : "#b4c8d0",
      wet ? 0.0014 : 0.00038,
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
    this.renderer.toneMappingExposure = wet ? 0.9 : 0.95;
    this.camera = new THREE.PerspectiveCamera(
      60,
      innerWidth / innerHeight,
      0.035,
      11000,
    );
    this.scene.add(
      new THREE.HemisphereLight(
        wet ? "#bdced6" : "#d4e3e6",
        "#5d6545",
        wet ? 2 : 1.35,
      ),
    );
    this.sun = new THREE.DirectionalLight(
      wet ? "#d4dfe1" : "#fff0d2",
      wet ? 1.1 : 2.3,
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
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    if (!wet) {
      const sky = new Sky();
      sky.scale.setScalar(10000);
      const u = sky.material.uniforms;
      u.turbidity.value = 2.5;
      u.rayleigh.value = 2.3;
      u.mieCoefficient.value = 0.004;
      u.mieDirectionalG.value = 0.8;
      u.sunPosition.value.copy(this.sun.position).normalize();
      if (config.quality === "high") {
        const environmentScene = new THREE.Scene();
        environmentScene.add(sky.clone());
        const generator = new THREE.PMREMGenerator(this.renderer);
        this.skyEnvironment = generator.fromScene(
          environmentScene,
          0.045,
          0.1,
          12000,
        );
        this.scene.environment = this.skyEnvironment.texture;
        this.scene.environmentIntensity = 0.35;
        generator.dispose();
        environmentScene.clear();
      }
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
    this.cornerIndex = new CornerIndex(config.details?.facets || []);
    this.buildTrack();
    buildCornerSurfaces(this);
    this.buildPits();
    this.buildScenery();
    this.buildLandmarks();
    this.buildPiscine();
    this.buildTunnel();
    buildVenue(this);
    this.photoReady = Promise.all(this.surfaces.pending);
    this.player = makeCar(config.era, config.color, config.teamData);
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
    const scenicMask =
      this.track.code === "MC"
        ? new RoadMask(
            null,
            0,
            piscine.terrain_mask.map((t) => t.map(([x, z]) => [x, 0, z])),
          )
        : null;
    const dryTriangles = scenicMask ? scenicMask.cutAll(triangles) : triangles;
    const ground = this.surfaceMesh(
      this.pitMask
        ? this.pitMask.cutAll(terrainMask.cutAll(dryTriangles))
        : terrainMask.cutAll(dryTriangles),
      groundMat,
      4,
    );
    terrain.dispose();
    const unmerged = ground.geometry;
    ground.geometry = mergeVertices(unmerged, 0.001);
    unmerged.dispose();
    ground.geometry.computeVertexNormals();
    this.terrainMesh = ground;
    const wet = this.config.weather === "wet";
    // Multiplying a dark road texture by a dark metallic material made wet
    // asphalt nearly black; keep it readable without pretending to be a mirror.
    const roadMat = this.surfaces.pbr(
      "Asphalt012",
      wet ? "#879396" : "#7b8285",
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
    const covered = this.track.road_corrections?.find(
      (c) => c.type === "tunnel",
    );
    if (covered) {
      const position = this.roadMesh.geometry.attributes.position,
        colors = [];
      const tunnelPoints = this.track.points.slice(
        covered.start_index,
        covered.end_index + 1,
      );
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i),
          y = position.getY(i),
          z = position.getZ(i);
        const inside = tunnelPoints.some(
          (p, k) =>
            Math.hypot(p[0] - x, p[1] - z) < this.track.width / 2 + 1 &&
            Math.abs(this.track.heights[covered.start_index + k] + 0.05 - y) <
              1.5,
        );
        colors.push(inside ? 0.42 : 1, inside ? 0.45 : 1, inside ? 0.49 : 1);
      }
      this.roadMesh.geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      roadMat.vertexColors = true;
    }
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
            this.track.code === "MC" ? "Concrete023" : "Grass004",
            "#e0e0ce",
            0.3,
          ),
          4,
        );
        this.surfaceOverlays.push(layer);
      }
    }
    // Kerb/race-safety placement comes exclusively from shared corner/venue data.
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
      this.surfaces.pbr("Asphalt012", "#d3d5ce", 0.22),
    );
    this.pitPaintMeshes = [];
    for (const side of [-1, 1])
      this.pitPaintMeshes.push(
        this.surfaceMesh(
          new RoadMask(this.track).cutAll(
            ribbon(t, side * w, side * (w - 0.12), 0.045),
          ),
          material("#eee7bb"),
        ),
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
    ctx.fillText(`PIT → ${Math.round(lane.limit * 3.6)}`, 128, 60);
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
      const replaced = this.config.venue?.grandstands.some(
        (s) => s.osm_id && s.osm_id === b.osm_id,
      );
      const safe =
        !replaced &&
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
      const y =
        Math.min(...b.footprint.map(([x, z]) => this.height(x, z))) - 0.2;
      const roofY = Math.max(y + b.height, b.roof_height ?? -Infinity);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: roofY - y,
        bevelEnabled: false,
        steps: 1,
      });
      geo.rotateX(-Math.PI / 2);
      const uv = geo.attributes.uv,
        normal = geo.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        if (Math.abs(normal.getY(i)) > 0.5) uv.setXY(i, 0.02, 0.02);
        else {
          const casino = b.name?.includes("Casino");
          const scaleY = casino
            ? b.height * 2
            : ["belle-epoque", "fairmont"].includes(b.style)
              ? (b.height / 7) * 4
              : 12;
          uv.setXY(
            i,
            uv.getX(i) / (casino ? 20 : 10),
            (uv.getY(i) + y - (roofY - b.height)) / scaleY,
          );
        }
      }
      uv.needsUpdate = true;
      // Keep the whole floor embedded in sloping terrain, not floating off one edge.
      b.renderBase = y;
      b.detailBase = roofY - b.height;
      const facade =
        this.track.code === "MC"
          ? mats[
              b.style === "belle-epoque"
                ? 5
                : b.style === "tower"
                  ? 2
                  : b.style === "fairmont"
                    ? 5
                    : 0
            ]
          : mats[b.osm_id % mats.length];
      const mesh = new THREE.Mesh(geo, [roofMat, facade]);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.sceneryAudit.buildings.push(b);
    }
    mergeBody(group);
    this.scene.add(group);
    this.buildingGroup = group;
    addArchitecture(this, this.mappedBuildings);
  }
  auditBuildingMeshes() {
    this.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    let checked = 0,
      hits = 0;
    for (const b of this.mappedBuildings.filter(
      (b) => b.monaco_reference_part,
    )) {
      const p = b.footprint;
      let area = 0;
      for (let i = 0; i < p.length; i++)
        area +=
          p[i][0] * p[(i + 1) % p.length][1] -
          p[(i + 1) % p.length][0] * p[i][1];
      for (let i = 0; i < p.length; i++) {
        const a = p[i],
          q = p[(i + 1) % p.length],
          dx = q[0] - a[0],
          dz = q[1] - a[1],
          len = Math.hypot(dx, dz);
        if (len < 2) continue;
        const nx = (dz / len) * (area > 0 ? 1 : -1),
          nz = (-dx / len) * (area > 0 ? 1 : -1);
        ray.set(
          new THREE.Vector3(
            (a[0] + q[0]) / 2 + nx * 2,
            b.detailBase + b.height * 0.5,
            (a[1] + q[1]) / 2 + nz * 2,
          ),
          new THREE.Vector3(-nx, 0, -nz),
        );
        ray.far = 3;
        checked++;
        if (ray.intersectObject(this.buildingGroup, true).length) hits++;
      }
    }
    return {
      checked,
      hits,
      missing: checked - hits,
      drawBatches: this.buildingGroup.children.length,
    };
  }
  nearBuilding(x, z, radius) {
    if (this.cornerIndex?.at(x, z)) return true;
    if (
      this.config.venue?.grandstands.some(
        (s) =>
          inside([x, z], s.footprint) ||
          s.footprint.some(
            (p, i) =>
              pointSegmentDistance(
                [x, z],
                p,
                s.footprint[(i + 1) % s.footprint.length],
              ) <
              radius + 1,
          ),
      )
    )
      return true;
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
      new THREE.ConeGeometry(1, 1, 11, 3),
      material("#ffffff", 1),
      count * 4,
    );
    const matrix = new THREE.Object3D(),
      c = new THREE.Color();
    let accepted = 0;
    for (let i = 0; i < count * 4 && accepted < count; i++) {
      let idx =
          this.track.code === "BE" && i < 300
            ? 180 + Math.floor(rnd() * 140)
            : Math.floor(rnd() * n),
        a = p[idx],
        b = p[(idx + 1) % n],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      let side = this.track.code === "BE" && i < 300 ? 1 : rnd() < 0.5 ? -1 : 1;
      let offset =
        side *
        (this.track.code === "BE" && i < 300
          ? 95 + rnd() * 160
          : this.track.width / 2 + 18 + rnd() * 260);
      let x = a[0] + (dz / len) * offset + (rnd() - 0.5) * 30,
        z = a[1] - (dx / len) * offset + (rnd() - 0.5) * 30;
      const h = 5 + rnd() * 12,
        radius = h * 0.35;
      // Reject, never shove a failed candidate somewhere else without rechecking.
      if (
        (this.track.code === "MC" &&
          x > -330 &&
          x < 550 &&
          z > 100 &&
          z < 650) ||
        (!forestAt(this.photoArea, x, z) &&
          !(this.track.code === "BE" && i < 300)) ||
        !this.clearance.circleClear(x, z, radius) ||
        (this.pitClearance && !this.pitClearance.circleClear(x, z, radius)) ||
        this.nearBuilding(x, z, radius) ||
        this.config.venue?.grandstands.some((s) =>
          inside([x, z], s.footprint),
        ) ||
        (this.track.code === "BE" &&
          idx >= 135 &&
          idx <= 260 &&
          Math.abs(offset) < 90)
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
      for (let j = 0; j < 4; j++) {
        matrix.position.set(x, y + h * (0.35 + j * 0.16), z);
        matrix.scale.set(
          h * (0.32 - j * 0.065),
          h * 0.44,
          h * (0.32 - j * 0.065),
        );
        matrix.rotation.y = rnd() * 6;
        matrix.updateMatrix();
        leaf.setMatrixAt(slot * 4 + j, matrix.matrix);
        c.setHSL(0.22 + rnd() * 0.07, 0.2 + rnd() * 0.2, 0.17 + rnd() * 0.13);
        leaf.setColorAt(slot * 4 + j, c);
      }
    }
    trunk.count = accepted;
    leaf.count = accepted * 4;
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
      if (this.track.code === "BE" && i >= 140 && i <= 250) continue;
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
  buildPiscine() {
    if (this.track.code !== "MC") return;
    const group = new THREE.Group();
    group.name = "modern-piscine-reference";
    const colors = new Map();
    for (const f of piscine.facets) {
      if (!colors.has(f.color)) colors.set(f.color, []);
      // Winding faces upwards for both water and coping, independently of GIS orientation.
      let p = f.p;
      if (
        (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) -
          (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) >
        0
      )
        p = [p[0], p[2], p[1]];
      colors.get(f.color).push(...p.flat());
    }
    for (const [color, points] of colors) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material(color, 0.55, 0.05));
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    for (const o of piscine.objects) {
      const mesh = new THREE.Mesh(boxGeo, material(o.color));
      mesh.position.set(o.x, o.y, o.z);
      mesh.scale.set(o.sx, o.sy, o.sz);
      mesh.rotation.y = o.yaw;
      mesh.castShadow = true;
      group.add(mesh);
    }
    this.scene.add(group);
    this.piscineGroup = group;
    this.piscineAudit = {
      yachts: piscine.yachts,
      facets: piscine.facets.length,
      objects: piscine.objects.length,
      scope: piscine.scope,
    };
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
      if (biome === "coast" && this.track.code !== "MC")
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
      racingCurbsInside: false,
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
  addAI(era, color, team) {
    const c = makeCar(era, color, team);
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
      (state.body_roll || 0) -
        state.steering * Math.min(state.speed / 50, 0.8) * 0.035,
      "YXZ",
    );
    p.updateMatrix();
    const pose = p.matrix.elements;
    updateFloorSparks(this, state, performance.now() / 1000);
    for (const [wi, w] of p.userData.wheels.entries()) {
      if (state.wheel_heights) {
        const radius = [0.34, 0.35, 0.35, 0.38][this.config.era];
        w.mesh.position.y =
          (state.wheel_heights[wi] +
            radius -
            state.y -
            pose[1] * w.mesh.position.x -
            pose[9] * w.mesh.position.z) /
          pose[5];
      }
      w.mesh.rotation.x += (state.speed * dt) / 0.35;
      if (w.front) w.mesh.rotation.y = state.steering * 0.22;
    }
    const center = p.position.clone();
    this.cameraTime = (this.cameraTime || 0) + dt;
    const rig = cameraRig(
      this.cameraMode,
      this.config.era,
      this.cameraTime,
      this.cameraTuning,
      this.cameraLook,
    );
    // Onboards inherit chassis pitch/roll; exterior cameras retain a level horizon.
    const transform = (v) => {
      const local = new THREE.Vector3(...v);
      if (rig.attached) local.applyQuaternion(p.quaternion);
      else local.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      return local.add(center);
    };
    const cameraPos = transform(rig.position),
      target = transform(rig.target);
    p.traverse((o) => {
      if (o.userData.cameraHideHead) o.visible = !rig.hide_head;
      if (o.userData.cameraGhost) {
        o.material.opacity = rig.hide_head ? 0.22 : 1;
        o.material.depthWrite = !rig.hide_head;
      }
    });
    if (!this.cameraInitialized || rig.attached) {
      this.camera.position.copy(cameraPos);
      this.cameraInitialized = true;
    } else this.camera.position.lerp(cameraPos, 1 - Math.exp(-dt * 7));
    this.camera.up.set(0, 1, 0);
    if (rig.attached) this.camera.up.applyQuaternion(p.quaternion);
    this.camera.lookAt(target);
    const fov =
      rig.fov +
      (rig.id === "chase" && !rig.customFov
        ? Math.min(Math.abs(state.speed) / 110, 1) * 10
        : 0);
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
          .intersectObjects([this.pitMesh, this.roadMesh])
          .find((h) => Math.abs(h.point.y - p[1]) < 1);
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
      maxCenterError = 0,
      pitOverlayHits = 0;
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
        if (
          this.pitMesh &&
          ray.intersectObjects([this.pitMesh, ...(this.pitPaintMeshes || [])])
            .length
        )
          pitOverlayHits++;
        const ground = ray
          .intersectObject(this.terrainMesh)
          .find((h) => h.point.y > road.point.y + 0.01);
        const overlay = ray
          .intersectObjects([
            ...this.surfaceOverlays,
            ...(this.pitMesh ? [this.pitMesh] : []),
          ])
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
      pitOverlayHits,
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
    this.skyEnvironment?.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
}

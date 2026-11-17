import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeCar } from "./car.js";
import { disposeCar } from "./livery.js";
import { eras } from "./catalog.js";
export class Showroom {
  constructor(container) {
    this.container = container;
    this.revision = 0;
    this.inView = true;
    this.last = 0;
    this.renderCount = 0;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = "showroom-canvas";
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D preview of the selected race car",
    );
    container.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.045);
    this.scene.environment = this.environment.texture;
    room.dispose();
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(5.4, 2.3, 7.2);
    this.camera.zoom = 1.6;
    this.camera.updateProjectionMatrix();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.42, 0);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.025;
    this.controls.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    this.controls.autoRotateSpeed = 0.65;
    this.scene.add(new THREE.HemisphereLight("#d5e0ef", "#232528", 1.15));
    const key = new THREE.DirectionalLight("#fff2df", 2.3);
    key.position.set(-3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.normalBias = 0.015;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight("#a9c8e5", 1.5);
    rim.position.set(4, 2, -4);
    this.scene.add(rim);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.7, 96),
      new THREE.MeshStandardMaterial({
        color: "#111619",
        envMapIntensity: 0.15,
        roughness: 0.5,
        metalness: 0.25,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.015;
    this.scene.add(ground);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.48, 3.49, 120),
      new THREE.MeshBasicMaterial({
        color: "#696d60",
        transparent: true,
        opacity: 0.36,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.008;
    this.scene.add(ring);
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d"),
      g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(0,0,0,.65)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.7, 6),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.003;
    this.scene.add(shadow);
    this.resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
      this.dirty = true;
    });
    this.resize.observe(container);
    this.observer = new IntersectionObserver(([e]) => {
      this.inView = e.isIntersecting;
    });
    this.observer.observe(container);
    this.controls.addEventListener("change", () => (this.dirty = true));
    this.tick = this.tick.bind(this);
    this.animation = requestAnimationFrame(this.tick);
  }
  async select(era, index) {
    const rev = ++this.revision;
    this.era = era;
    this.team = index;
    this.container.dataset.ready = "loading";
    if (this.car) disposeCar(this.car);
    const team = eras[era].teams[index];
    this.car = makeCar(era, team.color, team);
    this.car.position.y = [-0.01, 0, 0, 0.03, 0][era];
    this.scene.add(this.car);
    this.dirty = true;
    const ready = await this.car.userData.liveryReady;
    if (rev !== this.revision) return;
    this.container.dataset.ready = ready ? "true" : "fallback";
    this.dirty = true;
    document.getElementById("showroom-status").textContent = ready
      ? "ORIGINAL GEOMETRY / SCAN PENDING"
      : "LIVERY TEXTURE UNAVAILABLE";
  }
  view(kind) {
    const p = {
      front: [3.3, 1.8, 8.5],
      side: [9, 1.9, 0.3],
      rear: [-4.5, 2.5, -7.5],
      hero: [5.4, 2.7, 7.2],
      top: [0.01, 10, 0.01],
      detail: [1.7, 1.7, 2.5],
    }[kind] || [5.4, 2.7, 7.2];
    this.controls.minPolarAngle = kind === "top" ? 0.001 : 0.35;
    this.camera.position.set(...p);
    this.controls.autoRotate = false;
    this.controls.update();
    this.dirty = true;
  }
  tick(now) {
    this.animation = requestAnimationFrame(this.tick);
    if (
      !this.inView ||
      document.hidden ||
      !document.getElementById("race-view").hidden ||
      now - this.last < 30
    )
      return;
    this.last = now;
    const changed = this.controls.update();
    if (changed || this.dirty || this.controls.autoRotate) {
      this.renderer.render(this.scene, this.camera);
      this.renderCount++;
      this.dirty = false;
    }
  }
  dispose() {
    cancelAnimationFrame(this.animation);
    this.resize.disconnect();
    this.observer.disconnect();
    this.controls.dispose();
    if (this.car) disposeCar(this.car);
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

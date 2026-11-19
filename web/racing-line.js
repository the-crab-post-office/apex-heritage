import * as THREE from "three";
import { roadPoint } from "./road-surface.js";
import { racingGuide, guideColour } from "./racing-guide.js";
export class RacingLine {
  constructor(world) {
    this.world = world;
    this.guide = racingGuide(
      world.track,
      world.config.era,
      world.config.weather === "wet",
    );
    this.n = world.track.points.length;
    const positions = [],
      colours = [];
    // A narrow centre-road ribbon stays within every circuit's legal width;
    // road heights preserve the Suzuka crossing and Monaco tunnel branches.
    for (let k = 0; k < this.n * 2; k++) {
      const i = k % this.n,
        j = (i + 1) % this.n;
      const a = roadPoint(world.track, i, -0.2, 0.095),
        b = roadPoint(world.track, j, -0.2, 0.095),
        c = roadPoint(world.track, i, 0.2, 0.095),
        d = roadPoint(world.track, j, 0.2, 0.095);
      // Taper the arrow head and leave a small gap between successive chevrons.
      const mid = (p, q, f) => p.map((v, k) => v + (q[k] - v) * f);
      const left = mid(a, b, 0.12),
        right = mid(c, d, 0.12),
        tip = mid(mid(a, c, 0.5), mid(b, d, 0.5), 0.88);
      positions.push(...left, ...right, ...tip);
      for (let v = 0; v < 3; v++) colours.push(0.16, 0.95, 0.34);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
    this.mesh = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    this.mesh.name = "optional-braking-racing-line";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    world.scene.add(this.mesh);
    this.setVisible(world.config.racingLine !== false);
  }
  setVisible(on) {
    this.mesh.visible = Boolean(on);
  }
  update(state) {
    if (!this.mesh.visible) return;
    const i = Math.max(
        0,
        Math.min(this.n - 1, Math.floor((state.progress || 0) * this.n)),
      ),
      count = Math.min(
        this.n,
        Math.max(20, Math.ceil(220 / (this.world.track.length / this.n))),
      );
    this.mesh.geometry.setDrawRange(i * 3, count * 3);
    const c = this.mesh.geometry.attributes.color;
    for (let k = i; k < i + count; k++) {
      const idx = k % this.n,
        rgb = guideColour(
          Math.abs(state.speed),
          this.guide.targets[idx],
          this.guide.targets[(idx + 1) % this.n],
        );
      for (let v = 0; v < 3; v++) c.setXYZ(k * 3 + v, ...rgb);
    }
    c.needsUpdate = true;
  }
}

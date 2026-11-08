import * as THREE from "three";
const urls = import.meta.glob("./assets/materials/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
});
// Metre-space repeat maps, not a stretched aerial image. CC0 source/processing
// is documented in data/MATERIALS-NOTICE.md. All resources remain local.
export class SurfaceLibrary {
  constructor(renderer) {
    this.renderer = renderer;
    this.pending = [];
    this.maps = new Map();
  }
  map(asset, channel = "Color") {
    const key = `${asset}_1K-JPG_${channel}.jpg`;
    if (this.maps.has(key)) return this.maps.get(key);
    let done;
    this.pending.push(new Promise((resolve) => (done = resolve)));
    const t = new THREE.TextureLoader().load(
      urls[`./assets/materials/${key}`],
      () => done(true),
      undefined,
      () => done(false),
    );
    t.name = key;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    if (channel === "Color") t.colorSpace = THREE.SRGBColorSpace;
    this.maps.set(key, t);
    return t;
  }
  pbr(asset, color = "#ffffff", normal = 0.4) {
    return new THREE.MeshStandardMaterial({
      color,
      map: this.map(asset),
      normalMap: this.map(asset, "NormalGL"),
      normalScale: new THREE.Vector2(normal, normal),
      roughnessMap: this.map(asset, "Roughness"),
      roughness: 1,
      metalness: 0,
    });
  }
  facades() {
    const types = ["stucco", "brick", "glass", "stone", "industrial", "hotel"];
    const materials = types.map((type, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1024;
      const c = canvas.getContext("2d");
      const texture = new THREE.CanvasTexture(canvas);
      texture.name = `facade-${type}`;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(
        8,
        this.renderer.capabilities.getMaxAnisotropy(),
      );
      const bg = this.map(type === "brick" ? "Bricks001" : "Concrete023");
      const draw = () => {
        c.fillStyle = [
          "#cfbda0",
          "#8e5541",
          "#6e929c",
          "#c7c5b8",
          "#9cacae",
          "#ecdac1",
        ][index];
        c.fillRect(0, 0, 1024, 1024);
        if (bg.image?.complete) {
          c.globalAlpha = type === "brick" ? 0.95 : 0.24;
          c.drawImage(bg.image, 0, 0, 1024, 1024);
          c.globalAlpha = 1;
        }
        const cols = type === "glass" ? 6 : type === "industrial" ? 3 : 4,
          rows = type === "industrial" ? 2 : 4;
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < cols; col++) {
            const cell = 1024 / cols,
              floor = 1024 / rows,
              x = col * cell + cell * 0.22,
              y = row * floor + floor * 0.17,
              w = cell * 0.56,
              h = floor * 0.6;
            c.fillStyle = "rgba(25,26,27,.28)";
            c.fillRect(x - 7, y - 6, w + 19, h + 22);
            c.fillStyle = type === "glass" ? "#8babb4" : "#ded9cf";
            c.fillRect(x - 4, y - 4, w + 8, h + 8);
            const g = c.createLinearGradient(x, y, x + w, y + h);
            g.addColorStop(0, "#a6c4cc");
            g.addColorStop(0.4, "#49636b");
            g.addColorStop(1, "#192b34");
            c.fillStyle = g;
            c.fillRect(x + 3, y + 3, w - 6, h - 6);
            c.fillStyle = "rgba(190,214,213,.26)";
            c.beginPath();
            c.moveTo(x + 7, y + 8);
            c.lineTo(x + w * 0.6, y + 8);
            c.lineTo(x + w * 0.35, y + h - 8);
            c.lineTo(x + 7, y + h - 8);
            c.fill();
            c.fillStyle = "#a4a69c";
            c.fillRect(x + w * 0.5 - 2, y, 4, h);
            c.fillRect(x, y + h * 0.53, w, 4);
            c.fillStyle = "#e2d9c8";
            c.fillRect(x - 12, y + h + 4, w + 24, 9);
            if (type === "stucco" || type === "hotel") {
              c.fillStyle = type === "hotel" ? "#3f5652" : "#7d8b78";
              for (const sx of [x - 22, x + w + 8]) {
                c.fillRect(sx, y, 14, h);
                for (let yy = y + 8; yy < y + h; yy += 9) {
                  c.fillStyle = "#55655b";
                  c.fillRect(sx, yy, 14, 2);
                }
              }
              if (type === "hotel") {
                c.fillStyle = "#323e3b";
                c.fillRect(x - 15, y + h * 0.8, w + 30, 5);
                for (let xx = x - 13; xx < x + w + 15; xx += 13)
                  c.fillRect(xx, y + h * 0.8, 3, h * 0.28);
              }
            }
          }
        if (type !== "glass") {
          for (let y = 0; y < 1024; y += 1024 / rows) {
            c.fillStyle = "rgba(27,29,28,.27)";
            c.fillRect(0, y, 1024, 7);
            c.fillStyle = "rgba(250,241,222,.5)";
            c.fillRect(0, y + 7, 1024, 5);
          }
        }
        texture.needsUpdate = true;
      };
      draw();
      Promise.all(this.pending).then(draw);
      const m = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: type === "glass" ? 0.28 : 0.86,
        metalness: type === "glass" ? 0.35 : 0.02,
      });
      m.name = `building-${type}`;
      return m;
    });
    return materials;
  }
}

import init, { Simulation } from "./wasm/apex.js";
import { World } from "./graphics.js";
import { eras, formatTime } from "./catalog.js";
const $ = (s) => document.querySelector(s);
let wasmReady;
class EngineAudio {
  constructor(era, on) {
    this.era = era;
    this.enabled = on;
    this.context = null;
    this.osc = [];
    try {
      const ctx = (this.context = new (
        window.AudioContext || window.webkitAudioContext
      )());
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2100;
      this.gain.connect(filter);
      filter.connect(ctx.destination);
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator(),
          g = ctx.createGain();
        osc.type = i === 0 ? "sawtooth" : "triangle";
        g.gain.value = [0.24, 0.12, 0.07][i];
        osc.connect(g);
        g.connect(this.gain);
        osc.start();
        this.osc.push(osc);
      }
    } catch (e) {
      console.warn("Audio unavailable", e);
    }
  }
  update(s, paused) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const base = (s.rpm || 4000) / [85, 105, 72, 110][this.era];
    this.osc.forEach((o, i) =>
      o.frequency.setTargetAtTime(Math.max(30, base * (i + 1)), now, 0.05),
    );
    this.gain.gain.setTargetAtTime(
      !this.enabled || paused ? 0 : 0.07 + s.throttle * 0.18,
      now,
      0.08,
    );
  }
  dispose() {
    this.osc.forEach((o) => o.stop());
    this.context?.close();
  }
}
export class Race {
  static async create(track, config, callbacks) {
    wasmReady ??= init();
    await wasmReady;
    const r = new Race(track, config, callbacks);
    return r;
  }
  constructor(track, config, callbacks) {
    this.track = track;
    this.config = config;
    this.callbacks = callbacks;
    this.config.color = eras[config.era].teams[config.team].color;
    this.sim = new Simulation(
      config.track,
      config.era,
      config.team,
      config.weather === "wet",
      config.assists,
    );
    this.state = JSON.parse(this.sim.state_json());
    this.world = new World($("#race-canvas"), track, this.config);
    this.keys = new Set();
    this.touch = {};
    this.audio = new EngineAudio(config.era, config.sound);
    this.running = true;
    this.paused = false;
    this.finished = false;
    this.countdown = 3.1;
    this.accumulator = 0;
    this.lastTime = 0;
    this.lastHud = 0;
    this.lastBest = 0;
    this.lastLap = 1;
    this.messageUntil = 0;
    this.ai = [];
    this.gamepadPause = false;
    this.gamepadRecover = false;
    const t = eras[config.era].teams[config.team];
    $("#hud-car").textContent =
      `${t.name} ${t.car} / ${eras[config.era].year}`.toUpperCase();
    $("#hud-circuit").textContent =
      `${track.name} / ${track.country}`.toUpperCase();
    $("#hud-mode").textContent = {
      time: "TIME TRIAL",
      race: "QUICK RACE / 3 LAPS",
      practice: "PRACTICE",
    }[config.mode];
    $("#map-caption").textContent = track.name.toUpperCase();
    $("#race-weather").innerHTML =
      config.weather === "wet"
        ? "☂ &nbsp; WET TRACK / 18°C"
        : "☀ &nbsp; DRY TRACK / 24°C";
    $("#rpm-leds").innerHTML = Array.from({ length: 12 }, () => "<i></i>").join(
      "",
    );
    $("#pause-overlay").hidden = true;
    $("#invalid-label").hidden = true;
    if (config.mode === "race")
      for (let i = 0; i < 5; i++) {
        const ai = {
          u: 0.003 + i * 0.0035,
          speed: 0,
          mesh: this.world.addAI(
            config.era,
            eras[config.era].teams[(i + 1) % 4].color,
          ),
          skill: 0.89 + i * 0.015,
        };
        const p = this.world.sample(ai.u);
        ai.mesh.position.set(p.x, p.y, p.z);
        ai.mesh.rotation.y = p.yaw;
        this.ai.push(ai);
      }
    this.onKeyDown = (e) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "Escape",
        ].includes(e.code)
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) {
        if (e.code === "Escape") this.togglePause();
        if (e.code === "KeyC") this.cycleCamera();
        if (e.code === "KeyR" && !this.paused && this.countdown <= 0)
          this.recover();
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onBlur = () => {
      this.keys.clear();
      if (!this.paused && !this.finished) this.togglePause(true);
    };
    this.onVisibility = () => {
      if (document.hidden) this.onBlur();
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.touchListeners = [];
    document.querySelectorAll("[data-touch]").forEach((b) => {
      const down = (e) => {
          e.preventDefault();
          b.setPointerCapture(e.pointerId);
          this.touch[b.dataset.touch] = true;
        },
        up = (e) => {
          e.preventDefault();
          this.touch[b.dataset.touch] = false;
        };
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("lostpointercapture", up);
      this.touchListeners.push([b, down, up]);
    });
    this.updateAudioButton();
    this.frame = this.frame.bind(this);
  }
  start() {
    this.world.update(this.state, 1 / 60);
    this.animation = requestAnimationFrame(this.frame);
  }
  input() {
    let throttle =
      this.keys.has("KeyW") || this.keys.has("ArrowUp") || this.touch.throttle
        ? 1
        : 0;
    let brake =
      this.keys.has("KeyS") ||
      this.keys.has("ArrowDown") ||
      this.keys.has("Space") ||
      this.touch.brake
        ? 1
        : 0;
    let steer =
      (this.keys.has("KeyA") || this.keys.has("ArrowLeft") || this.touch.left
        ? 1
        : 0) -
      (this.keys.has("KeyD") || this.keys.has("ArrowRight") || this.touch.right
        ? 1
        : 0);
    const gp = navigator.getGamepads?.();
    const pad = gp && Array.from(gp).find(Boolean);
    if (pad) {
      const axis = pad.axes[0] || 0;
      if (Math.abs(axis) > 0.1) steer = -axis;
      throttle = Math.max(throttle, pad.buttons[7]?.value || 0);
      brake = Math.max(brake, pad.buttons[6]?.value || 0);
      const start = pad.buttons[9]?.pressed;
      if (start && !this.gamepadPause) this.togglePause();
      this.gamepadPause = start;
      const a = pad.buttons[0]?.pressed;
      if (a && !this.gamepadRecover && !this.paused) this.recover();
      this.gamepadRecover = a;
    }
    return { throttle, brake, steer };
  }
  frame(time) {
    if (!this.running) return;
    this.wallDelta = this.lastTime ? (time - this.lastTime) / 1000 : 1 / 60;
    const dt = Math.min(this.wallDelta, 0.075);
    this.lastTime = time;
    const input = this.input();
    if (!this.paused && !this.finished) {
      if (this.countdown > 0) {
        this.countdown -= this.wallDelta || dt;
        const m = $("#race-message");
        m.classList.add("countdown");
        m.textContent = this.countdown > 0.1 ? Math.ceil(this.countdown) : "GO";
        if (this.countdown <= 0) {
          m.classList.remove("countdown");
          m.textContent = "FIND YOUR RHYTHM.";
          this.messageUntil = time + 2000;
        }
      } else {
        this.accumulator += dt;
        while (this.accumulator >= 1 / 120) {
          this.sim.step(input.throttle, input.brake, input.steer, 1 / 120);
          this.accumulator -= 1 / 120;
        }
        this.state = JSON.parse(this.sim.state_json());
        this.updateAI(dt);
        this.checkLaps(time);
      }
    }
    if (time - this.lastHud > 70) {
      this.updateHud(time);
      this.lastHud = time;
    }
    this.world.update(this.state, dt);
    this.audio.update(
      this.state,
      this.paused || this.countdown > 0 || this.finished,
    );
    this.animation = requestAnimationFrame(this.frame);
  }
  updateAI(dt) {
    const n = this.track.points.length;
    for (const a of this.ai) {
      const p = this.world.sample(a.u);
      let curve = 0;
      const ahead = Math.max(40, a.speed * 1.8);
      for (let d of [15, ahead * 0.5, ahead]) {
        const b = this.world.sample(a.u + d / this.track.length),
          c = this.world.sample(a.u + (d + 12) / this.track.length);
        let angle = Math.atan2(
          Math.sin(c.yaw - b.yaw),
          Math.cos(c.yaw - b.yaw),
        );
        curve = Math.max(curve, Math.abs(angle) / 12);
      }
      const grip =
        [12, 19, 26, 29][this.config.era] *
        (this.config.weather === "wet" ? 0.7 : 1);
      const target =
        Math.min(
          [74, 84, 91, 94][this.config.era],
          Math.sqrt(grip / Math.max(curve, 0.0001)),
        ) * a.skill;
      a.speed += Math.max(-28, Math.min(12, (target - a.speed) * 2)) * dt;
      a.u += (a.speed * dt) / this.track.length;
      const q = this.world.sample(a.u);
      a.mesh.position.set(
        q.x + Math.cos(q.yaw) * (a.skill - 0.92) * 18,
        q.y + 0.03,
        q.z - Math.sin(q.yaw) * (a.skill - 0.92) * 18,
      );
      a.mesh.rotation.y = q.yaw;
      const aheadY = this.world.sample(a.u + 3 / this.track.length);
      a.mesh.rotation.x = (q.y - aheadY.y) / 3;
      for (const w of a.mesh.userData.wheels)
        w.mesh.rotation.x += (a.speed * dt) / 0.35;
    }
  }
  checkLaps(time) {
    const s = this.state;
    if (s.best && s.best !== this.lastBest) {
      this.lastBest = s.best;
      this.callbacks.onRecord(s.best);
      $("#race-message").textContent = "PERSONAL BEST · " + formatTime(s.best);
      this.messageUntil = time + 3500;
    }
    if (s.lap !== this.lastLap) {
      this.lastLap = s.lap;
      if (this.config.mode === "race" && s.lap > 3) {
        this.finish();
        return;
      }
      if (!s.best || s.last !== s.best) {
        $("#race-message").textContent = "LAP COMPLETE · " + formatTime(s.last);
        this.messageUntil = time + 3000;
      }
    }
  }
  updateHud(time) {
    const s = this.state;
    $("#hud-speed").textContent = Math.round(s.speed * 3.6)
      .toString()
      .padStart(3, "0");
    $("#hud-gear").textContent = s.speed < 0.5 ? "N" : s.gear;
    $("#hud-lap").textContent =
      this.config.mode === "race" ? `${Math.min(s.lap, 3)} / 3` : s.lap;
    $("#hud-time").textContent = formatTime(s.lap_time || 0.001);
    $("#hud-best").textContent = formatTime(s.best);
    $("#hud-last").textContent = formatTime(s.last);
    $("#throttle-bar").style.height = `${s.throttle * 100}%`;
    $("#brake-bar").style.height = `${s.brake * 100}%`;
    $("#invalid-label").hidden = !s.invalid;
    $("#hud-position").textContent =
      this.config.mode === "race" ? `P${this.position()} / 6` : "FREE RUN";
    const peak = [10000, 12500, 19000, 12500][this.config.era];
    document
      .querySelectorAll("#rpm-leds i")
      .forEach((led, i) =>
        led.classList.toggle("lit", s.rpm / peak > (i + 1) / 13),
      );
    if (this.countdown <= 0 && !this.finished) {
      const m = $("#race-message");
      if (s.offtrack) {
        m.textContent = "OFF TRACK · EASE BACK ON";
        m.classList.remove("countdown");
      } else if (time > this.messageUntil) m.textContent = "";
    }
    this.drawMap();
  }
  position() {
    const progress = this.state.lap - 1 + this.state.progress;
    return 1 + this.ai.filter((a) => a.u > progress).length;
  }
  drawMap() {
    const canvas = $("#minimap"),
      ctx = canvas.getContext("2d"),
      p = this.track.points;
    const xs = p.map((a) => a[0]),
      zs = p.map((a) => a[1]),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    const scale = Math.min(200 / (maxX - minX), 145 / (maxZ - minZ));
    const ox = 120 - ((minX + maxX) / 2) * scale,
      oz = 92 - ((minZ + maxZ) / 2) * scale;
    ctx.clearRect(0, 0, 240, 190);
    ctx.beginPath();
    p.forEach((a, i) => {
      const x = a[0] * scale + ox,
        y = a[1] * scale + oz;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#071408aa";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "#d5dfc5";
    ctx.lineWidth = 2.4;
    ctx.stroke();
    for (const a of this.ai) {
      const q = this.world.sample(a.u);
      ctx.beginPath();
      ctx.arc(q.x * scale + ox, q.z * scale + oz, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#b3c89d";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(
      this.state.x * scale + ox,
      this.state.z * scale + oz,
      5,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#fc7546";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffdcc2";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  cycleCamera() {
    this.world.cameraMode = (this.world.cameraMode + 1) % 3;
    this.world.cameraInitialized = false;
    this.callbacks.toast(
      ["Chase camera", "Cockpit camera", "High chase camera"][
        this.world.cameraMode
      ],
    );
  }
  recover() {
    this.sim.recover();
    this.state = JSON.parse(this.sim.state_json());
    this.world.cameraInitialized = false;
    this.callbacks.toast("Recovered to track · current lap invalidated");
  }
  togglePause(force) {
    if (this.finished) return;
    this.paused = force === undefined ? !this.paused : force;
    this.keys.clear();
    this.touch = {};
    $("#pause-overlay").hidden = !this.paused;
    this.audio.context?.resume();
  }
  toggleAudio() {
    this.audio.enabled = !this.audio.enabled;
    this.audio.context?.resume();
    this.updateAudioButton();
  }
  updateAudioButton() {
    $("#audio-toggle").innerHTML =
      `${this.audio.enabled ? "◖))" : "◖×"} &nbsp; AUDIO ${this.audio.enabled ? "ON" : "OFF"}`;
  }
  finish() {
    this.finished = true;
    const place = this.position();
    $("#race-message").textContent = `CHEQUERED FLAG · P${place} / 6`;
    $("#race-message").classList.remove("countdown");
    $("#pause-overlay").hidden = false;
    $("#pause-overlay .eyebrow").textContent = "CHEQUERED FLAG";
    $("#pause-overlay h2").textContent = `P${place}. Race complete.`;
    $("#pause-overlay p").textContent =
      `Total ${formatTime(this.state.elapsed)} · Best ${formatTime(this.state.best)}`;
    $("#resume-race").hidden = true;
  }
  dispose() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.animation);
    this.audio.dispose();
    this.world.dispose();
    this.sim.free();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    for (const [b, d, u] of this.touchListeners) {
      b.removeEventListener("pointerdown", d);
      b.removeEventListener("pointerup", u);
      b.removeEventListener("pointercancel", u);
      b.removeEventListener("lostpointercapture", u);
    }
    $("#pause-overlay .eyebrow").textContent = "TAKE A BREATHER";
    $("#pause-overlay h2").textContent = "Race paused.";
    $("#pause-overlay p").textContent = "The next apex can wait.";
    $("#resume-race").hidden = false;
  }
}

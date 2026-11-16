import { CAMERAS } from "./cameras.js";
import * as Core from "./wasm/apex.js";
import { assertCompatibleBuild } from "./build-check.js";
import { Controller } from "./controller.js";
import { World } from "./graphics.js";
import { EngineAudio } from "./audio/engine-audio.js";
import { eras, formatTime } from "./catalog.js";
const $ = (s) => document.querySelector(s);
let wasmReady;
export class Race {
  static async create(track, config, callbacks) {
    wasmReady ??= Core.default();
    await wasmReady;
    let coreVersion, coreHash;
    try {
      coreVersion = Core.build_version?.();
      coreHash = Core.track_data_hash?.();
    } catch {}
    const response = await fetch(`/version.json?check=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok)
      throw Object.assign(
        new Error(
          "Build verification failed. Extract and serve the complete latest web ZIP.",
        ),
        { code: "APEX_BUILD_MISMATCH" },
      );
    const server = await response.json();
    const verified = assertCompatibleBuild({
      version: __APP_VERSION__,
      hash: __TRACK_DATA_HASH__,
      htmlVersion: document.querySelector('meta[name="apex-build"]')?.content,
      cssVersion: getComputedStyle(document.documentElement)
        .getPropertyValue("--apex-build")
        .trim()
        .replace(/["']/g, ""),
      coreVersion,
      coreHash,
      serverVersion: server.version,
      serverHash: server.hash,
    });
    $("#hud-build").textContent =
      `v${verified.version} · data ${verified.hash}`;
    const r = new Race(track, config, callbacks);
    await Promise.all([r.audio.ready, r.world.photoReady]);
    return r;
  }
  constructor(track, config, callbacks) {
    this.track = track;
    this.config = config;
    this.callbacks = callbacks;
    this.config.teamData = eras[config.era].teams[config.team];
    this.config.color = this.config.teamData.color;
    this.sim = new Core.Simulation(
      config.track,
      config.era,
      config.team,
      config.weather === "wet",
      config.assists,
    );
    this.state = JSON.parse(this.sim.state_json());
    this.pit = JSON.parse(this.sim.pit_geometry_json());
    this.world = new World($("#race-canvas"), track, {
      ...this.config,
      pit: this.pit,
      venue: JSON.parse(this.sim.venue_geometry_json()),
      details: JSON.parse(this.sim.corner_geometry_json()),
    });
    const note = document.getElementById("hud-layout");
    if (note) {
      note.textContent = this.world.config.details.label;
      note.title = this.world.config.details.notes;
    }
    this.keys = new Set();
    this.touch = {};
    this.audio = new EngineAudio(
      config.era,
      config.sound,
      config.volume ?? 0.65,
    );
    this.running = true;
    this.paused = false;
    this.finished = false;
    this.countdown = 3;
    this.accumulator = 0;
    this.lastTime = 0;
    this.lastHud = 0;
    this.lastBest = 0;
    this.lastLap = 1;
    this.messageUntil = 0;
    this.ai = [];
    this.controller = new Controller();
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
            eras[config.era].teams[
              (config.team + i + 1) % eras[config.era].teams.length
            ].color,
            eras[config.era].teams[
              (config.team + i + 1) % eras[config.era].teams.length
            ],
          ),
          skill: 0.89 + i * 0.015,
        };
        const p = this.world.sample(ai.u);
        ai.mesh.position.set(p.x, p.y, p.z);
        ai.mesh.rotation.y = p.yaw;
        this.ai.push(ai);
      }
    this.cameraPicker = $("#camera-picker");
    this.cameraPicker.replaceChildren(
      ...CAMERAS.map((rig, i) => {
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = rig.label;
        return option;
      }),
    );
    this.cameraPicker.value = String(this.world.cameraMode);
    this.onCameraChange = () => this.setCamera(Number(this.cameraPicker.value));
    this.cameraPicker.addEventListener("change", this.onCameraChange);
    this.onKeyDown = (e) => {
      if (e.target?.closest?.("select, input, textarea, button")) return;
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
      this.audio.resume();
      if (!e.repeat) {
        if (e.code === "Escape") this.togglePause();
        if (e.code === "KeyC") this.cycleCamera();
        if (e.code === "KeyP") this.requestPit();
        if (e.code === "KeyL") this.toggleLimiter();
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
    $("#request-pit").onclick = () => this.requestPit();
    $("#pit-practice").hidden = config.mode !== "practice";
    $("#pit-practice").onclick = () => {
      if (this.paused) return;
      this.sim.start_pit_practice();
      this.state = JSON.parse(this.sim.state_json());
      this.world.cameraInitialized = false;
      this.countdown = -1;
      $("#race-message").textContent = "";
      $("#race-message").classList.remove("countdown");
      this.callbacks.toast("Pit practice · staged before entry · invalid lap");
    };
    $("#pit-limiter").onclick = () => this.toggleLimiter();
    this.updateAudioButton();
    this.frame = this.frame.bind(this);
    this.updateHud(0);
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
    const pad = this.controller.poll();
    if (pad.steer !== 0) steer = pad.steer;
    throttle = Math.max(throttle, pad.throttle);
    brake = Math.max(brake, pad.brake);
    if (pad.pressed.size || throttle > 0) this.audio.resume();
    if (pad.pressed.has(9)) this.togglePause();
    if (pad.pressed.has(8) && (this.paused || this.finished)) {
      this.callbacks.onExit();
      return { throttle: 0, brake: 0, steer: 0 };
    }
    if (pad.pressed.has(5)) this.cycleCamera();
    if (pad.pressed.has(2)) this.requestPit();
    if (pad.pressed.has(3)) this.toggleLimiter();
    if (pad.pressed.has(1) && !this.paused && this.countdown <= 0)
      this.recover();
    if (this.controller.lost && !this.paused) this.togglePause(true);
    if (this.controller.connected)
      $("#controller-status").textContent =
        "CONTROLLER · LS steer / RT drive / LT brake";
    else
      $("#controller-status").textContent =
        "KEYBOARD / TOUCH · Connect a standard gamepad";
    return { throttle, brake, steer };
  }
  frame(time) {
    if (!this.running) return;
    this.wallDelta = this.lastTime ? (time - this.lastTime) / 1000 : 1 / 60;
    const dt = Math.min(this.wallDelta, 0.075);
    this.lastTime = time;
    const input = this.input();
    if (!this.running) return;
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
      this.ai,
      this.world.cameraMode,
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
      a.speed = Math.max(
        0,
        a.speed +
          (Math.max(-28, Math.min(12, (target - a.speed) * 2)) -
            (9.81 * p.grade) / Math.sqrt(1 + p.grade * p.grade)) *
            dt,
      );
      a.u += (a.speed * dt) / this.track.length;
      const q = this.world.sample(a.u);
      a.mesh.position.set(
        q.x + Math.cos(q.yaw) * (a.skill - 0.92) * 18,
        q.y + 0.03,
        q.z - Math.sin(q.yaw) * (a.skill - 0.92) * 18,
      );
      a.mesh.rotation.set(q.pitch, q.yaw, 0, "YXZ");
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
    $("#pit-resources").textContent =
      `TYRES ${Math.round(s.tyre_condition * 100)}% · FUEL ${Math.round(s.fuel * 100)}% · STOPS ${s.pit_stops}`;
    const distance = Math.max(0, this.pit.box_distance - s.pit_distance);
    $("#pit-status").textContent =
      s.pit_phase === 2
        ? `SERVICING · ${s.pit_remaining.toFixed(1)}s · ${[0, 2].includes(this.config.era) ? "TYRES + FUEL" : "TYRES ONLY"}`
        : s.pit_active
          ? s.pit_missed
            ? "BOX MISSED · DRIVE TO EXIT"
            : s.pit_phase === 3
              ? "SERVICE COMPLETE · DRIVE TO EXIT"
              : `PIT ASSIST · BOX ${distance.toFixed(0)}m · BRAKE TO STOP`
          : s.pit_requested
            ? "PIT REQUESTED · ENTER AT MARKED LANE"
            : "P / X · REQUEST PIT STOP";
    $("#request-pit").textContent = s.pit_requested
      ? "PIT REQUESTED · P / X"
      : "REQUEST PIT · P / X";
    $("#pit-limiter").textContent =
      `${Math.round(this.pit.limit * 3.6)} km/h LIMITER ${s.pit_limiter ? "ON" : "OFF"} · L / Y`;
    $("#pit-limiter").setAttribute("aria-pressed", String(s.pit_limiter));
    $("#hud-elevation").textContent = `${Math.round(s.y - 0.1)} m`;
    $("#hud-grade").textContent =
      `${s.grade >= 0 ? "+" : ""}${(s.grade * 100).toFixed(1)}%`;
    $("#hud-grade").classList.toggle("climbing", s.grade > 0.005);
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
    this.world.updatePit?.(s);
    const peak = [10000, 12500, 19000, 12500][this.config.era];
    document
      .querySelectorAll("#rpm-leds i")
      .forEach((led, i) =>
        led.classList.toggle("lit", s.rpm / peak > (i + 1) / 13),
      );
    if (this.countdown <= 0 && !this.finished) {
      const m = $("#race-message");
      if (s.bottoming > 0.08) {
        m.textContent = "FLOOR STRIKE · RAISED KERB";
        m.classList.remove("countdown");
      } else if (s.impact > 0.08) {
        m.textContent = "BARRIER IMPACT · LAP INVALID";
        m.classList.remove("countdown");
      } else if (s.offtrack) {
        m.textContent = "ALL FOUR WHEELS OFF TRACK · LAP INVALID";
        m.classList.remove("countdown");
      } else if (
        s.rear_slip > 0.3 ||
        Math.abs(Math.sin(s.yaw - s.travel_yaw)) > 0.35
      ) {
        m.textContent = "REAR GRIP LOSS · EASE THROTTLE · COUNTERSTEER";
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
  requestPit() {
    if (this.paused || this.finished) return;
    const requested = this.sim.request_pit();
    this.state = JSON.parse(this.sim.state_json());
    this.callbacks.toast(
      requested
        ? "Pit stop requested · follow PIT entry arrows · P/X cancels"
        : "Pit request cancelled",
    );
  }
  toggleLimiter() {
    if (this.paused || this.finished) return;
    const on = this.sim.toggle_limiter();
    this.state = JSON.parse(this.sim.state_json());
    this.callbacks.toast(
      on
        ? `${Math.round(this.pit.limit * 3.6)} km/h limiter ON · brake to slow before entry`
        : "Pit limiter OFF",
    );
  }
  setCamera(mode) {
    if (!Number.isInteger(mode) || !CAMERAS[mode]) return;
    this.world.cameraMode = mode;
    this.world.cameraTime = 0;
    this.world.cameraInitialized = false;
    this.cameraPicker.value = String(mode);
    this.callbacks.toast(`${CAMERAS[mode].label} camera`);
  }
  cycleCamera() {
    this.setCamera((this.world.cameraMode + 1) % CAMERAS.length);
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
    this.audio.resume();
  }
  toggleAudio() {
    this.audio.enabled = !this.audio.enabled;
    this.audio.resume();
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
    this.cameraPicker.removeEventListener("change", this.onCameraChange);
    this.world.dispose();
    this.sim.free();
    for (const id of ["#request-pit", "#pit-limiter", "#pit-practice"])
      $(id).onclick = null;
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

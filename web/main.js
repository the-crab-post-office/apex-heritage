import { Controller } from "./controller.js";
import { elevationSVG } from "./elevation.js";
import {
  createIcons,
  ArrowUpRight,
  ArrowRight,
  Monitor,
  SlidersHorizontal,
  Flag,
  ChevronDown,
  Info,
  Sun,
  CloudRain,
  Keyboard,
  Gauge,
  X,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Check,
} from "lucide";
import { eras, cities, mapSVG, formatTime } from "./catalog.js";
const icons = {
  ArrowUpRight,
  ArrowRight,
  Monitor,
  SlidersHorizontal,
  Flag,
  ChevronDown,
  Info,
  Sun,
  CloudRain,
  Keyboard,
  Gauge,
  X,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Check,
};
export const refreshIcons = () => createIcons({ icons });
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
import tracks from "./assets/tracks.json";
const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const store = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
const saved = readStorage("apex-config", {});
let config = {
  track: 0,
  era: 2,
  team: 0,
  weather: "dry",
  assists: true,
  mode: "time",
  quality: "high",
  sound: true,
  volume: 0.65,
  ...saved,
};
config.track = Math.min(9, Math.max(0, Number(config.track) || 0));
config.era = Math.min(3, Math.max(0, Number(config.era) || 0));
config.team = Math.min(3, Math.max(0, Number(config.team) || 0));
let records = readStorage("apex-records-v6-rear-grip", []),
  race = null,
  filter = "all",
  toastTimer;
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function save() {
  store("apex-config", config);
}
function showDialog(html) {
  $("#dialog-content").innerHTML = html;
  refreshIcons();
  if (!$("#info-dialog").open) $("#info-dialog").showModal();
}
$(".dialog-close").onclick = () => $("#info-dialog").close();
$("#info-dialog").addEventListener("click", (e) => {
  if (e.target === $("#info-dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
function updateMachine() {
  const era = eras[config.era];
  $("#team-select").innerHTML = era.teams
    .map(
      (t, i) =>
        `<option value="${i}" ${i === config.team ? "selected" : ""}>${t.name} ${t.car}</option>`,
    )
    .join("");
  $("#team-color").style.background = era.teams[config.team].color;
  $("#team-engine").textContent = era.engine;
  $("#car-trait").textContent = era.trait;
  $("#car-power").textContent = era.teams[config.team].power + " hp";
  $("#era-choices").innerHTML = eras
    .map(
      (e, i) =>
        `<button class="era-choice ${config.era === i ? "selected" : ""}" data-era="${i}" aria-pressed="${config.era === i}"><strong>${e.year}</strong><span>${e.short}</span></button>`,
    )
    .join("");
  $$("[data-era]").forEach(
    (b) =>
      (b.onclick = () => {
        config.era = +b.dataset.era;
        config.team = 0;
        updateMachine();
        save();
      }),
  );
}
function updateTrack() {
  const t = tracks[config.track];
  $("#hero-country").innerHTML =
    `<span class="flag flag-${t.code.toLowerCase()}"></span> ${cities[config.track]}, ${t.country}`;
  $("#hero-title").innerHTML =
    `${t.name}<span>${config.track === 0 ? "THE ARDENNES. THE ULTIMATE TEST." : t.tagline.toUpperCase()}</span>`;
  $("#hero-tagline").textContent =
    config.track === 0
      ? "Seven kilometres of racing legend, carved into the Belgian hills."
      : "A legendary layout. An entirely new challenge.";
  $("#hero-length").innerHTML =
    `${(t.length / 1000).toFixed(3)} <small>km</small>`;
  $("#hero-turns").textContent = t.turns;
  $("#hero-type").textContent = `${t.elevation} m`;
  $("#hero-map").innerHTML = mapSVG(t, "#afbf98", 2);
  renderTracks();
  save();
}
function renderTracks() {
  const visible = tracks
    .map((t, i) => ({ ...t, index: i }))
    .filter(
      (t) =>
        filter === "all" ||
        (filter === "Europe"
          ? (t.index < 5 && t.index !== 4) || [6, 7, 9].includes(t.index)
          : [4, 5, 8].includes(t.index)),
    );
  $("#track-grid").innerHTML = visible
    .map(
      (t) =>
        `<button class="track-card ${t.index === config.track ? "selected" : ""}" data-track="${t.index}" data-biome="${t.biome}" aria-pressed="${t.index === config.track}" aria-label="Select ${t.name}"><div class="track-art"><span>${String(t.index + 1).padStart(2, "0")} /</span>${mapSVG(t, t.index === config.track ? "#f0b58f" : "#afc09b", 2.3)}${t.index === config.track ? '<b class="selected-check">✓</b>' : ""}</div><div class="track-info"><div class="track-location">${t.country}<span class="flag flag-${t.code.toLowerCase()}"></span></div><h3>${t.name}</h3><div class="track-meta">${(t.length / 1000).toFixed(3)} km<span></span>${t.turns} corners<i data-lucide="arrow-up-right"></i></div></div></button>`,
    )
    .join("");
  $$("[data-track]").forEach(
    (b) =>
      (b.onclick = () => {
        config.track = +b.dataset.track;
        updateTrack();
        toast(`${tracks[config.track].name} selected`);
      }),
  );
  refreshIcons();
}
function updateControls() {
  $$("[data-mode]").forEach((b) =>
    b.classList.toggle("selected", config.mode === b.dataset.mode),
  );
  $$("[data-weather]").forEach((b) =>
    b.classList.toggle("selected", config.weather === b.dataset.weather),
  );
  $("#assist-toggle").classList.toggle("on", config.assists);
  $("#assist-toggle").setAttribute("aria-checked", config.assists);
  $("#assist-toggle b").textContent = config.assists ? "ON" : "OFF";
}
$$("[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      config.mode = b.dataset.mode;
      updateControls();
      save();
      if (config.mode === "race")
        toast("3 laps · 5 non-colliding AI opponents");
    }),
);
$$("[data-weather]").forEach(
  (b) =>
    (b.onclick = () => {
      config.weather = b.dataset.weather;
      updateControls();
      save();
    }),
);
$("#assist-toggle").onclick = () => {
  config.assists = !config.assists;
  updateControls();
  save();
};
$("#team-select").onchange = (e) => {
  config.team = +e.target.value;
  updateMachine();
  save();
};
$$("[data-filter]").forEach(
  (b) =>
    (b.onclick = () => {
      filter = b.dataset.filter;
      $$("[data-filter]").forEach((x) => x.classList.toggle("active", x === b));
      renderTracks();
    }),
);
function setNav(name) {
  $$("[data-nav]").forEach((b) =>
    b.classList.toggle("active", b.dataset.nav === name),
  );
}
$$("[data-nav]").forEach(
  (b) =>
    (b.onclick = () => {
      const n = b.dataset.nav;
      setNav(n);
      if (n === "circuits")
        $("#circuits-section").scrollIntoView({ behavior: "smooth" });
      else if (n === "drive") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (n === "garage") showGarage();
      else showRecords();
    }),
);
$(".brand").onclick = (e) => {
  e.preventDefault();
  setNav("drive");
  window.scrollTo({ top: 0, behavior: "smooth" });
};
$("#info-dialog").addEventListener("close", () => setNav("drive"));
function showGarage() {
  showDialog(
    `<div class="dialog-kicker">FOUR GENERATIONS. FOUR PERSONALITIES.</div><h2 class="dialog-heading">The evolution of speed.</h2><p class="dialog-subtitle">Not skins. Four independently tuned driving models, with four teams in each era.</p><div class="era-grid">${eras.map((e, i) => `<article class="era-info ${config.era === i ? "chosen" : ""}"><h3>${e.year}</h3><h4>${e.name}</h4><p>${e.description}</p><button data-pick-era="${i}">${config.era === i ? "SELECTED" : "DRIVE THIS ERA"}</button></article>`).join("")}</div><p class="dialog-note">Handling is inspired by each generation, not a validated reproduction of real vehicle telemetry. Car silhouettes and liveries are original, without official logos.</p>`,
  );
  $$("[data-pick-era]").forEach(
    (b) =>
      (b.onclick = () => {
        config.era = +b.dataset.pickEra;
        config.team = 0;
        updateMachine();
        save();
        showGarage();
      }),
  );
}
$("#compare-eras").onclick = showGarage;
$("#era-help").onclick = showGarage;
$("#car-detail").onclick = () => {
  const e = eras[config.era],
    t = e.teams[config.team];
  showDialog(
    `<div class="dialog-kicker">${e.year} / ${e.name}</div><h2 class="dialog-heading">${t.name} ${t.car}</h2><p class="dialog-subtitle">${e.description}</p><div class="spec-grid"><div class="spec-box"><span>POWER · APPROX.</span><b>${t.power} hp</b></div><div class="spec-box"><span>MINIMUM MASS</span><b>${[540, 540, 605, 798][config.era]} kg</b></div><div class="spec-box"><span>GEARBOX</span><b>${[5, 6, 7, 8][config.era]} speed</b></div></div><table class="team-comparison"><thead><tr><th>TEAM / CAR</th><th>POWER</th><th>GRIP INDEX</th><th>BRAKING INDEX</th></tr></thead><tbody>${e.teams.map((t) => `<tr><td><span class="team-dot" style="background:${t.color}"></span>${t.name} ${t.car}</td><td>${t.power} hp</td><td>${t.grip}</td><td>${t.brake}</td></tr>`).join("")}</tbody></table><p class="dialog-note">Indices are relative to the leading car within this era. All values are gameplay approximations, not historical rankings or engineering specifications.</p>`,
  );
};
$("#view-circuit").onclick = () => {
  const t = tracks[config.track];
  showDialog(
    `<div class="dialog-kicker">${t.country} / ${cities[config.track]}</div><h2 class="dialog-heading">${t.name}</h2><p class="dialog-subtitle">${t.tagline}</p><div class="dialog-map">${mapSVG(t, "#cedcb9", 3)}</div><div class="elevation-chart">${elevationSVG(t)}</div><div class="spec-grid"><div class="spec-box"><span>LENGTH</span><b>${(t.length / 1000).toFixed(3)} km</b></div><div class="spec-box"><span>CORNERS</span><b>${t.turns}</b></div><div class="spec-box"><span>TRACK WIDTH · GAME</span><b>${t.width} m</b></div></div><p class="dialog-note">Layout derived from geographic track-map data. Simplified scenery and coordinate-based terrain elevation estimates; not laser-scanned or period-correct layouts. Historical cars drive the same map version. Start reference: ${t.start_reference.status === "snapped to mapped marker" ? `mapped marker, ${t.start_reference.snap_distance} m centreline snap` : "unverified source-order position"}. Building footprints use present-day OSM data; heights may be estimated.</p>`,
  );
};
function showRecords() {
  showDialog(
    `<div class="dialog-kicker">YOUR PERSONAL HALL OF FAME</div><h2 class="dialog-heading">Chasing the perfect lap.</h2><p class="dialog-subtitle">Valid laps are saved on this device. Track limits and recovery invalidate a lap.</p>${records.length ? `<table class="records-table"><thead><tr><th>CIRCUIT</th><th>CAR</th><th>CONDITIONS</th><th>BEST LAP</th></tr></thead><tbody>${records.map((r) => `<tr><td>${tracks[r.track].name}</td><td>${eras[r.era].year} / ${eras[r.era].teams[r.team].name}</td><td>${r.weather.toUpperCase()}${r.assists ? " · ASSISTED" : ""}</td><td>${formatTime(r.best)}</td></tr>`).join("")}</tbody></table><button class="outline-btn" id="clear-records">Clear local records</button>` : '<div class="records-empty">Your first flying lap is waiting.<br><br>Pick a circuit, take the wheel, and make it count.</div>'}`,
  );
  if ($("#clear-records"))
    $("#clear-records").onclick = () => {
      if (confirm("Delete all locally saved lap records?")) {
        records = [];
        store("apex-records-v6-rear-grip", records);
        showRecords();
      }
    };
}
$("#settings-button").onclick = () => {
  showDialog(
    `<div class="dialog-kicker">THE PADDOCK / PREFERENCES</div><h2 class="dialog-heading">Set for your machine.</h2><div class="settings-row"><span>Graphics quality</span><select id="quality-select"><option value="high">High · shadows + dense scenery</option><option value="low">Performance · light scenery</option></select></div><div class="settings-row"><span>Recorded + synthesized audio</span><select id="sound-select"><option value="on">On</option><option value="off">Off</option></select></div><div class="settings-row"><span>Master volume</span><label class="volume-setting"><input id="volume-slider" type="range" min="0" max="100" step="5" aria-label="Master volume"><output id="volume-value"></output></label></div><h3 style="font-weight:400;margin:25px 0 10px">Know your controls.</h3><div class="key-grid"><div><kbd>W / ↑</kbd> Accelerate</div><div><kbd>S / ↓ / SPACE</kbd> Brake</div><div><kbd>A / D / ← / →</kbd> Steer</div><div><kbd>C</kbd> Cycle camera</div><div><kbd>R</kbd> Recover to track</div><div><kbd>ESC</kbd> Pause / resume</div></div><p class="dialog-note">Gamepad: left stick to steer, right trigger to accelerate, left trigger to brake, A to recover, Start to pause. Touch controls appear on small screens. Gear changes are automatic. Assists reduce wheelspin and lateral slip; they do not auto-steer.</p>`,
  );
  $("#volume-slider").value = Math.round((config.volume ?? 0.65) * 100);
  $("#volume-value").textContent = `${$("#volume-slider").value}%`;
  $("#volume-slider").oninput = (e) => {
    config.volume = Number(e.target.value) / 100;
    $("#volume-value").textContent = `${e.target.value}%`;
    save();
  };
  $("#quality-select").value = config.quality;
  $("#sound-select").value = config.sound ? "on" : "off";
  $("#quality-select").onchange = (e) => {
    config.quality = e.target.value;
    save();
  };
  $("#sound-select").onchange = (e) => {
    config.sound = e.target.value === "on";
    save();
  };
};
$("#credits-button").onclick = () =>
  showDialog(
    `<div class="dialog-kicker">INDEPENDENT / BUILT WITH RUST</div><h2 class="dialog-heading">Under the bodywork.</h2><div class="credits-text"><p>APEX / HERITAGE is a playable prototype, not a finished photorealistic simulator. Physics runs in Rust, compiled to WebAssembly. The browser uses Three.js for rendering; the native client uses Macroquad with the same Rust driving model.</p><ul><li>10 geographic circuit layouts from <a href="https://github.com/bacinger/f1-circuits" target="_blank" rel="noopener">Tomislav Bacinger’s F1 circuits</a> (MIT). Original coordinate data smoothed and resampled.</li><li>Building footprints © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">ODbL 1.0</a>. Height values are mapped or explicitly estimated. <a href="/licenses/buildings.json" target="_blank" rel="noopener">Download editable footprint data</a> and <a href="/licenses/OSM.md" target="_blank" rel="noopener">database notices</a>. No random buildings. Five circuit start locations corrected from mapped markers, including Monaco.</li><li>Terrain estimates are produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. <a href="/licenses/elevation.md" target="_blank" rel="noopener">Source, processing and licence notice</a>. Approximately 30 m surface data; tunnel/bridge corrections are estimates, not surveys.</li><li>Vegetation guide: Contains modified Copernicus Sentinel data 2025. Coarse land-cover only, not stretched onto the ground. High-detail surface maps from ambientCG (CC0), with original facade composites; <a href="/licenses/materials.md" target="_blank" rel="noopener">material source/licence</a>. Mapped current pit lanes: <a href="/licenses/pits.md" target="_blank" rel="noopener">OSM source/processing</a>. <a href="/licenses/imagery.md" target="_blank" rel="noopener">Imagery source/licence</a> and <a href="/licenses/imagery.json" target="_blank" rel="noopener">editable scene manifest</a>. Photo references: <a href="https://www.circuitsofthepast.com/eau-rouge-or-raidillon/" target="_blank" rel="noopener">Spa Eau Rouge / Raidillon</a> and circuit photography linked in SOURCES.md. Trackside references inform approximate scenery; only the separately credited Sentinel-2 satellite crops are redistributed.</li><li>Menu artwork is AI-generated concept art, not an in-game screenshot. Cars and facade patterns are original procedural assets; detailed base materials are ambientCG CC0; buildings and pit routes use mapped OSM data.</li><li>Recorded engine layers: <a href="https://commons.wikimedia.org/wiki/File:Lotus-BRM_24_(1962).ogg" target="_blank" rel="noopener">Lotus-BRM 24 (1962)</a>, <a href="https://commons.wikimedia.org/wiki/File:Toleman-Hart_TG183B_(1983).ogg" target="_blank" rel="noopener">Toleman-Hart TG183B (1983)</a> and <a href="https://commons.wikimedia.org/wiki/File:Williams-Renault_FW18_(1996).ogg" target="_blank" rel="noopener">Williams-Renault FW18 (1996)</a> by Edvvc (Ed Pond), <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>. Harmonic timbres extracted from short real-recording windows, phase-locked to RPM; blended with original synthesis. Trackside references, not exact roster cars; 2023 remains procedural.</li><li>Team names identify historically inspired cars. No official logos or licensed car meshes. All team performance values are illustrative gameplay tuning.</li></ul><p>Prototype limitations: filtered surface-model elevation (not road surveys), simplified tyre wear/fuel and assisted mapped current pit lanes with estimated widths/heights/service boxes, no damage, DRS, ERS management or multiplayer. AI follows the circuit and is non-colliding. Native graphics are simpler than the web renderer.</p><p>Git feature branches: <code>feature/circuit-library</code>, <code>feature/rust-dynamics</code>, <code>feature/web-experience</code>. See README.md for build commands and controls.</p></div>`,
  );
let starting = false;
async function startRace() {
  if (starting) return;
  starting = true;
  document.querySelector("#build-error").hidden = true;
  const button = $("#start-race");
  button.disabled = true;
  button.innerHTML = '<i class="loading-ring"></i> PREPARING YOUR GRID';
  try {
    const { Race } = await import("./race.js");
    if (race) {
      race.dispose();
      race = null;
    }
    $("#info-dialog").close();
    $("#race-view").hidden = false;
    document.body.style.overflow = "hidden";
    race = await Race.create(
      tracks[config.track],
      { ...config },
      { onExit: exitRace, onRecord: saveRecord, toast },
    );
    window.__apex = { race, config, getState: () => race?.state };
    race.start();
  } catch (e) {
    console.error(e);
    $("#race-view").hidden = true;
    document.body.style.overflow = "";
    if (e.code === "APEX_BUILD_MISMATCH") {
      const error = document.querySelector("#build-error");
      error.hidden = false;
      error.textContent = e.message;
    } else
      toast(
        "Could not start the 3D session. Check WebGL support and try again.",
      );
    if (race) race.dispose();
    race = null;
  } finally {
    starting = false;
    button.disabled = false;
    button.innerHTML =
      '<i data-lucide="flag"></i><span>LET’S RACE</span><i data-lucide="arrow-right"></i>';
    refreshIcons();
  }
}
function saveRecord(best) {
  const key = (r) =>
    r.track === config.track &&
    r.era === config.era &&
    r.team === config.team &&
    r.weather === config.weather &&
    r.assists === config.assists;
  const old = records.find(key);
  if (!old || best < old.best) {
    if (old) old.best = best;
    else records.push({ ...config, best });
    store("apex-records-v6-rear-grip", records);
  }
}
function exitRace() {
  race?.dispose();
  race = null;
  $("#race-view").hidden = true;
  $("#pause-overlay").hidden = true;
  document.body.style.overflow = "";
  window.__apex = null;
  setNav("drive");
}
$("#start-race").onclick = startRace;
$("#exit-race").onclick = exitRace;
$("#pause-race").onclick = () => race?.togglePause();
$("#resume-race").onclick = () => race?.togglePause(false);
$("#restart-race").onclick = () => {
  race?.dispose();
  race = null;
  $("#pause-overlay").hidden = true;
  startRace();
};
$("#audio-toggle").onclick = () => race?.toggleAudio();
updateMachine();
updateTrack();
updateControls();
refreshIcons();

// Controller-only menu: D-pad chooses circuit; bumpers choose era; A starts.
const menuController = new Controller();
setInterval(() => {
  if (race || document.hidden || starting) return;
  const p = menuController.poll();
  if (p.pressed.has(14) || p.pressed.has(15)) {
    const delta = p.pressed.has(15) ? 1 : -1;
    document
      .querySelector(`[data-track="${(config.track + delta + 10) % 10}"]`)
      ?.click();
  }
  if (p.pressed.has(4) || p.pressed.has(5))
    document
      .querySelector(
        `[data-era="${(config.era + (p.pressed.has(5) ? 1 : 3)) % 4}"]`,
      )
      ?.click();
  if (p.pressed.has(12) || p.pressed.has(13)) {
    const el = document.querySelector("#team-select");
    el.value = String((config.team + (p.pressed.has(13) ? 1 : 3)) % 4);
    el.dispatchEvent(new Event("change"));
  }
  if (p.pressed.has(0)) document.querySelector("#start-race")?.click();
}, 80);

import { centerSelection, revealMenu } from "./menu-motion.js";
import trackPhotoCredits from "./assets/track-photos/credits.json";
const trackPhotoIds = [
  "spa",
  "monaco",
  "monza",
  "silverstone",
  "suzuka",
  "interlagos",
  "imola",
  "nurburgring",
  "montreal",
  "hockenheim",
  "yas",
  "zandvoort",
  "baku",
];
const trackPhotos = Object.fromEntries(
  Object.entries(
    import.meta.glob("./assets/track-photos/*.jpg", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ).map(([p, u]) => [p.split("/").pop().replace(".jpg", ""), u]),
);
import { MenuFlow } from "./menu-flow.js";
import {
  freshBuildURL,
  shouldResumeRace,
  cleanBuildURL,
} from "./build-recovery.js";
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
import tracks from "../data/tracks.json";
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
  racingLine: true,
  mode: "time",
  quality: "high",
  sound: true,
  volume: 0.65,
  ...saved,
};
// Comparison-page deep links select a validated season/team without starting a race.
const comparisonQuery = new URLSearchParams(location.search);
const linkedEra = eras.findIndex(
  (e) => e.year === comparisonQuery.get("season"),
);
if (linkedEra >= 0) {
  config.era = linkedEra;
  const linkedTeam = eras[linkedEra].teams.findIndex(
    (t) => t.id === comparisonQuery.get("constructor"),
  );
  config.team = linkedTeam >= 0 ? linkedTeam : 0;
}
// Circuit navigation is bounded by tracks.length - 1, never a fixed roster.
config.track = Math.min(
  tracks.length - 1,
  Math.max(0, Number(config.track) || 0),
);
config.era = Math.min(eras.length - 1, Math.max(0, Number(config.era) || 0));
config.team = Math.min(
  eras[config.era].teams.length - 1,
  Math.max(0, Number(config.team) || 0),
);
let records = readStorage("apex-records-v16-brake-priority", []),
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
import { liveriesFor } from "./season-liveries.js";
let showroom = null;
let menuFlow = null;
function updateShowroom() {
  const era = eras[config.era],
    t = era.teams[config.team];
  document.documentElement.style.setProperty("--team-accent", t.color);
  document.documentElement.style.setProperty("--team-highlight", t.secondary);
  $("#showroom-team").textContent = t.name.toUpperCase();
  $("#showroom-model").textContent = t.car;
  $("#showroom-engine").textContent = t.engine;
  $("#showroom-power").innerHTML = `${t.power} <small>hp</small>`;
  $("#showroom-number").textContent = String(t.number).padStart(2, "0");
  $("#roster-count").textContent =
    `${era.year} / ${era.teams.length} CONSTRUCTORS`;
  $("#team-counter").textContent = `${config.team + 1} / ${era.teams.length}`;
  if ($("#team-collection").dataset.rosterKey !== String(config.era)) {
    $("#team-collection").dataset.rosterKey = String(config.era);
    $("#team-collection").innerHTML = era.teams
      .map(
        (t, i) =>
          `<button class="team-chip ${i === config.team ? "selected" : ""}" data-team="${i}" aria-label="Select ${t.name} ${t.car}" aria-pressed="${i === config.team}" style="--paint:${t.color};--secondary:${t.secondary};--accent:${t.accent}"><span>${t.name}</span><small>${t.car}</small></button>`,
      )
      .join("");
  }
  $$("[data-team]").forEach((b) => {
    const selected = +b.dataset.team === config.team;
    b.classList.toggle("selected", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  $$("[data-team]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#team-select").value = b.dataset.team;
        $("#team-select").dispatchEvent(new Event("change"));
      }),
  );
  centerSelection($("#team-collection"));
  if (
    document.activeElement === document.body &&
    document.querySelector("#app").dataset.screen === "team"
  )
    $("#team-collection .selected")?.focus({ preventScroll: true });
  let paint = $("#livery-select");
  if (!paint) {
    const wrap = document.createElement("div");
    wrap.className = "season-livery-field";
    wrap.innerHTML = '<label for="livery-select">RACE LIVERY</label><select id="livery-select"></select><small id="livery-description"></small>';
    $("#showroom-stage").insertAdjacentElement("afterend", wrap);
    paint = $("#livery-select");
    paint.onchange = () => { config.livery = paint.value; save(); updateShowroom(); };
  }
  const options = liveriesFor(t);
  if (!options.some(l => l.id === config.livery)) config.livery = "";
  paint.parentElement.hidden = !options.length;
  paint.innerHTML = '<option value="">Season launch livery</option>' + options.map(l => `<option value="${l.id}">${l.label}</option>`).join("");
  paint.value = config.livery;
  const chosen = options.find(l => l.id === config.livery);
  $("#livery-description").textContent = chosen ? chosen.notes + " Original interpretation." : "Photo-guided launch colours · original artwork";
  if (chosen) {
    const source = document.createElement("a");
    source.href = chosen.source; source.target = "_blank"; source.rel = "noopener";
    source.textContent = " Official reference ↗";
    $("#livery-description").append(source);
  }
  if (showroom) {
    showroom.select(config.era, config.team, config.livery);
    revealMenu($("#showroom-stage"));
  }
  menuFlow?.sync();
}
function updateMachine() {
  const era = eras[config.era];
  $("#team-select").innerHTML = era.teams
    .map(
      (t, i) =>
        `<option value="${i}" ${i === config.team ? "selected" : ""}>${t.name} ${t.car}</option>`,
    )
    .join("");
  $("#team-color").style.background = era.teams[config.team].color;
  $("#team-engine").textContent = era.teams[config.team].engine;
  updateShowroom();
  $("#car-trait").textContent =
    config.era === 1 && !era.teams[config.team].turbo
      ? "Naturally aspirated"
      : era.trait;
  $("#car-power").textContent = era.teams[config.team].power + " hp";
  $("#era-choices").innerHTML = eras
    .map((e, i) => ({ ...e, index: i }))
    .sort((a, b) => Number(a.year) - Number(b.year))
    .map(
      (e) =>
        `<button class="era-choice ${config.era === e.index ? "selected" : ""}" data-era="${e.index}" aria-pressed="${config.era === e.index}"><strong>${e.year}</strong><span>${e.short}</span></button>`,
    )
    .join("");
  $$("[data-era]").forEach(
    (b) =>
      (b.onclick = () => {
        config.era = +b.dataset.era;
        updateLayoutNote();
        config.team = 0;
        updateMachine();
        save();
      }),
  );
}
function updateLayoutNote() {
  const note = document.getElementById("layout-note");
  if (note) {
    note.textContent = `${eras[config.era].year} SURFACE PRESET · ${config.era < 3 || config.era >= 4 ? "RECENT LAYOUT SUBSTITUTE" : "RECENT MAPPED ALIGNMENT"}`;
    if (config.track === 0)
      note.textContent += " · EAU ROUGE PHOTO UPDATE (ALL ERAS)";
    if (config.track === 1)
      note.textContent += " · MODERN MONACO SCENERY (ALL ERAS)";
    note.title =
      "Era-specific kerbs/runoff on the supported recent road. Full historic road geometry and facility extents are not reconstructed. At Spa, Eau Rouge/Raidillon uses the same photo-guided modern complex for all eras, as requested. Monaco uses modern photo-guided scenery for every era; barrier offsets and architectural heights are estimates.";
  }
}
function updateTrack() {
  updateLayoutNote();
  const t = tracks[config.track];
  const photo = $("#track-photo"),
    id = trackPhotoIds[config.track],
    credit = trackPhotoCredits.find((c) => c.id === id);
  if (photo.dataset.photoKey !== id) {
    photo.dataset.photoKey = id;
    photo.src = trackPhotos[id];
    photo.alt = `${t.name} — circuit photograph`;
    photo.onload = () => {
      photo.dataset.loaded = "true";
      revealMenu(photo);
    };
    photo.dataset.loaded = "false";
    const link = $("#track-photo-credit");
    link.href = credit.source_page;
    link.textContent = `Photo: ${credit.author} ↗`;
    link.title = credit.changes;
    $("#track-photo-license").href = credit.license_url;
    $("#track-photo-license").textContent = credit.license;
  }
  $("#track-photo-count").textContent =
    `${String(config.track + 1).padStart(2, "0")} / 13`;
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
  menuFlow?.sync();
  save();
}
function renderTracks() {
  const visible = tracks
    .map((t, i) => ({ ...t, index: i }))
    .filter(
      (t) =>
        filter === "all" ||
        (filter === "Europe"
          ? ["BE", "MC", "IT", "GB", "DE", "NL"].includes(t.code)
          : !["BE", "MC", "IT", "GB", "DE", "NL"].includes(t.code)),
    );
  if ($("#track-grid").dataset.filterKey !== filter) {
    $("#track-grid").dataset.filterKey = filter;
    $("#track-grid").innerHTML = visible
      .map(
        (t) =>
          `<button class="track-card ${t.index === config.track ? "selected" : ""}" data-track="${t.index}" data-biome="${t.biome}" aria-pressed="${t.index === config.track}" aria-label="Select ${t.name}"><div class="track-art"><span>${String(t.index + 1).padStart(2, "0")} /</span>${mapSVG(t, t.index === config.track ? "#f0b58f" : "#afc09b", 2.3)}${t.index === config.track ? '<b class="selected-check">✓</b>' : ""}</div><div class="track-info"><div class="track-location">${t.country}<span class="flag flag-${t.code.toLowerCase()}"></span></div><h3>${t.name}</h3><div class="track-meta">${(t.length / 1000).toFixed(3)} km<span></span>${t.turns} corners<i data-lucide="arrow-up-right"></i></div></div></button>`,
      )
      .join("");
  }
  $$("[data-track]").forEach((b) => {
    const selected = +b.dataset.track === config.track;
    b.classList.toggle("selected", selected);
    b.setAttribute("aria-pressed", String(selected));
    b.querySelectorAll("svg path,svg polyline,svg polygon").forEach((p) =>
      p.setAttribute("stroke", selected ? "#f0b58f" : "#afc09b"),
    );
    b.querySelector(".selected-check")?.remove();
    if (selected) {
      const check = document.createElement("b");
      check.className = "selected-check";
      check.textContent = "✓";
      b.querySelector(".track-art").append(check);
    }
  });
  centerSelection($("#track-grid"));
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
  menuFlow?.sync();
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
$("#info-dialog").addEventListener("close", () =>
  menuFlow ? menuFlow.show(menuFlow.screen, false) : setNav("drive"),
);
function showGarage() {
  showDialog(
    `<div class="dialog-kicker">SIX GENERATIONS. SIX PERSONALITIES.</div><h2 class="dialog-heading">The evolution of speed.</h2><p class="dialog-subtitle">Not skins. Six era-specific driving presets, with 68 constructor-season entries across six seasons and sourced 2026 special paint choices.</p><div class="era-grid">${eras.map((e, i) => `<article class="era-info ${config.era === i ? "chosen" : ""}"><h3>${e.year}</h3><h4>${e.name}</h4><p>${e.description}</p><button data-pick-era="${i}">${config.era === i ? "SELECTED" : "DRIVE THIS ERA"}</button></article>`).join("")}</div><p class="dialog-note">Handling is inspired by each generation, not a validated reproduction of real vehicle telemetry. Original car silhouettes with reference-guided colours, period sponsor lettering and stylised markings; not licensed scans or exact race-specific replicas.</p>`,
  );
  $$("[data-pick-era]").forEach(
    (b) =>
      (b.onclick = () => {
        config.era = +b.dataset.pickEra;
        updateLayoutNote();
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
    `<div class="dialog-kicker">${e.year} / ${e.name}</div><h2 class="dialog-heading">${t.name} ${t.car}</h2><p class="dialog-subtitle">${e.description}</p><div class="spec-grid"><div class="spec-box"><span>POWER · APPROX.</span><b>${t.power} hp</b></div><div class="spec-box"><span>MINIMUM MASS</span><b>${[540, 540, 605, 798, 752, 770][config.era]} kg</b></div><div class="spec-box"><span>GEARBOX</span><b>${[5, 6, 7, 8, 8, 8][config.era]} speed</b></div></div><table class="team-comparison"><thead><tr><th>TEAM / CAR</th><th>POWER</th><th>GRIP INDEX</th><th>BRAKING INDEX</th></tr></thead><tbody>${e.teams.map((t) => `<tr><td><span class="team-dot" style="background:${t.color}"></span>${t.name} ${t.car}</td><td>${t.power} hp</td><td>${t.grip}</td><td>${t.brake}</td></tr>`).join("")}</tbody></table><p class="dialog-note">Indices are relative to the leading car within this era. All values are gameplay approximations, not historical rankings or engineering specifications.</p>`,
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
        store("apex-records-v16-brake-priority", records);
        showRecords();
      }
    };
}
$("#settings-button").onclick = () => {
  showDialog(
    `<div class="dialog-kicker">THE PADDOCK / PREFERENCES</div><h2 class="dialog-heading">Set for your machine.</h2><div class="settings-row"><span>Graphics quality</span><select id="quality-select"><option value="high">High · shadows + dense scenery</option><option value="low">Performance · light scenery</option></select></div><div class="settings-row"><span>Recorded + synthesized audio</span><select id="sound-select"><option value="on">On</option><option value="off">Off</option></select></div><div class="settings-row"><span>Master volume</span><label class="volume-setting"><input id="volume-slider" type="range" min="0" max="100" step="5" aria-label="Master volume"><output id="volume-value"></output></label></div><h3 style="font-weight:400;margin:25px 0 10px">Know your controls.</h3><div class="key-grid"><div><kbd>W / ↑</kbd> Accelerate</div><div><kbd>S / ↓ / SPACE</kbd> Brake</div><div><kbd>A / D / ← / →</kbd> Steer</div><div><kbd>C</kbd> Cycle camera</div><div><kbd>R</kbd> Recover to track</div><div><kbd>ESC</kbd> Pause / resume</div></div><p class="dialog-note">Gamepad: left stick to steer, right trigger to accelerate, left trigger to brake, B to recover, Start to pause. Touch controls appear on small screens. Gear changes are automatic. Assists reduce wheelspin and lateral slip; they do not auto-steer.</p>`,
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
    `<div class="dialog-kicker">INDEPENDENT / BUILT WITH RUST</div><h2 class="dialog-heading">Under the bodywork.</h2><div class="credits-text"><p>APEX / HERITAGE is a playable prototype, not a finished photorealistic simulator. Physics runs in Rust, compiled to WebAssembly. The browser uses Three.js for rendering; the native client uses Macroquad with the same Rust driving model.</p><ul><li>${tracks.length} geographic circuit layouts from <a href="https://github.com/bacinger/f1-circuits" target="_blank" rel="noopener">Tomislav Bacinger’s F1 circuits</a> (MIT). Original coordinate data smoothed and resampled.</li><li>Building footprints © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">ODbL 1.0</a>. Height values are mapped or explicitly estimated. <a href="./licenses/buildings.json" target="_blank" rel="noopener">Download editable footprint data</a> and <a href="./licenses/OSM.md" target="_blank" rel="noopener">database notices</a>. No random buildings. Five circuit start locations corrected from mapped markers, including Monaco.</li><li>Terrain estimates are produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. <a href="./licenses/elevation.md" target="_blank" rel="noopener">Source, processing and licence notice</a>. Approximately 30 m surface data (90 m at Baku); tunnel/bridge corrections are estimates, not surveys.</li><li>Vegetation guide: Contains modified Copernicus Sentinel data 2025. Coarse land-cover only, not stretched onto the ground. High-detail surface maps from ambientCG (CC0), with original facade composites; <a href="./licenses/materials.md" target="_blank" rel="noopener">material source/licence</a>. Mapped current pit lanes: <a href="./licenses/pits.md" target="_blank" rel="noopener">OSM source/processing</a>. <a href="./licenses/imagery.md" target="_blank" rel="noopener">Imagery source/licence</a> and <a href="./licenses/imagery.json" target="_blank" rel="noopener">editable scene manifest</a>. Photo references: <a href="https://www.circuitsofthepast.com/eau-rouge-or-raidillon/" target="_blank" rel="noopener">Spa Eau Rouge / Raidillon</a> and circuit photography linked in SOURCES.md. Trackside references inform approximate scenery; separately credited Sentinel-2 satellite crops and the CC BY-SA 4.0 car-comparison photographs are redistributed.</li><li>Corner surfaces and trackside facilities: © OpenStreetMap contributors, ODbL 1.0; <a href="./licenses/venue-osm.json" target="_blank" rel="noopener">retained feature snapshot</a>, <a href="./licenses/corner-details.json" target="_blank" rel="noopener">editable corner database</a> and <a href="./licenses/corner-details.md" target="_blank" rel="noopener">photo references and limitations</a>. Stand extents, kerb dimensions and runoff boundaries are approximate. Historical road reconstructions remain unfinished: the older selections use labelled recent-layout substitutes, not authentic historic roads.</li><li>Photo-guided 0.9 update: the 1967 and 2023 silhouettes use original shared web/native chassis meshes. Eau Rouge/Raidillon uses an authored approximately 40 m climb and the pictured modern kerbs, painted apron and covered stand for ALL eras, as requested. This is not a road survey or a full historical Spa reconstruction. <a href="./licenses/photo-reference.md" target="_blank" rel="noopener">Scope and reference notice</a>.</li><li>2021 car reference photos: © Lukas Raich / Wikimedia Commons, CC BY-SA 4.0. Resized and recompressed, not used as car textures. <a href="./car-comparison.html" target="_blank" rel="noopener">All ten photo/game comparisons and individual source links</a>; <a href="./licenses/car-reference-photos.md" target="_blank" rel="noopener">photo license/scope notice</a>. Shared-base original models with estimated team proportions, not scans.</li><li>The menu showroom renders the actual original in-game car geometry, not concept art. Period sponsor lettering and stylised marks are reference reconstructions, not official licensed assets or endorsements. Public/commercial use may require permissions. Cars and facade patterns are original procedural assets; detailed base materials are ambientCG CC0; buildings and pit routes use mapped OSM data.</li><li>Recorded engine layers: <a href="https://commons.wikimedia.org/wiki/File:Lotus-BRM_24_(1962).ogg" target="_blank" rel="noopener">Lotus-BRM 24 (1962)</a>, <a href="https://commons.wikimedia.org/wiki/File:Toleman-Hart_TG183B_(1983).ogg" target="_blank" rel="noopener">Toleman-Hart TG183B (1983)</a> and <a href="https://commons.wikimedia.org/wiki/File:Williams-Renault_FW18_(1996).ogg" target="_blank" rel="noopener">Williams-Renault FW18 (1996)</a> by Edvvc (Ed Pond), <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>. Harmonic timbres extracted from short real-recording windows, phase-locked to RPM; blended with original synthesis. Trackside references, not exact roster cars; 2021 and 2023 remain procedural.</li><li>Team names identify historically inspired cars. Period sponsor/team markings are original stylised reconstructions, not licensed corporate artwork or car meshes. All team performance values are illustrative gameplay tuning.</li></ul><p>Prototype limitations: filtered surface-model elevation (not road surveys), simplified tyre wear/fuel and assisted mapped current pit lanes with estimated widths/heights/service boxes, no damage, DRS, ERS management or multiplayer. AI follows the circuit and is non-colliding. Native graphics are simpler than the web renderer.</p><p>Git feature branches: <code>feature/circuit-library</code>, <code>feature/rust-dynamics</code>, <code>feature/web-experience</code>. See README.md for build commands and controls.</p></div>`,
  );
let starting = false;
let refreshingBuild = false;
function recoverBuild(error, resume = starting) {
  if (refreshingBuild) return;
  const panel = $("#build-error");
  panel.replaceChildren();
  panel.hidden = false;
  const message = document.createElement("span");
  message.textContent = error.message;
  const retry = document.createElement("button");
  retry.textContent = "Reload latest build";
  retry.onclick = () =>
    location.replace(freshBuildURL(location.href, { resume }));
  panel.append(message, retry);
  const next = freshBuildURL(location.href, { automatic: true, resume });
  if (next) {
    refreshingBuild = true;
    location.replace(next);
  }
}
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverBuild(
    event.payload || new Error("An older game file is no longer available."),
  );
});
async function startRace() {
  if (starting) return;
  starting = true;
  menuFlow?.sync();
  $("#session-loading").hidden = false;
  $("#loading-stage").textContent = "Loading the racing engine…";
  $("#app").inert = true;
  // Paint the opaque loading screen BEFORE synchronous scene construction.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
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
      {
        onExit: exitRace,
        onRecord: saveRecord,
        toast,
        onRacingLine: (on) => {
          config.racingLine = on;
          $("#racing-line").checked = on;
          save();
          menuFlow.sync();
        },
        onProgress: (text) => {
          $("#loading-stage").textContent = text;
        },
      },
    );
    window.__apex = { race, config, getState: () => race?.state };
    // Submit a fully textured frame behind the loading screen. Countdown has
    // not started yet, so slow downloads/GPU compilation cannot consume lights.
    race.world.update(race.state, 0);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    $("#session-loading").hidden = true;
    race.start();
    $("#race-canvas").tabIndex = -1;
    $("#race-canvas").focus({ preventScroll: true });
    history.replaceState(null, "", cleanBuildURL(location.href));
  } catch (e) {
    console.error(e);
    window.__apex = null;
    $("#race-view").hidden = true;
    document.body.style.overflow = "";
    if (e.code === "APEX_BUILD_MISMATCH") {
      recoverBuild(e, true);
    } else
      toast(
        "Could not start the 3D session. Check WebGL support and try again.",
      );
    if (race) race.dispose();
    race = null;
  } finally {
    starting = false;
    $("#session-loading").hidden = true;
    $("#app").inert = Boolean(race);
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
    store("apex-records-v16-brake-priority", records);
  }
}
function exitRace() {
  race?.dispose();
  race = null;
  $("#race-view").hidden = true;
  $("#pause-overlay").hidden = true;
  document.body.style.overflow = "";
  window.__apex = null;
  $("#app").inert = false;
  setNav("drive");
  menuFlow?.show("home");
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
menuFlow = new MenuFlow({
  getConfig: () => config,
  eras,
  tracks,
  onProfile: showRecords,
});
$("#racing-line").checked = config.racingLine !== false;
$("#racing-line").onchange = (e) => {
  config.racingLine = e.target.checked;
  save();
  menuFlow.sync();
};
refreshIcons();

// Controller-only setup: D-pad chooses within the active step, A continues,
// B goes back. It cannot launch from a half-completed setup screen.
const menuController = new Controller();
setInterval(() => {
  if (race || document.hidden || starting || $("#info-dialog").open) return;
  const p = menuController.poll(),
    screen = menuFlow.screen,
    c =
      screen === "mode"
        ? [...$$("[data-mode]")]
        : screen === "era"
          ? $$("[data-era]")
          : screen === "track"
            ? $$("[data-track]")
            : screen === "team"
              ? $$("[data-team]")
              : [];
  const delta =
    p.pressed.has(15) || p.pressed.has(13)
      ? 1
      : p.pressed.has(14) || p.pressed.has(12)
        ? -1
        : 0;
  if (delta && c.length) {
    const i = Math.max(
      0,
      c.findIndex((b) => b.classList.contains("selected")),
    );
    c[(i + delta + c.length) % c.length].click();
  }
  if (p.pressed.has(1)) {
    if (["mode", "era", "track", "team"].includes(screen))
      $("#setup-back").click();
    else menuFlow.show("home");
  }
  if (p.pressed.has(0)) {
    if (screen === "home") $("#play-button").click();
    else if (screen === "team") $("#start-race").click();
    else if (["mode", "era", "track"].includes(screen))
      $("#setup-next").click();
  }
}, 80);

import("./showroom.js")
  .then(({ Showroom }) => {
    showroom = new Showroom($("#showroom-stage"));
    window.__showroom = showroom;
    $("#showroom-rotate").setAttribute(
      "aria-pressed",
      String(showroom.controls.autoRotate),
    );
    updateShowroom();
  })
  .catch((error) => {
    console.warn("Showroom unavailable", error);
    $("#showroom-status").textContent = "3D PREVIEW UNAVAILABLE";
    $("#showroom-stage").dataset.ready = "fallback";
  });
$$("[data-camera]").forEach(
  (b) =>
    (b.onclick = () => {
      showroom?.view(b.dataset.camera);
      $("#showroom-rotate").setAttribute("aria-pressed", "false");
    }),
);
$("#showroom-rotate").onclick = () => {
  if (!showroom) return;
  showroom.controls.autoRotate = !showroom.controls.autoRotate;
  $("#showroom-rotate").setAttribute(
    "aria-pressed",
    String(showroom.controls.autoRotate),
  );
  showroom.dirty = true;
};

if (shouldResumeRace(location.href)) startRace();

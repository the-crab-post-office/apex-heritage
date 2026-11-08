# APEX / HERITAGE

**A playable, unofficial historical single-seater racing prototype for web and native desktop.**

The driving model is written in **Rust** and shared by both clients. The web client compiles that core to **WebAssembly** and renders with Three.js; the native client uses **Macroquad**. Browser rendering/UI are JavaScript, not Rust. No physics JavaScript fallback is used.

> This is the agreed playable-prototype scope, not a photorealistic production simulator. The menu uses labeled AI-generated concept artwork. Gameplay uses original era-specific car geometry, detailed local CC0 materials and mapped OSM buildings/pit routes. No official car meshes, logos or commercial simulator track files are included.

## New in 0.5 — corrected scenery and real mapped pit routes

- **No giant blurred satellite pixels on the ground.** Grass, gravel, concrete, brick and asphalt now use locally bundled **1K (up to 1024 px) ambientCG CC0 colour/normal/roughness maps** where provided, repeated at metre scale with mipmaps/anisotropy. Satellite data only guides coarse vegetation placement; it is not drawn as the ground surface. These are detailed reusable material tiles, not higher-resolution aerial surveys of the circuits.
- **Mapped current pit lanes on all ten circuits**, replacing the same start-relative offset route everywhere. Real OSM way/node IDs and geographic snapshots are retained. Silverstone uses the International lane, Suzuka the main lane, and Nürburgring the GP lane. Monaco includes the newer mapped exit and an explicitly estimated race-day strip through the intervening mapped public street. Pit asphalt and paint are **geometrically subtracted from the race-road footprint**, so they cannot paint a raised ribbon across it at entry/exit. Native batches are kept within renderer limits.
- **Monaco tunnel rebuilt from references:** continuous textured walls and a lower ceiling, panel ribs, three-band metal guardrails, cable trays and alternating warm/cool luminaires. Generic red/white kerbs are omitted inside the tunnel and its asphalt is shaded separately. The browser uses nearby dynamic light pools; daylight openings are limited to the seaward exit section instead of making the whole tunnel an open column canopy. Native now has a simpler matching enclosure and fixtures. Dimensions/detail are authored approximations, not scanned hotel architecture.
- **Six building facade families** in the browser: plaster/shutters, brick, glass curtain wall, stone, industrial and balcony hotel. Roofs have a separate material instead of windows wrapping onto them. Native has repeating brick/concrete surfaces. Footprints remain mapped; facade appearance is original and does not identify the exact real building.
- **More detailed cars across all four eras:** profiled/tapered monocoques and sidepods instead of the former sausage/box body, radiator openings/grilles, cooling louvres, mirrors, suspension, wheel spokes/fasteners, exhausts, diffuser vanes and original number markings. 1967 retains its exposed engine/exhausts; later cars have distinct aero packages and the modern halo. Native also replaces its cube tyres/body with round tyres, spokes and profiled bodywork. Team references still use original graphics without official sponsor marks.

**Still simplified:** lane widths (6 m), heights, exact box positions and pit-wall detail are estimated. Current mapped lanes are shared by all eras. Road heights still use the existing approximate GLO-30 field, not new road surveys. Pit steering is assisted and service/tyre/fuel rules are simplified; AI does not stop. Pit laps remain invalid for records. The shared limiter uses 60 km/h at Monaco and 80 elsewhere as gameplay presets, not a complete historic regulations model. See `data/PITS-NOTICE.md`, `data/MATERIALS-NOTICE.md` and `TESTING.md`.

### Retained 0.4 features

Standard gamepads in both clients: analog triggers/stick, progressive 12% deadzone, edge-triggered actions, menu navigation and disconnect pause. Physical controller hardware remains unverified. Recording-derived 1967/1988/2004 timbres stay phase-locked to RPM with corrected launch/shift behaviour. The 1967 handling retains gentler steering buildup/yaw response and combined traction, without modern aero/braking. Timed player tyre service works in all eras; fuel is replenished for 1967/2004 only.

### Try a pit stop quickly

Select **Practice**, start driving, then click **PIT ENTRY PRACTICE · RESET LAP**. This explicitly stages the car before the pit approach and invalidates the lap. Drive to the marked entry; the requested lane engages assisted steering. Use RT/W to accelerate, LT/Space to brake, and stop with the car centred in the yellow box. Wait for service, then accelerate out. Native: **O** stages the same practice approach. In normal driving use **P / X** to request the next pit entry and **L / Y** to enable the circuit limiter; brake before entering, as the power limiter is not an automatic braking system.

## Corrected in 0.3.2 — terrain/road mesh intersections

The 0.3.1 fix was incomplete: checking sampled height arrays did **not** check the triangles actually drawn. Large terrain triangles could still cut through the road, especially in Monaco, and independently triangulated grass/shoulder strips could overlap it. Actual-mesh browser tests reproduced intrusions up to **2.83 m**, plus 2–7 cm centerline surface errors.

- Terrain triangles are now **clipped out of the projected road footprint**, rather than merely lowering their vertices. Web and native both use spatially indexed polygon subtraction.
- Asphalt and edge paint are disjoint bands with shared centerline cross-sections. Shoulder/apron bands no longer cover the asphalt. Their winding and road texture scale are tested as well.
- Wet asphalt is less excessively dark. This is a readability/material correction, not a new weather or lighting simulation.
- A visible version label (now **v0.5.0**) identifies the web build. Startup verifies HTML, CSS, JS and WASM versions plus the Rust/bundled track-data hash against `version.json`; mixed builds stop with an explicit error. Elevation/grade placeholders are now “—”, and actual telemetry initializes before the first animation frame.
- The previous elevation source/data have **not** been replaced in this patch. They remain filtered, approximately 30 m DSM estimates, **not surveyed road heights**. This fixes demonstrated mesh intersections; it does not certify every real-world crest, gradient or corner elevation.

**Updating:** use the fresh preview labeled v0.5.0, or extract the complete new web ZIP into an **empty directory** and serve it over HTTP. Do not copy individual assets into an older release. See `TESTING.md` for the actual-triangle and camera-walkthrough coverage.

## Earlier 0.3.1 — geographically anchored elevation

The old hand-authored height keyframes were attached to lap fractions, so hills could be in the wrong physical locations even when the two clients agreed. They have been **removed**, not shifted or relabeled.

- All ten circuits now sample a checked-in **Copernicus GLO-30 geographic surface-height grid**. Regeneration is offline, uses each track's map coordinates, and is invariant to changing the start index.
- Surrounding terrain uses the same **2D geographic field**, blended to a road bed nearby, instead of extending the height of the closest track section across the landscape. Arbitrary coast-flattening cutoffs were removed; sea and road use the same datum.
- Monaco's mapped Boulevard Louis II tunnel is corrected separately from the hotel/cliff above it; Suzuka's upper crossing retains explicit bridge clearance. Their approximate 6 m sea-level tunnel road and 8 m bridge clearance are authored corrections, **not surveyed measurements**.
- Vehicles follow geographic ground when leaving the road shoulders. New local lap records use a separate elevation-version key.
- Regression tests verify geographic Spa/Monaco landmarks, tunnel/bridge separation, per-circuit start-rotation invariance, road/ground alignment and offline regeneration.

**Accuracy limit:** approximately 30 m digital *surface* data contains vegetation/buildings and is filtered; it is not laser-scanned road height, bare-earth survey, camber or kerb geometry. See [elevation data notice](data/ELEVATION-NOTICE.md) for source URLs, licences, exact processing and corrections. Refresh the preview and start a new session to load the new data.

To regenerate or re-import the height field (not required to play):

```sh
python3 -m pip install numpy scipy rasterio
python3 scripts/build-elevation.py       # Offline; uses checked-in source window data
python3 scripts/import-elevation.py      # Optional network refresh from bounded COG windows
python3 scripts/build-elevation.py
python3 -m unittest discover -s tests -p 'test_*.py'
npm run test:elevation
```

## New in 0.3 — real recordings + mapped scenery

- **Real engine recordings** for the first three eras: Edvvc (Ed Pond)'s Lotus-BRM 24 (1962), Toleman-Hart TG183B (1983) and Williams-Renault FW18 (1996), CC BY-SA 3.0. The 0.4 update replaces the old looping pitch sweeps with phase-locked recording-derived low/high timbre tables, blended with original synthesis in browser and native. Browser AI retains spatial panning and Doppler. Modern 2023 V6 remains synthesized; missing browser samples also fall back safely.
- **2,878 mapped OpenStreetMap building footprints across all ten circuits**, with original way IDs and height provenance. Positions follow projected polygons rather than random city blocks or arbitrary start-relative pit/stand offsets. Heights use mapped heights, estimated floor counts, or an explicit 8 m default. Present-day maps, not historical architecture.
- **No trees or buildings on the rendered circuit:** continuous checks against every closed-loop segment, complete building polygons and tree-canopy radii. Unsafe candidates are rejected, never shoved somewhere else without a recheck. Forty-six mapped footprint overlaps with the road/margin were omitted rather than relocated.
- **Monaco starts on Boulevard Albert Ier**, snapped to OSM start/finish node 4937755860, not the Casino-area source point zero. Silverstone, Imola, Nürburgring GP and Hockenheim also use mapped start markers. Points, road heights and ground heights rotate together. In 0.3.1, geographic resampling additionally makes this independent of the chosen start index.
- Separate v3 lap-record storage avoids mixing older start-origin records. Runtime credits and downloadable editable OSM data/notices are available at `/licenses/` in development and static builds.

**Important limits:** trackside recordings are not exact in-car or roster-car reproductions. The Hart source is a turbo four-cylinder rather than a V6; 1962/1983/1996 sources approximate later eras. Five circuits (Spa, Monza, Suzuka, Interlagos, Montréal) retain **unverified source-order starts**; no unsupported claim of ten surveyed grid positions is made. Imola uses its distinct race-start marker as the prototype's unified start/lap line. See [OSM notice](data/OSM-NOTICE.md), [audio attribution](web/assets/audio/NOTICE.md) and [SOURCES.md](SOURCES.md).

## Earlier 0.2 update — elevation + engine audio (profiles superseded in 0.3.1)

- Ten continuous, periodic, per-point elevation profiles, shared by Rust and both renderers. Climbing/descending changes acceleration through gravity; the car and camera pitch with the road. Suzuka retains a separated overpass and lower ground.
- Elevation range in circuit selection, a circuit elevation chart, and live relative-height / grade telemetry.
- Replaced the old three-oscillator browser buzz with four-stroke engine wavetables: distinct era timbres, throttle-dependent exhaust/intake, turbo whine, lift-off burble, shift transients and tyre/wind texture. Nearby AI cars have distance attenuation, stereo panning and Doppler pitch in the browser.
- RPM now comes from gear ratios with shift hysteresis and a brief torque cut—not a speed-modulo sawtooth. Upshifts produce a natural RPM/pitch drop.
- Native now has its own streaming, era-specific CPAL engine synthesis; V toggles audio. It does not restart audio clips per frame. If there is no usable output device, driving still works without audio.
- Browser master-volume slider and click-free mute/pause fading. New lap records use a separate storage key so old flat-physics times are not mixed with elevated-track times.

**The original authored profiles have been replaced by filtered geographic DSM estimates in 0.3.1; these are still not road surveys.** The driving model follows road height but remains grounded: no wheel-level suspension or airborne/jump physics. The 0.2 procedural engine system is now augmented by the licensed real recording layers described above.

## Play the web version

Requires Node.js 20.19+ (or a newer compatible release), npm, and a modern browser with WebGL2 and WebAssembly.

```sh
npm ci
npm run dev -- --port 5173
# Open http://localhost:5173
```

Precompiled WASM is included in `web/wasm/`, so **Rust is not required just to play the web client**. Select a circuit, era, team, conditions and session, then click **LET’S RACE**. Graphics quality and audio can be changed using the header settings button. Performance mode disables shadows and reduces scenery/pixel density.

## Build from Rust source

Install stable Rust via rustup, then:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.105 --locked
npm ci
./scripts/build-web.sh
```

The script compiles the shared core, regenerates the WASM bindings and builds the static web release into `site/`. Serve that directory over HTTP(S), **not `file://`**. All runtime assets are local; no CDN, API key or remote game backend is required. Root-path hosting is assumed by the entry page.

```sh
python3 -m http.server 8080 --directory site
```

## Native desktop

```sh
cargo run --release --features native --bin apex-native
```

On Linux, the desktop client needs a graphical session, OpenGL, X11 and the ALSA runtime. Building native audio from source also needs `pkg-config` and ALSA and udev development headers (`sudo apt install pkg-config libasound2-dev libudev-dev` on Debian/Ubuntu). It was release-built and smoke-tested under Xvfb on Linux x86-64. Windows/macOS targets have not been tested here; compile from source on those platforms. No Windows/macOS binaries are claimed.

A Linux x86-64 executable is supplied separately with this delivery. To run a downloaded copy:

```sh
chmod +x apex-native-linux-x86_64
./apex-native-linux-x86_64
```

### Controls

| Action | Web | Native |
|---|---|---|
| Accelerate | W / Up | W / Up |
| Brake | S / Down / Space | S / Down / Space |
| Steer | A/D / Left/Right | A/D / Left/Right |
| Recover to track | R; invalidates current lap | R; invalidates current lap |
| Pause / resume | Escape | Escape |
| Camera | C: chase, cockpit, high chase | C: chase, cockpit, high chase |
| Pit request / cancel | P or on-screen button | P |
| Circuit pit limiter | L or on-screen button | L |
| Pit entry practice (resets lap) | Practice-mode PIT ENTRY PRACTICE button | O |
| Audio | In-session AUDIO button; master volume in setup settings | V |
| Exit to setup | Pause → Return to paddock | M |

Native setup: Left/Right selects the track; E changes era; T changes team; W toggles wet conditions; A toggles assists; Enter starts driving. **Native has deliberately simpler visuals and a free-drive mode, not feature parity with the browser.**

### Controller layout (standard Xbox-style labels)

| Action | Both clients |
|---|---|
| Steering / acceleration / brake | Left stick or D-pad / RT / LT |
| Recover (not during a pit stop) | B |
| Request / cancel pit stop | X |
| Toggle circuit pit limiter | Y |
| Camera | RB while driving |
| Pause / resume | Start / Menu |
| Return to setup | View / Back (web: while paused/finished) |

Browser setup: D-pad Left/Right = circuit, Up/Down = team, LB/RB = era, A = start. Native setup: D-pad Left/Right = circuit, LB = era, RB = team, A = start. Connect a standard pad and press a button to expose it to the browser. Nonstandard browser mappings are not guessed; use a standard mapping or keyboard. If the embedded preview blocks the Gamepad API, open the preview in its own browser tab. Custom wheel/pedal mappings and force feedback are not implemented. Touch driving and on-screen pit buttons remain available. Gears shift automatically in both clients. Physical Xbox/PlayStation controllers, Bluetooth hot-plug and macOS/Windows native hardware have **not** been tested here.

## The ten circuits

1. Spa-Francorchamps
2. Monaco
3. Monza
4. Silverstone
5. Suzuka
6. Interlagos
7. Imola
8. Nürburgring **GP circuit**, not the Nordschleife
9. Circuit Gilles-Villeneuve / Montréal
10. Hockenheim

Circuit outlines are derived from MIT-licensed GeoJSON maps by Tomislav Bacinger, projected into metres, lightly smoothed and uniformly resampled. All eras share the same sourced map version. These are not period-specific, laser-scanned or survey-accurate reproductions. See [SOURCES.md](SOURCES.md) for photo references, implementation notes and map provenance. Elevations are filtered geographic surface estimates; widths and non-building landmarks remain artistic approximations; vegetation now uses a coarse photo-derived green mask, not surveyed tree locations; building footprints now use OSM data, with simplified roofs and sometimes estimated heights. The same per-point heights are read by Rust and the renderers. Grade gravity, relative height and pitch are computed in the core. Suzuka has a separated overpass with lower underlying terrain. Surrounding terrain comes from a geographic 2D DSM grid, blended to the road bed; it is not a survey.

## Four eras, sixteen historically referenced machines

| Era | Teams / car references | Main handling character |
|---|---|---|
| 1967 | Lotus 49; Ferrari 312; Brabham BT24; Cooper T81 | Light mass, low aero, mechanical grip, weaker brakes |
| 1988 | McLaren MP4/4; Ferrari F1/87/88C; Williams FW12; Benetton B188 | Boost buildup / turbo lag, more aero, stronger acceleration |
| 2004 | Ferrari F2004; Williams FW26; Renault R24; McLaren MP4-19 | Immediate throttle, high revs, low mass, high downforce |
| 2023 | Red Bull RB19; Mercedes W14; Ferrari SF-23; Aston Martin AMR23 | Higher mass, hybrid-inspired power, strongest aero grip |

Power, grip and braking are independently modified for each team. The displayed figures are **illustrative gameplay tuning**, not verified historical telemetry, exact horsepower specifications or rankings. The original car models differ by era; teams within an era share a silhouette with different colors and dynamics. No official logos, sponsor decals or licensed manufacturer meshes are included.

## Web features

- Time trial, unlimited practice and three-lap quick races against five AI cars.
- Free steering with a fixed 120 Hz Rust simulation: power, mass, drag, speed-dependent downforce, grip-limited cornering, braking, turbo boost buildup, wheelspin/slip and off-track drag.
- Wet conditions reduce grip and add rain and wet-looking road materials.
- Optional traction/slip assistance; **not auto-steering or auto-braking**.
- Lap timing with ordered quarter-lap checkpoints, forward-distance requirement, track limits and invalidation on recovery.
- Per-track/car/weather/assist local bests saved in browser storage after valid completed laps.
- Chase, cockpit and high chase cameras; HUD, minimap, grade/elevation telemetry, hybrid recorded/synthesized engine audio and pause/restart controls.
- Original car geometry, local CC0 base materials, sun shadows in high quality, instanced vegetation, varied mapped-building facades and circuit-themed landmarks.

## Known limitations

- This is a simplified grounded, road-following 2.5D driving model with grade gravity, **not** a validated tyre, suspension, drivetrain or aerodynamic simulation. Vehicles do not become airborne over crests.
- No vehicle-to-vehicle or barrier collision response. AI cars are intentionally non-colliding, follow a mapped path and do not use the player's full dynamics model.
- Basic fuel use/tyre wear and player pit service are present. No tyre-temperature model, detailed compound strategy, damage, DRS, ERS management, multiplayer, championship or official assets.
- The 1967 and 1988 rosters include different real engine architectures; the era handling model is shared, with per-team modifiers rather than engine-by-engine simulation.
- Historical cars use one circuit map version, not historical layouts. Scenery and landmarks are recognizable cues, not architectural reconstructions; textured facades do not reproduce the exact real buildings.
- Native rendering is a lightweight, elevated, simplified free-drive client with its own engine audio. Browser UI, AI races/spatial opponent audio, weather particles, touch controls and persistent records are not present there. Use `APEX_NO_AUDIO=1` to disable native device initialization if needed.
- No guarantee of a specific frame rate. Software WebGL and low-powered devices can be slow; use Performance mode.

## Tests

```sh
cargo test --lib
cargo test --features native  # includes actual native terrain-mesh regression
cargo check --features native --bin apex-native
cargo build --release --features native --bin apex-native

npm ci
npx playwright install --with-deps chromium
npm run test:web
npm run test:audio
npm run test:scenery
npm test  # all Node tests, including mesh geometry and build-coherence guards
```

To test a separately served production build:

```sh
APEX_URL=http://127.0.0.1:8080 npm run test:web
```

Linux rendering/physics smoke test (requires Xvfb):

```sh
APEX_SMOKE=1 APEX_NO_AUDIO=1 xvfb-run -a ./target/release/apex-native
```

It renders 120 frames, advances the same Rust driving model, checks acceleration and exits cleanly. See [TESTING.md](TESTING.md) for recorded results.

## Project structure

```text
src/lib.rs              Shared Rust dynamics + unit tests + WASM API
src/elevation.rs        Geographic terrain / road-bed projection / grade tests
src/powertrain.rs       Automatic gears, continuous RPM and shift cuts
src/native_audio.rs     CPAL streaming hybrid audio for native
src/recorded_audio.rs    Embedded PCM loops / continuous RPM transposition
src/scenery.rs           Full-circuit footprint clearance and concave roof triangulation
src/bin/native.rs       Macroquad native renderer and setup
web/main.js             Paddock UI, settings, records and session lifecycle
web/race.js             Inputs, race flow, AI and HUD
web/elevation.js        Elevation-field interpolation and chart
web/audio/              AudioWorklet, engine DSP and browser audio controller
web/graphics.js         Original procedural cars, track meshes and scenery
web/catalog.js          Historical reference roster and map rendering
web/wasm/               Generated bindings + compiled Rust WASM
web/assets/             Concept art, maps, OSM buildings and licensed PCM loops
data/tracks.json        Rust's embedded version of the same track data
data/buildings.json     Editable derived OSM footprint database (ODbL)
data/CIRCUITS-LICENSE.md  Upstream map-data MIT license
scripts/build-web.sh    Reproducible Rust → WASM → static web build
scripts/build-elevation.py  Offline geographic height sampling / road corrections
scripts/import-elevation.py  Download bounded Copernicus DSM windows
scripts/import-osm.py    Offline map import / footprint filtering (requires shapely)
scripts/build-recordings.py  Download licensed sources / derive PCM (ffmpeg + numpy)
tests/                  Browser end-to-end tests
```

Keep both copies of `tracks.json` synchronized. The Rust car parameters are authoritative for driving; the frontend catalog describes and labels them.

## Git workflow

Work is committed locally with real feature branches and `--no-ff` merges:

- `feature/circuit-library`
- `feature/rust-dynamics`
- `feature/web-experience`
- `feature/track-landmarks`
- `feature/validation-and-release`
- `feature/track-elevation`
- `feature/engine-audio`
- `feature/elevation-audio-release`
- `feature/georeferenced-scenery`
- `feature/recorded-engines`
- `feature/recordings-scenery-release`
- `fix/geographic-elevation`

`main` contains the integrated release. No remote repository has been created or pushed. The source download includes a Git bundle preserving every branch and commit; restore it with:

```sh
git clone apex-heritage-history.bundle apex-heritage
cd apex-heritage
git branch -a
git log --graph --oneline --all
```

## Rights and attribution

Independent, unofficial motorsport tribute, not affiliated with Formula 1, the FIA, any team or any circuit. Names and marks belong to their owners. Team/circuit branding and commercial distribution may require additional permissions and legal review. Source code is MIT; circuit centreline maps retain their upstream MIT notice. Copernicus-derived surface heights retain their separate free/open user licence and attribution notice. OSM-derived data is ODbL 1.0, and adapted recording assets are CC BY-SA 3.0, not MIT. Asset notices, editable data and author/source links are supplied with releases and in runtime credits. Trackside reference photography is **not** included as a texture. Redistributed Sentinel vegetation-reference crops retain their own notice. High-detail base materials from ambientCG are CC0, separately from the code licence. Original menu artwork is AI-generated. Three.js, Lucide, Macroquad, CPAL and other dependencies retain their respective licenses. CPAL’s Apache-2.0 text is included in `data/CPAL-LICENSE` for native distribution.

## Package a validated release

```sh
. "$HOME/.cargo/env"
./scripts/build-web.sh
cargo build --release --features native --bin apex-native
python3 scripts/package-release.py
(cd releases && sha256sum -c SHA256SUMS.txt)
```

Commit/tag first so `BUILD-INFO.txt` and `GIT-REFS.txt` identify the source correctly. The packager retains only tracked source files plus required notices in the source ZIP; production assets in the web ZIP; and the Linux executable, editable geographic data, audio adaptations and notices in the native ZIP. No `node_modules`, Cargo targets, test reports, research thumbnails or Git object history are archived. It copies installed dependency licences plus the documented upstream omissions in `data/dependency-licenses/`; fetching/building dependencies first is required.

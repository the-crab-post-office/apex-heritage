# APEX / HERITAGE

**A playable, unofficial historical single-seater racing prototype for web and native desktop.**

The driving model is written in **Rust** and shared by both clients. The web client compiles that core to **WebAssembly** and renders with Three.js; the native client uses **Macroquad**. Browser rendering/UI are JavaScript, not Rust. No physics JavaScript fallback is used.

> This is the agreed playable-prototype scope, not a photorealistic production simulator. The menu uses clearly labeled AI-generated concept artwork. Actual gameplay uses original procedural 3D models, textures and scenery. Photographs and maps were researched as references, not copied into game textures.

## New in 0.2 — elevation + engine audio

- Ten continuous, periodic, per-point elevation profiles, shared by Rust and both renderers. Climbing/descending changes acceleration through gravity; the car and camera pitch with the road. Suzuka retains a separated overpass and lower ground.
- Elevation range in circuit selection, a circuit elevation chart, and live relative-height / grade telemetry.
- Replaced the old three-oscillator browser buzz with four-stroke engine wavetables: distinct era timbres, throttle-dependent exhaust/intake, turbo whine, lift-off burble, shift transients and tyre/wind texture. Nearby AI cars have distance attenuation, stereo panning and Doppler pitch in the browser.
- RPM now comes from gear ratios with shift hysteresis and a brief torque cut—not a speed-modulo sawtooth. Upshifts produce a natural RPM/pitch drop.
- Native now has its own streaming, era-specific CPAL engine synthesis; V toggles audio. It does not restart audio clips per frame. If there is no usable output device, driving still works without audio.
- Browser master-volume slider and click-free mute/pause fading. New lap records use a separate storage key so old flat-physics times are not mixed with elevated-track times.

**Profiles are authored gameplay approximations, not surveyed heights or downloaded DEM terrain.** The driving model follows road height but remains grounded: no wheel-level suspension or airborne/jump physics. Sound is original procedural synthesis, not authentic car recordings.

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

On Linux, the desktop client needs a graphical session, OpenGL, X11 and the ALSA runtime. Building native audio from source also needs `pkg-config` and ALSA development headers (`sudo apt install pkg-config libasound2-dev` on Debian/Ubuntu). It was release-built and smoke-tested under Xvfb on Linux x86-64. Windows/macOS targets have not been tested here; compile from source on those platforms. No Windows/macOS binaries are claimed.

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
| Camera | C: chase, cockpit, high chase | Chase camera |
| Audio | In-session AUDIO button; master volume in setup settings | V |
| Exit to setup | Pause → Return to paddock | M |

Native setup: Left/Right selects the track; E changes era; T changes team; W toggles wet conditions; A toggles assists; Enter starts driving. **Native has deliberately simpler visuals and a free-drive mode, not feature parity with the browser.**

Web also supports standard gamepads: left stick steering, RT accelerate, LT brake, A recover, Start pause. Touch controls appear on narrow screens. These input paths are implemented; automated tests exercised keyboard input and mobile layout, not physical gamepad hardware. Gears shift automatically in both clients.

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

Circuit outlines are derived from MIT-licensed GeoJSON maps by Tomislav Bacinger, projected into metres, lightly smoothed and uniformly resampled. All eras share the same sourced map version. These are not period-specific, laser-scanned or survey-accurate reproductions. See [SOURCES.md](SOURCES.md) for photo references, implementation notes and map provenance. Elevations, widths, scenery and landmark positions are artistic approximations. The same per-point heights are read by Rust and the renderers. Grade gravity, relative height and pitch are computed in the core. Suzuka has a separated overpass with lower underlying terrain. Surrounding terrain is interpolated from the approximate road profiles, not a survey.

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
- Chase, cockpit and high chase cameras; HUD, minimap, grade/elevation telemetry, layered synthesized engine audio and pause/restart controls.
- Original geometry/materials, sun shadows in high quality, instanced vegetation, pit buildings and circuit-themed landmarks.

## Known limitations

- This is a simplified grounded, road-following 2.5D driving model with grade gravity, **not** a validated tyre, suspension, drivetrain or aerodynamic simulation. Vehicles do not become airborne over crests.
- No vehicle-to-vehicle or barrier collision response. AI cars are intentionally non-colliding, follow a mapped path and do not use the player's full dynamics model.
- No damage, tyre wear/temperature, fuel strategy, pit stops, DRS, ERS management, multiplayer, championship or official assets.
- The 1967 and 1988 rosters include different real engine architectures; the era handling model is shared, with per-team modifiers rather than engine-by-engine simulation.
- Historical cars use one circuit map version, not historical layouts. Scenery and landmarks are recognizable cues, not architectural reconstructions.
- Native rendering is a lightweight, elevated, simplified free-drive client with its own engine audio. Browser UI, AI races/spatial opponent audio, weather particles, touch controls and persistent records are not present there. Use `APEX_NO_AUDIO=1` to disable native device initialization if needed.
- No guarantee of a specific frame rate. Software WebGL and low-powered devices can be slow; use Performance mode.

## Tests

```sh
cargo test --lib
cargo test --features native --lib
cargo check --features native --bin apex-native
cargo build --release --features native --bin apex-native

npm ci
npx playwright install --with-deps chromium
npm run test:web
npm run test:audio
```

To test a separately served production build:

```sh
APEX_URL=http://127.0.0.1:8080 npm run test:web
```

Linux rendering/physics smoke test (requires Xvfb):

```sh
APEX_SMOKE=1 xvfb-run -a ./target/release/apex-native
```

It renders 120 frames, advances the same Rust driving model, checks acceleration and exits cleanly. See [TESTING.md](TESTING.md) for recorded results.

## Project structure

```text
src/lib.rs              Shared Rust dynamics + unit tests + WASM API
src/elevation.rs        Height projection / terrain interpolation / grade tests
src/powertrain.rs       Automatic gears, continuous RPM and shift cuts
src/native_audio.rs     CPAL streaming synthesis for native
src/bin/native.rs       Macroquad native renderer and setup
web/main.js             Paddock UI, settings, records and session lifecycle
web/race.js             Inputs, race flow, AI and HUD
web/elevation.js        Elevation-field interpolation and chart
web/audio/              AudioWorklet, engine DSP and browser audio controller
web/graphics.js         Original procedural cars, track meshes and scenery
web/catalog.js          Historical reference roster and map rendering
web/wasm/               Generated bindings + compiled Rust WASM
web/assets/             Original concept art and processed track maps
data/tracks.json        Rust's embedded version of the same track data
data/CIRCUITS-LICENSE.md  Upstream map-data MIT license
scripts/build-web.sh    Reproducible Rust → WASM → static web build
scripts/build-elevation.py  Rebuild authored per-point height profiles
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

`main` contains the integrated release. No remote repository has been created or pushed. The source download includes a Git bundle preserving every branch and commit; restore it with:

```sh
git clone apex-heritage-history.bundle apex-heritage
cd apex-heritage
git branch -a
git log --graph --oneline --all
```

## Rights and attribution

Independent, unofficial motorsport tribute, not affiliated with Formula 1, the FIA, any team or any circuit. Names and marks belong to their owners. Team/circuit branding and commercial distribution may require additional permissions and legal review. Source code is MIT; circuit-map data retains its upstream MIT notice. Reference photography is **not** included in the source distribution or web release. Original menu artwork is AI-generated. Three.js, Lucide, Macroquad, CPAL and other dependencies retain their respective licenses. CPAL’s Apache-2.0 text is included in `data/CPAL-LICENSE` for native distribution.

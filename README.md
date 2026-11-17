# APEX / HERITAGE

**Playable unofficial single-seater racing prototype — 0.12.0-preview.1.**

Shared **Rust** physics, a Three.js/WebAssembly browser client, and a simpler Macroquad native client. Browser rendering/UI are JavaScript; there is no JavaScript physics fallback. Original car geometry and reference-guided period liveries, including sponsor/team lettering and stylised marks. No licensed corporate artwork or scanned chassis. The menu now renders the selected in-game car in a live 3D showroom.

## Play / download / deploy

- **Play:** https://the-crab-post-office.github.io/apex-heritage/
- **Source:** https://github.com/the-crab-post-office/apex-heritage
- **Preserved release downloads:** https://github.com/the-crab-post-office/apex-heritage/releases — source, browser and Linux ZIPs with SHA256 checksums. `RELEASE-ARCHIVES.json` indexes the 40 migrated assets (0.6–0.12).
- GitHub Pages serves the built **`gh-pages` branch**, root folder. Source stays on `main`; release tags retain their original contents. The main branch includes project-subpath hosting fixes on top of the 0.12 gameplay release.
- Rebuild with `npm ci && bash scripts/build-web.sh` (Rust/WASM tooling required); publish using `python3 scripts/deploy-pages.py` with your own Git credentials. No token is stored in source, deployed assets or Git remotes. GitHub Pages ignores `_headers`; the explicit no-store manifest fetch and bounded build compatibility checks are retained, but CDN propagation can briefly delay a new deployment.
- Workspace budget: `python3 scripts/workspace-budget.py`. Rebuildable toolchains/caches can live outside `/home/user`; they are ephemeral and may need reinstalling after a sandbox restart. The project, active preview and current release downloads remain local.

## 0.12 Monaco Swimming Pool reference update

- Both Piscine chicanes now have broad, short alternating red/white kerbs and close three-rail Armco with debris fencing. These use shared Rust-rendered/physical geometry, including native parity.
- The mapped Rainier III pool has turquoise water, lane markings, white coping and a paved enclosure. The saved OSM harbour edge defines paved piers and water; twenty authored yachts replace the old misplaced Monaco boats. Five crowded temporary bleacher modules follow the pool-side corridor.
- **Modern Monaco for every era.** Reference photos guide authored appearance; this is not a photogrammetric or surveyed reconstruction. Road centreline and elevation are unchanged; current simplified pit/return-road geometry constrains stand placement. Photos are not redistributed. See `data/MONACO-REFERENCE-NOTICE.md`.
- Existing no-cache publishing, strict client/WASM version checks and device-local camera preferences are retained.

## 0.11.2 build mismatch / cleanup fix

- Replaces the caching preview server with the bundled **no-cache server** (`python3 serve.py --port 8080` from a web ZIP; `python3 scripts/serve-web.py --port 8080` from source).
- HTML/CSS/JS identity now derives from the package version. Publishing verifies the actual WASM version and track hash, stages a complete build and **atomically switches** the `site` symlink; the live build is not emptied during compilation.
- Stale tabs get **one cache-busting refresh**, resuming a requested race without erasing setup, records or camera preferences. A persistently mixed/incomplete deployment stops safely and offers **Reload latest build**; it never bypasses compatibility checks or loops indefinitely.
- Safe cleanup can remove inactive preview output and rebuildable compiler caches while preserving the active preview, native executable, source, uploads, dependencies and previous release archives. See `WORKSPACE.md`.

## 0.11.1 adjustable camera controls

- Open the **gear button beside the race camera selector** for per-camera FOV (**45–100°**) and exterior-distance (**0.60–1.80×**) sliders. Onboard mounts stay fixed to prevent distance changes moving them inside the chassis.
- **Right-drag** the canvas to look around, or use the panel's left/right/up/down buttons on touch screens. **Center view** clears free-look; **Reset this camera** restores its default FOV/distance and clears free-look. Alt + wheel adjusts exterior distance. Escape closes the settings panel before pausing the race.
- Selected camera and per-camera FOV/distance save **locally on this device**, independently of race setup. Free-look is temporary and centers on view changes/restart. Corrupt/blocked storage safely falls back to usable session controls; no account/cloud service is involved.
- Native has right-drag free-look, **[ / ]** for FOV, **wheel or PgUp/PgDn** for exterior distance, **Backspace** to center and **Home** to reset the current camera. Preferences use `$XDG_CONFIG_HOME/apex-heritage/cameras.json` or `~/.config/apex-heritage/cameras.json` (override with `APEX_CAMERA_PREFS`). Camera count remains eight; this pass changes controls, not car assets or scan coverage.

## 0.11 car finishing / camera rigs

- Replaces the old 1988/2004 primitive cars with shared detailed era meshes: low turbo versus high-nose V10 bodywork, recessed sidepod mouths, period wings/endplates, suspension, mirrors, rollover protection and exhausts. The V10 has its own airbox/bargeboards and grooved dry tyres.
- All four eras receive cockpit floors, instruments, headrests, driver arms/harnesses, brake/upright and wheel-lock details. Closed loft bulkheads and solid modern wing endplates remove exposed holes/wire-only panels; modern wheels have aero covers.
- **Eight race cameras:** Chase, Cockpit, High chase, TV onboard, Nose, Rear-facing, Side tracking and Orbit. Choose from the browser's accessible camera menu (also on mobile), or cycle with C/RB. Native also supports direct keys 1–8 and shows the active camera name.
- Cockpit mode hides only the player's helmet/visor and ghosts the halo for visibility; onboards follow chassis pitch/roll. Showroom adds top and close-detail presets.
- All 47 constructor selections retain their liveries. These remain **four original shared-era reconstructions, not 47 unique chassis or scans**. Verified scan integration remains **0/47**.

## 0.10 Monaco scenery / graphics stage

- Restores the actual roof/facade draw ranges lost by multi-material mesh batching. Mapped buildings now render correctly across all ten circuits.
- Recovers mapped Casino, Hôtel de Paris and Fairmont outlines/courtyards; adds modern Monaco named-building metadata, photo-estimated massing, balconies, cornices and simplified Casino roof towers.
- Adds photo-estimated street safety sections shared by web/native collision and rendering. **Modern Monaco scenery is explicitly used for all eras**, as requested; offsets/heights are estimates, not surveys.
- Web high quality adds filtered sky reflections with consistent sunlight; paint gets a clear coat while tyre rubber remains rough. Removes redundant livery allocations on classic/modern car creation.
- Consolidates old loose work files and provides a conservative, dry-run-first cleanup command; see `WORKSPACE.md`.
- **Car scans remain unfinished: 0/47 integrated.** The exact roster and examined candidates are tracked in `data/CAR-SCAN-STATUS.md`. Authored models and a wrong-year toy scan were not mislabeled or substituted as full-size scans. This release is a graphics/scenery stage, not completion of the 47-car scan conversion.

## 0.9.1 grounded barriers

- Roadside walls, guardrail supports and catch-fence posts now use the actual rendered terrain/overlay triangles instead of a nearby road-height approximation.
- Short, slope-following barrier spans and ground-conforming concrete foundations remove hillside gaps. Fence posts extend into the ground; mapped support spacing and collision footprints are retained.
- The correction applies to web and native, without changing the photo-guided cars or all-era Eau Rouge profile.

## 0.9 photo-guided cars and Eau Rouge

- 2023 cars now use a more slender nose, curved front aerofoils, low undercut sidepods, recessed inlets, substantial halo, rounded rear-wing/DRS assembly and more realistic tyre shoulders/rims. Modern wings use dark panels instead of the generic secondary colour.
- 1967 cars now use an open oval radiator nose, rounded cigar monocoque/open cockpit, exposed engine/inlet trumpets/exhausts, chrome roll hoop and wider rear tyres—without modern aero parts.
- Original authored chassis/wheel meshes are shared by web and native; the updated wheel layout is also used by Rust contact/track-limit calculations. Constructor paint schemes and all 47 selections are retained; these remain era-shared silhouettes, not individual scanned chassis.
- Eau Rouge/Raidillon has an approximately **40 m compression-to-crest rise / 17.4% peak climb**, separate apex/crest kerbs, red/green paved aprons, connected outside barriers and a covered, terrain-following hillside stand. **The pictured modern complex is intentionally used for all four eras**, as requested.
- Less washed-out web lighting, smoother terrain shading and a denser layered forest backdrop. Native retains simpler lighting/vegetation but shares the new car triangles, road heights and physical venue surfaces.

See [photo-reference notice](data/PHOTO-REFERENCE-NOTICE.md). This is a photo-guided procedural approximation, not photogrammetry or survey data. The rest of the historical circuit reconstruction remains unfinished.

## Retained 0.8 collection update

- Full season constructor selection shared by Rust, web/native menus, handling and web rival liveries. 1967 counts constructor representatives, excluding F2 guests and duplicate privateer/engine entries; one representative car per constructor, not every driver/race variant. Quick races still use the existing smaller AI field, not 47 simultaneous cars.
- 47 original 2048×1024 offline-generated atlases: characteristic colour blocking, race numbers, period sponsor lettering, wing/endplate panels and web tyre/rim details. These remain **stylised reconstructions**, not exact corporate fonts or race-by-race replicas. Chassis are shared per-era models; native has simpler decal/tyre coverage.
- Dark/sage browser menu, orbitable selected-car showroom, camera presets, constructor strip, engine/power/number data and clearer session setup. Native setup has a simpler 3D car studio; native camera field-of-view units are corrected. Reduced-motion, mobile sizing, failed-texture fallback and resource disposal are covered by browser tests.
- Removed redundant checked-in map/building databases and obsolete concept hero; runtime and offline generators use authoritative `data/` inputs. Existing licenses and releases are retained.
- 1988 naturally aspirated constructors no longer inherit turbo lag/boost.

See [data/LIVERY-NOTICE.md](data/LIVERY-NOTICE.md) for visual references, roster scope and trademark limitations. This update does **not** finish historical road reconstruction or survey-correct elevation.

## Preview status — read first

This feature preview implements the corner/contact changes below, but **the requested full historical road reconstructions are unfinished**. All ten tracks still use recent mapped roads. The 1967/1988/2004 selections have era-inspired surface presets and visible **RECENT-LAYOUT SUBSTITUTE** labels, not authentic historic layouts. At Eau Rouge/Raidillon specifically, all eras now deliberately share the photo-guided modern complex chosen by the user. Stands, buildings, pit routes, elevation, AI paths and minimaps also remain recent-layout approximations. Montréal 1967 and Nürburgring GP 1967 are separately identified as nonexistent-era combinations; that exception does **not** justify the other missing historic alignments.

The work remains on `feature/photo-cars-eau-rouge`; stable `main`/`v0.6.0` are not replaced. No remote repository has been created or pushed.

## New playable corner/contact features

- **Mapped/photo-referenced facilities on all ten circuits**, replacing six evenly spaced grandstands and arbitrary barrier rows. Actual OSM grandstand footprints, original simplified tiers/seats, current barrier candidates and explicit Monaco harbour-side stand estimates. Matching stand/building footprints are not extruded twice. Placement, barrier semantics and historical structure existence are not survey-certified.
- **Selected-corner runoff**, rather than a full-lap generic gravel shoulder: gravel, grass or paved escape areas at named corners. Eligible modern mapped gravel/sand areas replace overlapping authored strips; paths, car parks, courts and beaches are excluded. Boundaries/material-era choices remain approximate.
- **Different kerb widths and physical profiles**: ramps, flatter strips and taller ridges. Rust contact, web rendering and native rendering use the same clipped 3D triangles. These are authored gameplay dimensions, not measurements from photographs.
- **Four-tyre track limits**: each oriented tyre contact patch is tested against the outer white-line boundary. Touching the boundary remains legal; only **all four patches off** sets off-track. Grip is sampled separately, so a still-legal car can lose grip on grass, gravel or kerbs. Kerbs outside the white line do not extend the legal track. Pit travel retains its separate permitted state.
- **Kerb strikes and bottoming**: per-wheel support, approximate sprung heave/roll/pitch, era ride heights and underfloor probes. A high ridge can hit the floor while tyres remain legal, with drag, suspension reaction, sparks, scrape audio and HUD feedback. This is not a validated suspension/rigid-body model.
- Previous progressive, recoverable spins, assists, swept barrier impacts and playable pit service remain. The new physics uses a fresh lap-record bucket.

Full source evidence, photo links, database attribution and limitations: [corner-detail notice](data/CORNER-DETAILS-NOTICE.md). Reference photos are **not redistributed**, used as textures or presented as a photogrammetry scan.

## Retained prototype features

- Ten circuits: Spa, Monaco, Monza, Silverstone, Suzuka, Interlagos, Imola, Nürburgring GP, Montréal and Hockenheim.
- Four car eras (1967, 1988, 2004, 2023), **47 constructor representatives** (9 / 18 / 10 / 10), distinct power/grip/braking and era handling, turbo boost, wet-weather grip and progressive rear breakaway. Handling is inspired by the eras, not calibrated real vehicle telemetry.
- Practice, time trial and browser quick races with five AI cars; keyboard, touch and standard controller inputs.
- Real mapped recent pit routes, lane following/limiter, marked-box stop and timed tyre/fuel service. **Pit entry practice** avoids needing a full lap. Not full race strategy.
- Phase-locked timbre derived from licensed real recordings for the first three eras; modern V6 synthesis and safe missing-recording fallback. The source cars/dates are approximate era stand-ins, not exact roster-car recordings.
- Geographic Copernicus GLO-30 surface heights, mapped OSM buildings, reference-guided Monaco tunnel and original detailed car meshes. GLO-30 is a coarse DSM, **not surveyed road elevation**; earlier user-reported accuracy limits remain.
- Local repeating 1K ambientCG CC0 grass/gravel/concrete/brick/asphalt materials. Retained Sentinel imagery guides vegetation only, not stretched road/ground textures. Native graphics are lower-detail than the web client.
- Visible version, HTML/CSS/JS/WASM build-coherence checks and editable asset-specific source databases/notices.

## Play in a browser

Use the live feature preview, or extract the **complete web ZIP into an empty folder**, then:

```sh
cd apex-heritage-web
python3 serve.py --port 8080
# Open http://localhost:8080 — do not open index.html using file://.
```

Runtime assets are local. Standard controllers need HTTPS or localhost and may need a button press. Confirm the displayed version is **0.11.2-preview.1**; do not mix individual files with an older release.

| Action | Keyboard | Controller |
|---|---|---|
| Steer / accelerate / brake | WASD or arrows; Space brake | Left stick / RT / LT |
| Recover | R | B |
| Request pit stop / limiter | P / L | X / Y |
| Camera / pause | C / Esc; browser camera menu; native 1–8 direct | RB / Start |

Native setup: arrows select track, E selects era, T selects team, Enter starts; controller D-pad/LB/RB/A. Native O stages pit-entry practice, M/View returns to setup, V toggles sound. Browser/native options differ; no physical controller certification is claimed.

## Build and test

Requires Rust, Node/npm, `wasm32-unknown-unknown`, and `wasm-bindgen-cli` **0.2.105**. Native Linux additionally needs OpenGL/X11, ALSA and libudev development/runtime libraries. Python geometric regeneration/tests use Shapely; elevation tooling also uses NumPy/SciPy/rasterio. Offline shared car geometry regenerates with `python3 scripts/build-car-shapes.py`. Offline livery regeneration uses Pillow and the bundled licensed font (`python3 scripts/build-liveries.py`).

```sh
. "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.105 --locked
npm ci
./scripts/build-web.sh
npm run dev -- --port 5173                 # Binds 0.0.0.0
cargo run --release --features native --bin apex-native

cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
APEX_URL=http://127.0.0.1:5173 npx playwright test
```

For production browser tests, use `python3 scripts/serve-web.py --port 8080` to serve the generated `site/` and point `APEX_URL` to that server. See [TESTING.md](TESTING.md) for actual results and exclusions. To regenerate corner data offline: `python3 scripts/build-corner-details.py`. The retired generic `venue.json` generator is retained only in v0.6 Git history, not duplicated in this source tree.

## Source organization

- `src/lib.rs`, `dynamics.rs`, `powertrain.rs`: authoritative simulation/state, progressive slides and engine behaviour.
- `src/contact.rs`, `corner.rs`: oriented tyre patches, shared raised meshes, material grip, suspension/floor probes.
- `src/venue.rs`, `pit.rs`: mapped collision candidates and playable pit flow.
- `src/bin/native.rs`, `src/bin/venue/`: native rendering and exact shared corner-triangle batches.
- `web/graphics.js`, `corners.js`, `venue.js`: web rendering; `main.js`/`race.js`: setup, inputs, HUD and browser race flow.
- `data/corner-details.json`, `venue-osm.json`: editable derived corner/facility database and retained OSM feature snapshot.
- `data/tracks.json`, `pit-lanes.json`, `buildings.json`: recent mapped geometry. Vite imports the same authoritative files; there is no separate manually synchronized browser copy.
- `web/wasm/`: generated Rust bindings/core, supplied so the source can run without an immediate WASM rebuild.
- `web/assets/`, `data/*NOTICE*`, `SOURCES.md`: local assets, provenance and separate licensing.
- `tests/`: Rust tests are alongside code; Node, Python and Playwright regressions live here.

## Rights and attribution

Independent unofficial motorsport prototype; not affiliated with Formula 1, FIA, teams or circuits. Names and marks belong to their owners; public/commercial distribution may require permissions and legal review. Code is MIT; upstream circuit centreline maps retain their MIT notice. OSM-derived databases are **ODbL 1.0**; recording adaptations are **CC BY-SA 3.0**, not MIT. Copernicus elevation/Sentinel data have their own notices. ambientCG material tiles are **CC0**. Dependency licenses/notices are included in packaged builds. Photo references are not included as textures. See [SOURCES.md](SOURCES.md) and the asset-specific notices.

## Package a validated checkout

Commit/tag the preview first so build metadata identifies its source, then:

```sh
./scripts/build-web.sh
cargo build --release --features native --bin apex-native
python3 scripts/package-release.py
```

Packages go to `releases/<version>/`: tracked source, self-contained static web build and Linux x86_64 executable. The source ZIP includes branch/commit names, **not a Git-history bundle**. Caches, Cargo targets, node_modules, browser captures and research images are not packaged. SHA-256 sums and ZIP integrity are checked. The Linux executable needs a graphical Linux desktop; no Windows/macOS binary is provided by this build.

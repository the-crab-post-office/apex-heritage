# Workspace map

- `src/` — shared Rust simulation, native renderer and native mesh tests.
- `web/` — browser renderer, UI and local runtime assets.
- `data/` — editable geometry/reference databases and asset-specific licenses.
- `scripts/` — offline regeneration, import, build, release and safe cleanup tools.
- `tests/` — Rust-adjacent offline, Node and Playwright regression suites.
- `releases/<version>/` — complete verified release ZIPs and checksums (preserved).
- `artifacts/` — ignored game captures and validation history, never bundled as runtime assets.
- `artifacts/archive/pre-0.10-validation.zip` — previous loose session logs/work scripts, verified before consolidation.
- `site -> build/previews/<version>-<fingerprint>` — generated current static preview; recreate with `scripts/build-web.sh`.
- `target/`, `node_modules/` — rebuildable tool output/dependencies, not source deliverables.

Original user reference uploads stay outside the project in `../uploads/`; they are never removed by cleanup or included in a release.

## Safe cleanup

```sh
python3 scripts/clean-workspace.py                  # dry-run
python3 scripts/clean-workspace.py --apply          # generated test/import caches
python3 scripts/clean-workspace.py --apply --debug-cache # also Rust debug build cache
python3 scripts/clean-workspace.py --apply --release-cache # also compiler intermediates; keeps executables
```

The cleanup command rejects tracked files and preserves source, licenses, reference uploads, captures, release archives and the current preview. It does not uninstall dependencies or toolchains.

## Important unfinished work

`data/CAR-SCAN-STATUS.md` and `data/car-asset-status.json` track all 57 constructor-season entries (the original 47 plus the full 2021 grid). None is yet integrated; the existing cars must not be described as scanned replicas. Modern Monaco is user-selected for all eras. Source/massing/placement uncertainties are in `data/MONACO-REFERENCE-NOTICE.md`.

## Current car / camera pipeline (0.11)

- `scripts/build-car-shapes.py` generates all five era meshes and shared wheel layouts; 1988/2004 no longer use legacy runtime primitive builders.
- `data/cameras.json` defines eight rigs consumed by `web/cameras.js` and `src/cameras.rs`. Attached views inherit chassis pose; only the player's isolated head batches are hidden in cockpit mode; halo batches become translucent.
- Browser direct selector supports touch/keyboard; native uses C/RB or 1–8. Camera smoke validation can use `APEX_SMOKE_ALL_CAMERAS=1` or `APEX_SMOKE_CAMERA=0..7`.

## Adjustable camera preferences (0.11.1)

- `web/camera-controls.js`: pure bounded tuning, pose adjustment and versioned preference serialization; covered by Node tests.
- `web/race-camera-controls.js`: accessible settings panel, pointer-capture free-look, touch look buttons, local-storage failure handling and teardown.
- `src/cameras.rs`: matching distance/FOV/free-look math. `src/bin/camera_controls/mod.rs`: native input and user-local file preferences; smoke checks ignore preference files and never save them.
- `apex-camera-preferences-v1` is the browser local-storage key. Mode uses stable rig IDs; views have independent distance/FOV values. Temporary look angles are not persisted.

## Coherent publishing (0.11.2)

`npm run build` compiles to `build/staging-site`, then `scripts/publish-site.py` verifies HTML/CSS/assets plus the actual WASM identity (`scripts/verify-core.mjs`) and atomically switches `site` to a complete fingerprinted preview. Old generated previews are cleanup candidates, never the active target. A failed build leaves the previous preview untouched.

Use `python3 scripts/serve-web.py --port 8080` from source. Web ZIPs include the same standalone server as `serve.py` and static-host `_headers` cache rules. The legacy caching server was retired; the current live preview is **Fixed game**, port 5186. HTML/CSS metadata use build-time tokens, not hand-edited version strings.

Release-cache cleanup removes only Rust intermediates (`deps`, `build`, `incremental`, `.fingerprint`, `examples`); it keeps the finished native executable and WASM outputs. Rebuilding afterwards will recompile dependencies. Source/asset/previous-release/upload hashes are checked across cleanup.


## Modern Monaco Piscine

- `scripts/piscine_reference.py`: offline refinement invoked by `scripts/build-corner-details.py` (requires Shapely 2.1+ for constrained triangulation).
- `data/monaco-piscine-map.json`: retained OSM geography/attribution; no network required to regenerate.
- `data/monaco-piscine.json`: shared non-driving scenic facets, boxes and terrain cutouts; `src/piscine.rs` and `web/graphics.js` consume it.
- `tests/test_piscine_reference.py`, `tests/piscine-visuals.spec.js`, Rust `piscine::tests`: mapped water/corridor/all-era/visual regressions.
- `artifacts/piscine-{overhead,entry,exit}.png`: actual game captures, not AI-generated imagery.


## GitHub migration / workspace budget

Repository: https://github.com/the-crab-post-office/apex-heritage . Source/history/feature branches and release tags are preserved there. `gh-pages` contains only the compiled static game; `scripts/deploy-pages.py` publishes a verified build without copying uploads or credentials. Vite assets, runtime build-manifest requests and credit/license links are relative so root and `/apex-heritage/` hosting both work.

All 40 previous archive/checksum files from versions 0.6–0.12 were uploaded as GitHub release assets and verified against GitHub's SHA256 digests and sizes before older local copies were moved. `RELEASE-ARCHIVES.json` is the persistent download/digest index. Current 0.12 ZIPs remain under `releases/0.12.0-preview.1/`; older redundant local copies are outside `/home/user` and may disappear, but the GitHub copies persist. No original reference uploads were published.

Rebuildable Rust toolchains/registries, Node dependencies, browser caches, npm caches and Rust compiler output were moved to `/var/tmp/apex-workspace-cache/` with symlinks for the current session. Those files are **not persisted** with the workspace. After a sandbox restart, reinstall Rust/wasm-bindgen, `npm ci` and Playwright browsers as needed. Inactive generated previews and old diagnostic captures were moved there too; current Piscine screenshots and validation evidence remain in `artifacts/`.

`python3 scripts/workspace-budget.py` audits all regular files and symlinks in `/home/user`, including Git history/uploads, without following external cache links. Limits are conservatively checked as **128,000,000 bytes and 10,000 entries**. Do not follow external cache symlinks when calculating persisted workspace size.


Public deployment verified: https://the-crab-post-office.github.io/apex-heritage/ (Monaco loaded and accelerated using Rust WASM, no page errors/failed responses). Source repository is public; original user photos and the supplied GitHub credential were not published. The credential attachment is moved out of the persisted workspace to private temporary storage after publication; revoke/rotate it once no longer needed.

After archival and Git object repacking (without pruning history), the complete `/home/user` audit was approximately **106 MB / 590 entries**, including the current release ZIPs, active preview, source, complete local Git history and reference uploads. Exact current figures: `python3 scripts/workspace-budget.py`. This leaves margin below the conservative 128,000,000-byte / 10,000-entry caps.

## 0.13 car comparison

`web/public/car-comparison.html` is a self-contained deliverable with ten licensed reference photos and actual game captures. Rebuild captures via `scripts/capture-car-comparison.mjs`, then run `scripts/build-car-comparison.py` and rebuild the web site. `data/CAR-REFERENCE-PHOTOS.md` and `data/car-references.json` retain full credit, sources, license and photo checksums. Captures are not scans; there are still zero verified car scans. 2021 uses the latest track-surface profile as an explicitly labelled substitute, not a newly surveyed 2021 circuit.


## 0.14 photo audit and wheel pivot correction

New `web/wheel-motion.js` creates an independent steering hub and spin child. Do not restore coupled XYZ Euler rotation on `wheel.mesh`: wheel geometry belongs under `wheel.spin`. Shared layouts can have per-axle radii; native/Rust contacts and browser support use the same dimensions. `scripts/photo_track_refine.py` changes only the latest surface after previous Spa/Monaco refinements. `data/photo-audit-references.json` records fifteen licensed reference views, decisions and hashes proving older surface presets unchanged. `scripts/capture-track-audit.mjs` / `scripts/build-photo-audit.py` create the self-contained `web/public/photo-accuracy.html`. Build output was moved to an external rebuildable cache to maintain the workspace budget.

0.14 publication: source/tag `280b203` / `v0.14.0-preview.1`, Pages `093cef7ffda011e5550fbce9d1ec8c340419de6b`. Public game, wheel pivots and both comparison pages verified; 26 browser / 83 Rust-native / 123 Node / 25 Python checks passed. `RELEASE-ARCHIVES.json` has 48 remotely verified assets; all three 0.14 ZIPs live outside `/home/user` and on GitHub Releases. Current persisted budget is approximately 99 MB / fewer than 1,000 entries; rerun the budget script for exact figures.

## 0.15 reference-scene pipeline

`spa_corner_reference.py` applies only the latest Spa profile, including optional profile-specific collision barriers consumed by `Venue::for_era`; never move recent walls into the global historical barrier array. `build-reference-scenes.py` emits shared original `reference-scenes.json` facets: explicit Monaco overhead hotel infill/podium cladding and recent Spa grid paint. Both renderers use that geometry. Keep the ordinary at-ground building exclusion enabled. `capture-spa-monaco-update.mjs` and `build-spa-monaco-report.py` produce the standalone seven-view report and input/capture hash manifest. Source uploads stay outside the project and are not bundled.

## Braking / expanded circuit library (0.16)

- `src/braking.rs`, `src/braking_tests.rs`: brake-priority friction allocation, absolute stopping/overlap/wet/progressive checks, banked road/tyre/body support checks.
- `scripts/import-expansion.py` fetches bounded source snapshots; `scripts/build-expansion.py` / `expansion_context.py` rebuild only the three added circuit records offline. Source snapshots and notice are retained under `data/expansion-*`. Optional map-import cache is external and ephemeral; it is not required to regenerate releases.
- `expansion_scenes.py` is called by the reference-scene generator: original Yas lattice/bridge, Baku castle-side masonry, explicit approximate water masks shared by both clients.
- Banking is per-station signed cross-slope in `tracks.json`; `surface_mesh::road_point`, `web/road-surface.js`, driving surfaces and wheel support consume the same array. Old tracks omit it and remain flat across their road sections.
- `new-circuits.html`, `expansion-captures.json`: six actual production views with input/camera/image hashes. Capture with `scripts/capture-expansion.mjs`, build report offline with `scripts/build-expansion-report.py`.

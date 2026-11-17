# Validation — 0.13.0-preview.1

Full 2021 grid, five-era compatibility, modern geometry/liveries and shared tyre-force update. Branch `feature/2021-grid-and-car-realism`, based on main `5550b0a`.

- **82 Rust/native tests passed** (`cargo test --features native`): 73 shared library + 9 native renderer; full rerun after tyre-limited brake fix. Includes five-era wet/dry stopping stability, 2021 mass/wheelbase/radius and all ten circuits × five-era pit service.
- **117 Node tests passed**, including full roster/geometry/decal contracts, all photo and embedded capture SHA256 checks, new record namespace, V6 profile, and existing gameplay/asset contracts.
- **21 Python tests passed**, including offline deterministic scenery generation.
- Optimized Linux/native executable built successfully. Production web build verifies actual WASM build version 0.13.0-preview.1 and matching emitted binary bytes. `d934b07c` is the unchanged **track-data hash**, not a WASM checksum. New tyre dynamics do change the WASM binary.
- 2021 Red Bull deep link / Rust acceleration / AI finite-state / wheel support / camera / audio browser test passed; mobile 390px five-era selection test passed. Existing 2023 selection index is retained.
- Mobile showroom rendering suspension and explicit failed-texture fallback passed. The full 114-change showroom resource test also passed (6.5 minutes on software rendering): every atlas loaded and existing geometry/texture resource ceilings held. Final publication checks are recorded below.

Evidence: `artifacts/realism-{node,python,rust-final,browser,showroom-final,build-final}.log`.

**Limitations:** no measured vehicle telemetry validation, no verified scans (0/57), no ten exact constructor-specific CAD chassis. Shared authored era chassis with estimated team geometry differences; typography/partner positions still approximate. 2021 uses explicitly labelled latest-surface circuit substitutes. Headless software rendering is not a real-device performance benchmark; controller hardware and subjective audio review remain unverified. Rapier was not added; these are bounded original quasi-static force-budget changes, not a full articulated suspension model.

## Final regression results

- **21 unique browser tests passed across the final run and targeted reruns**: 2 full-grid/deep-link/mobile, 4 bounded build recovery, 2 embedded comparison/mobile, 8 general gameplay/menu/audio and 2 car/Spa reference tests, plus 3 showroom tests. The 18-test final batch initially had 17 passes and one obsolete four-era garage expectation; the corrected five-era setup test passed separately. Its first expanded rerun exhausted the old overall time budget during software-rendered showroom updates; the setup-only test now cancels background showroom animation (the independent 114-switch test still renders every model with unchanged resource limits) and has a 240-second bound. No game compatibility or correctness assertion was relaxed.
- **Native 2021 Monaco / all eight cameras render+physics smoke passed** on the optimized executable; exact terminal result is in `artifacts/realism-native-smoke.log`.
- Roster, geometry, layout, atlas manifest, embedded native atlas mapping and all 57 PNGs regenerate byte-identically (64 checked outputs, with `cargo fmt` normalization).
- Final standalone comparison is **2,597,718 bytes**; all twenty embedded JPEGs decoded successfully and their hashes match retained photo/capture manifests. No external image/script/font requests are needed. Final production build includes comparison HTML and capture provenance manifest.
- 117 Node / 82 Rust-native / 21 Python checks remain green. Native and browser software rendering checks ran serially to avoid GPU contention. Existing Vite large-chunk warning remains nonfatal.

## Reproduce current build

```sh
cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
bash scripts/build-web.sh
# serve in another terminal
python3 scripts/serve-web.py --port 5186
APEX_URL=http://127.0.0.1:5186 npx playwright test tests/2021-grid.spec.js tests/showroom.spec.js tests/car-comparison.spec.js tests/photo-reference.spec.js tests/build-recovery.spec.js tests/game.spec.js
APEX_URL=http://127.0.0.1:5186 node scripts/capture-car-comparison.mjs
python3 scripts/build-car-comparison.py
npm run build  # includes final comparison/capture manifest in distribution
cargo build --release --features native --bin apex-native
APEX_SMOKE=1 APEX_SMOKE_ALL_CAMERAS=1 APEX_SMOKE_TRACK=1 APEX_SMOKE_ERA=4 xvfb-run -a target/release/apex-native
python3 scripts/workspace-budget.py
```

The initial full-grid showroom run hit its old 180-second timeout on software rendering (57→114 texture/model switches). No correctness assertion failed before timeout. Timeout raised to 480 seconds for the expanded 57-entry / more detailed chassis test; resource ceilings are unchanged.

---

# Historical validation

# GitHub Pages / workspace migration checks

Deployment-only changes on top of 0.12.0-preview.1: relative asset base, relative `version.json` and license links, preserved strict core gate, static `gh-pages` publisher and workspace-budget audit.

- **110 Node tests passed**, including the new domain-root/project-Pages URL regression.
- Production Vite build passed; actual WASM identity verified unchanged (0.12.0-preview.1 / d934b07c).
- **Live public GitHub Pages browser test passed** at `https://the-crab-post-office.github.io/apex-heritage/`: Monaco scene/541 scenic facets/20 yachts loaded, Rust/WASM acceleration reached 2.62 m/s, no page errors or failed responses, correct project-scoped manifest URL.
- Local GitHub-style `/apex-heritage/` browser test loaded Monaco, displayed all new Piscine assets and accelerated through real Rust WASM to >2 m/s; **no page errors or failed asset responses**. The manifest request stayed at `/apex-heritage/version.json`.
- All **40 migrated release assets** checked against GitHub's reported SHA256 digests and byte lengths before local archive cleanup.
- Entire local Git blob history scanned for the supplied credential before upload: **0 matches**. Original uploads and credential file are not source or deployment assets.
- Existing gameplay/geometry tests below remain applicable; this pass does not change Rust, geometry or native executable.

---

# Validation — 0.12.0-preview.1

Branch: `feature/monaco-swimming-pool-reference`, based on preserved `v0.11.2-preview.1`. Modern Monaco Swimming Pool reference refinement, shared across all four eras. Road centreline/elevations and car assets are unchanged.

## Current results

| Check | Result |
|---|---|
| Rust (`cargo test --features native`) | **77 passed**: 68 shared/native-enabled library + 9 native renderer tests |
| Node (`npm test`) | **109 passed** |
| Python (`python3 -m unittest discover -s tests -p 'test_*.py'`) | **21 passed**, including offline byte-deterministic regeneration and mapped pool/harbour/road/pit checks |
| Production browser | **15 unique tests passed**: 2 Monaco architecture/road tests (1967 high, 2023 low), 4 bounded-build-recovery tests, 8 general game tests, 1 new Piscine visual test |
| Native Monaco / 2023 / eight cameras | **118.9 km/h**, render + physics smoke passed on final rebuilt executable |
| WASM / publication | Actual core verified **0.12.0-preview.1 / d934b07c**; atomic preview publication retained |
| User-reference checks | Actual overhead, entry and exit screenshots inspected; same modern complex all eras |

New Rust station-by-station driving rig checks 59 stations across both Piscine chicanes at 20 m/s in every era, asserting no barrier impact and retained speed. This is a controlled clearance/physics rig, not an autonomous full-lap claim. The 5 modern kerbs are byte-equal between era profiles, and have 0.85 m target stripe spacing. Generic kerbs elsewhere retain existing per-segment colouring.

The mapped pool, 20 yachts, 5 temporary stand modules, paved quays and harbour masks are generated offline. Scenic water/boats do **not** enter physics surface facets. Road/pit geometry is subtracted from water/paving/masks; collision capsules and stand footprints retain the existing independent clearance tests. Native terrain cuts and scenic meshes consume the same saved data as the browser.

During development a collision regression exposed that deleting all Piscine-indexed walls also removed a distant mapped pool perimeter wall used by the collision rig. Removal now targets only nearby track-edge barriers, preserving that perimeter. A visual test initially counted stands only through station 535, excluding the fifth at station 536; its range was corrected to the full complex (497–555) and the test passed on the final published build. The broader 12-test recovery/game run passed before that isolated test rerun; no runtime code was changed for the range correction.

Evidence: `artifacts/validation/0.12.0-preview.1/` and `artifacts/piscine-{overhead,entry,exit}.png`. Vite's existing nonfatal large-chunk warning remains. Native is lower-detail than browser. This is authored, approximate reference-guided scenery, not a surveyed/photogrammetric replica. Existing pit/return-road elevation and distant city/terrain remain simplified. No verified car scans added (0/47).

## Reproduce

```sh
python3 scripts/build-corner-details.py  # Shapely 2.1+, saved OSM; no network
cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
bash scripts/build-web.sh
python3 scripts/serve-web.py --port 5186
# A separate terminal; native/browser GPU checks run serially:
APEX_URL=http://127.0.0.1:5186 npx playwright test tests/monaco-visuals.spec.js tests/piscine-visuals.spec.js tests/build-recovery.spec.js tests/game.spec.js
cargo build --release --features native --bin apex-native
APEX_SMOKE=1 APEX_SMOKE_ALL_CAMERAS=1 APEX_SMOKE_TRACK=1 APEX_SMOKE_ERA=3 xvfb-run -a target/release/apex-native
```

---

## Preserved 0.11.2 validation history

# Validation — 0.11.2-preview.1

Branch: `fix/coherent-preview-and-cleanup`, based on preserved `v0.11.1-preview.1`. User reported a build mismatch: an old 0.10.0 client was comparing itself to a 0.11.1 server. The legacy Python static server sent no Cache-Control header. This pass fixes delivery/recovery and cleans generated files; it does not disable version checking or change car/track assets.

## Fixes

- New canonical **Fixed game** preview, port **5186**, uses `scripts/serve-web.py`; obsolete caching preview on 5185 is stopped. HTML, manifests and assets receive no-store/no-cache headers. Conditional requests cannot turn an old entry page into a freshly validated 304.
- HTML/CSS identity is stamped from package version at build time. Node tests also check the Cargo manifest agrees. The actual WASM version and track hash are checked by `scripts/verify-core.mjs` before publishing; the emitted WASM bytes must match that verified core.
- Build output is staged separately. `scripts/publish-site.py` validates a complete output tree, fingerprints it, then atomically swaps the `site` symlink. The live tree is never emptied by Vite; failed verification leaves it intact.
- One URL-scoped cache-busting reload recovers stale HTML/version mismatches or missing hashed chunks, resuming an explicitly requested race. Settings, records and camera preferences are not cleared. A repeated mismatch stops safely with **Reload latest build**, not an infinite refresh or an unchecked simulation.
- Source and web ZIPs include a no-cache server; web ZIPs also carry static-host `_headers` rules. START-HERE and README use the bundled server rather than the old caching command.

## Current validation

| Check | Result |
|---|---|
| Rust release native-feature suite | **75 passed**: 66 library + 9 native |
| Node suite | **109 passed** |
| Python offline/server/cleanup suite | **17 passed** |
| Production browser regressions | **6 passed**, 3.9 minutes |
| Actual WASM identity, staged asset checks and atomic publication | **Passed** |
| Release WASM/static/native Linux builds | **Passed**; existing Vite large-chunk warning remains |
| Native 2023/eight-camera driving/render smoke | **119.3 km/h**, passed serially after browser checks |
| Plain-browser driving after cleanup | **Passed**: 19.1 km/h, matching 0.11.2 HTML/CSS/HUD, no build banner or page errors |

The six browser cases explicitly test: a stale server identity that recovers and drives while preserving camera preferences; stale HTML that recovers without bypassing guards; a permanently mixed deployment that stops after one reload and supports a manual retry; a missing old hashed race chunk; camera/FOV/distance/free-look/persistence/mobile controls; and actual WASM driving/braking/steering/recovery/pause/exit. The first four are new deployment regressions. These are focused cases, not the complete unrelated browser suite.

Python tests independently verify no-cache headers, 200 responses despite conditional requests, a running server seeing an atomic symlink change, and cleanup excluding the active preview while including stale generated output. Offline asset tests also passed. Node tests cover recovery-loop bounds, query/fragment preservation, cleanup of only internal URL flags and single-source HTML/CSS metadata.

## Executed cleanup

- Removed **527,927,680 bytes** (~503.5 MiB) of stale generated preview output, Rust compiler intermediates and test/Python caches.
- Preserved the active fingerprinted preview, finished native/WASM executables, source, local dependencies, original uploads and every existing release archive.
- **389 protected files** were SHA256-checked before/after cleanup and were unchanged. The protection set covers tracked/new source files, preview files, uploads, old releases and executables; records are under ignored `artifacts/validation/0.11.2-preview.1/`.
- Moved six loose assistant validation logs from the workspace root into `artifacts/validation/archived-car-pass-logs/`, without deleting them.
- Cleanup is dry-run-first and refuses tracked files. `--release-cache` removes only intermediate subdirectories, not the finished binaries. A later build will recompile those dependencies.

## Reproduce

```sh
. "$HOME/.cargo/env"
python3 -m unittest discover -s tests -p 'test_*.py'
npm test
cargo test --release --features native
bash scripts/build-web.sh
cargo build --release --features native --bin apex-native
python3 scripts/serve-web.py --port 8080
# Separate terminal; browser/native OpenGL checks run serially:
APEX_URL=http://127.0.0.1:8080 npx playwright test tests/build-recovery.spec.js tests/game.spec.js tests/camera-controls.spec.js --grep 'stale|permanently|missing old|Rust WASM drives|FOV/distance'
APEX_SMOKE=1 APEX_SMOKE_ALL_CAMERAS=1 APEX_SMOKE_ERA=3 xvfb-run -a target/release/apex-native
python3 scripts/clean-workspace.py --release-cache # dry-run
python3 scripts/clean-workspace.py --apply --debug-cache --release-cache
```

From an extracted web ZIP: `python3 serve.py --port 8080`. Do not open index.html with file://. Use the new **Fixed game** preview rather than an already-open old tab; code already loaded by 0.10 cannot retroactively acquire recovery logic without navigating to the fresh build.

## Remaining limits

Persistent server corruption still blocks safely; no retry can repair missing files on an unrelated host. Hosts ignoring the supplied cache rules should be configured to revalidate entry HTML/manifests. Browser/device hardware certification and subjective camera comfort remain unverified. Car scan integration remains 0/47, and all historical-route/geometry/provenance limitations from previous releases remain unchanged.

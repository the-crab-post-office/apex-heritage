# Validation — 0.16.0-preview.1

## Current building / banked-ground follow-up

Branch `feature/photo-buildings-and-banked-ground`, based on `93f3972`. The existing 0.16 preview label is retained; immutable release archives are not replaced.

- **94 optimized Rust/native tests passed**: 85 shared + 9 native (`artifacts/017-rust-final.log`). Includes explicit appearance coverage, bank-fade derivative/earth seam regressions, existing five-era brake/steering cases and native rendered road/pit exclusion. Release native executable rebuilt.
- **144 Node tests passed** (`artifacts/017-node-tests.log`), including four new appearance/banked-earth tests and real WASM brake-held steering regressions. **36 Python tests passed** (`artifacts/017-python-tests.log`).
- All **13 venues** rendered with explicit appearance assignments and all texture loads successful. Actual wall-ray audits found no missing tested facades; sampled actual road triangles had no terrain/overlay intrusions. First pass: 12 passed and Zandvoort exposed kerb-boundary precision cracks (`017-building-browser.log`). After keeping earth below kerbs and adding a continuous 0.3 m lower bed, the Zandvoort recheck passed **3,420 ground probes, zero missing surfaces** (`017-ground-recheck.log`). This is sampled coverage, not proof of every possible camera/pixel.
- **15 production browser regressions passed** (`artifacts/017-regression-browser.log`): all three new circuits, keyboard brake priority, brake-held steering, both modern-Monaco architecture qualities, recent Spa eras 3/4, old Spa preservation, Monaco building headroom in eras 0/3 and both offline reports/mobile layout. These are focused checks, not the entire historical browser suite.
- **Native Zandvoort all-eight-camera render/physics smoke passed**, 118.7 km/h (`artifacts/017-native-smoke.log`). Browser/native GPU workloads ran serially. Native facades use cumulative wall-distance UVs and the corrected vertical texture orientation; native is not a full browser-detail replica.
- Genuine production captures refreshed: six expansion views, seven Spa/Monaco follow-up views and all ten track views in the photo audit (`017-captures.log`, `017-spa-monaco-captures.log`, `017-track-captures.log`). No old screenshot pixels were relabelled as new renders. Five unchanged car-only photo-audit views are retained. New appearance inputs/textures are included in the relevant capture provenance.
- T3 peak is 10°; T14 is 18° over the retimed 731–801 station window. These remain authored linear banks, not surveyed variable bowls or calibrated 3D tyre dynamics. Buildings are venue/photo-guided estimates across 4,419 mapped parts, not individual photo surveys; known mapped height envelopes and road exclusion remain authoritative.

Published implementation **`36268aa0503ca74f8d1e952e50d65fad626331fd`**, Pages **`77d95eb9dd33582e473ef260f6b2489f47a412a5`**. The public browser was independently checked after Pages propagation (`artifacts/017-live-verification.log`, `017-live-results.json`): T3 −0.176327 cross-slope / 10°; T14 +0.32492 / 18°; 507 safely rendered Zandvoort building parts with explicit appearances; **1,720 public ground probes, zero misses**; zero sampled road/terrain/overlay intrusions, all texture loads successful and no page errors. Public WASM exactly matches the tested local binary, SHA256 **`d830722f5ebfd0b80520cc6e4e946d7cefff31c508fe5408dcaf9e474277a418`**. The live report includes the new building scope/limits and genuinely refreshed captures. Workspace stayed within budget after Git object compaction (~122.6 MB); no project source or release assets were deleted.

## Live steering-response hotfix

Follow-up branch `feature/brake-steering-response`, based on `6cf86c5`. Removes the extra brake-induced steering-budget cut introduced by the original 0.16 allocator. At its 96% longitudinal-grip cap the old friction-circle remainder left only 28% lateral capacity, then the rear dynamics also evaluated combined braking demand. Brake priority still suppresses engine thrust, and the strong braking force, wet/partial-pedal progression, steering input filtering and combined-input rear-slip model remain intact. This is a simplified playable handling model, not a strict 3D friction-circle solver.

- A new matched-speed/station Rust regression explicitly fails against the old allocator: 1967 dry coast yaw rate 0.37561285 versus 0.10562117 under full braking. The corrected model preserves at least 95% of matched-speed turn-in across all five eras, dry and wet, while still decelerating more than coasting.
- **83 shared Rust tests passed with native features**, and the optimized native executable rebuilt (`artifacts/016-steering-rust.log`). All five original dry 100–0 stopping distances/times are unchanged (`artifacts/016-steering-tests.log`).
- New tests exercise the actual released WASM, comparing coasting and full-brake turn-in over an unmodified moving trajectory in all five eras, wet/dry. Brake-held curvature must remain at least 90% of the coast case and speed must fall more than coasting (`tests/brake-steering.test.mjs`).
- **140 Node tests and both focused keyboard browser tests passed** (`artifacts/016-steering-node.log`, `artifacts/016-steering-browser.log`): real ArrowLeft+Space input retains turning, while the separate W+Space test still reaches a complete stop. The six new-circuit views have been genuinely recaptured against the hotfixed WASM, with updated hashes and corrected handling description. Geometry/layouts are unchanged; existing photographic report capture inputs remain valid.
- This is a **live-preview/main-source hotfix under the existing 0.16 preview label**, not a rewrite of the immutable v0.16.0-preview.1 release tag or its archived ZIPs. Those downloadable archives remain the original snapshot. Refresh an already-open game page to load the hotfix.

Published hotfix source **`b29b0341debc88bafa61c42dfaa8ffee9e9a0c13`**, Pages **`783e674b1c10e04c05ecbfda90f1ceeef8412bd3`**. The live browser passed simultaneous ArrowLeft+Space turn-in/deceleration comparisons for all ten era/weather combinations with zero page errors (`artifacts/016-steering-live.json`, `artifacts/016-steering-public-final.log`). The served WASM bytes exactly match the tested source binary: SHA256 `80337b6a0d8fbbf7b84fe3899f030c9cde0efd232718621d48dbb1c5d90bef80`. Optimized native all-eight-camera/render/physics smoke also passed (`artifacts/016-steering-native-smoke.log`). The first live probe clicked before async menu readiness and timed out; the final probe explicitly waits for the showroom readiness marker before starting.

## Original 0.16 validation and publication

Branch `feature/braking-and-three-circuits`, based on main `e92c53d` (0.15). Scope: brake authority/pedal overlap and three photograph/map-guided modern circuits, preserving the earlier Spa/Monaco work.

## Shared model and native renderer

- **91 Rust/native tests passed**: 82 shared-library + 9 native-renderer tests (`artifacts/016-rust-final2.log`). Optimized native executable and release WASM compile successfully. Native suites verify every venue's finite/bounded batches, concrete foundations, exact corner-contact triangles and rendered terrain/pit exclusion for all 13 circuits.
- Dedicated brake rigs check all five eras: absolute dry stops, 250 km/h high-speed authority, wet versus dry, half-pedal progression, full-throttle overlap and braking at the cornering limit. Rigs hold the fixed Monza start station/grade and reset position to isolate collisions/runoff. They are gameplay measurements, not real-car telemetry. 100–0 km/h dry values: 1967 32.48 m/2.37 s; 1988 23.98 m/1.78 s; 2004 20.32 m/1.52 s; 2023 18.85 m/1.41 s; 2021 18.53 m/1.38 s. Full throttle plus full brake matches brake alone.
- Zandvoort's bank tests compare actual mesh cross-slopes with physical support, check tyre-height separation and body roll. Exposed banked apron edges now have earth retaining faces, not sky holes. These are simplified terrain closures, not surveyed dune transitions.

## Offline geographic and browser evidence

- **36 Python tests passed** (`artifacts/016-python-final2.log`): independent retained-source contracts, byte-identical original ten circuit/layout/surface records, deterministic offline rebuilding, road/pit/building exclusions, explicit 90 m Baku provenance and correct nearby castle-wall ID.
- **139 Node tests passed** (`artifacts/016-node-final2.log`): full suite, with current-build checksums for all four self-contained report pages. The three older report pages were genuinely recaptured at 0.16 rather than relabelled historical images.
- **Five new browser tests passed** (`artifacts/016-expansion-browser-final.log`): each new track selectable with actual rendered road audits, zero missing road/pit-overlap/terrain/overlay intrusions, modern substitution labels and trackside batches; real W+Space input into the released WASM model accelerates then fully stops with throttle suppressed; all six embedded images decode and filter without overflow at 390 px.
- **Three optimized-native all-eight-camera/render/physics smokes passed**, one for each added venue (`artifacts/016-native-smoke-final.log`). Software rendering and shared physics remain finite and accelerate beyond the smoke threshold. This is not a hardware-GPU performance benchmark.
- **24 preserved-feature browser cases passed**: 23 passed in the main batch, and the mobile menu case passed separately after its obsolete ten-track assertion was updated to thirteen (`artifacts/016-browser-regression.log`, `artifacts/016-mobile-final.log`). Together with the five new cases, **29 unique browser cases passed**. Coverage includes actual driving/braking/steering/pause/recovery, wet five-car AI, recording fallback, all 13 menu cards and geographic filters, mobile overflow, 2021 deep links, four offline report pages, all-era tyre pivots, historical/recent Spa surface isolation, all-era Eau Rouge and the Monaco over-road hotel with vehicle headroom. This was a focused regression batch, not a claim that every browser test in the repository was run.

Six actual 1000 × 625 production views, not generated promotional artwork: Yas hotel/marina and Marsa; Zandvoort Hugenholtz and Luyendyk; Baku castle corridor and shoreline straight. `data/expansion-captures.json` retains camera/input/image hashes; `new-circuits.html` embeds all six without external dependencies. References/rights and important accuracy limits are recorded in `data/EXPANSION-NOTICE.md` and `data/expansion-references.json`.

The initial Baku capture mistakenly used the distant palace courtyard wall. Final castle geometry instead uses thin mapped way 1502989778 at the actual T8/T9 corridor; the regression checks the mapped ID and proximity. No ordinary ground-building corridor filter was disabled. Reference photographs are not redistributed.

New layouts remain labelled modern substitutes for every car era. Original ten circuit/layout/surface records are checksum-preserved, including older Spa surfaces and the existing all-era Eau Rouge treatment. Road widths remain constant authored estimates; Baku's real wider straights and Zandvoort's variable banking bowl are not reconstructed. Baku elevation is explicitly 90 m DSM rather than mislabelled 30 m. Hardware controller handling and hardware-GPU/mobile performance are not certified by headless/software-renderer tests.

## Published 0.16 verification

- Release source **`6effba552d8f9399afacf7b7d7f69a2fa3c32ac2`**, tag **`v0.16.0-preview.1`**, Pages commit **`1b4c5c3c667a6eb11d0f44477e60e9fff92b2a80`**. Public manifest and browser returned **0.16.0-preview.1 / 4329d0cd**. This suffix is the track-data identity, not a WASM SHA256 checksum; the capture manifest separately hashes the exact WASM bytes.
- Live browser displayed all **13 selectable circuits**. The real keyboard W+Space route stopped the released WASM model from 50.274353 m/s to zero during 3.5 seconds of fixed stepping while W stayed held; effective throttle was zero and brake one. This is a functional overlap regression, not a measured 100–0 rig or real-car stopping claim.
- Live Monza and all three new venue road audits found **zero missing road, pit overlaps, terrain/overlay intrusions or centreline errors**. New venues remained explicitly modern-layout substitutes.
- All four public reports decoded **63 embedded images total** and fitted a 390 px viewport; the new report's Baku filter showed exactly two views. **Zero page errors and zero failed HTTP responses** (`artifacts/016-public.json`, `artifacts/016-public-validation.log`, `artifacts/016-public-report.png`).
- Source/browser/Linux ZIPs and SHA256SUMS.txt were uploaded to the tagged prerelease. All three archives passed CRC, source/build-identity, new-report inclusion and credential/cache exclusion checks. Every remote asset's SHA256 and size matched local bytes (`artifacts/016-archive-validation.json`, `artifacts/016-upload.log`). `RELEASE-ARCHIVES.json` now indexes **56** assets. Large ZIPs stay outside the size-limited workspace; the index preserves permanent download URLs/checksums.
- These post-publication records intentionally follow the release-source commit; the release tag/archives retain the validated source snapshot rather than being silently rewritten.

---

# Archived validation — 0.15.0-preview.1

Branch `feature/spa-corners-and-monaco-building`, based on published main `5426aa2` (0.14). User scope: recent Spa and labelled 2021 substitute only; modern Monaco building/tunnel for every era.

## Completed offline/native checks

- **85 Rust/native tests passed**: 76 shared library + 9 native renderer. New cases verify overhead hotel coverage/clearance and recent-only Spa collision walls while leaving all requested corner centrelines drivable. Optimized Linux executable built successfully.
- **125 Node tests passed**, including seven embedded actual render hashes, fifteen-photo audit inputs/capture hashes, explicit hotel coverage, unchanged ground-building clearance filter, all-era Monaco/recent-only Spa and the wheel pivot regression.
- **30 Python tests passed** in the final full run (with the five follow-up checks rerun after strengthening the protected Eau Rouge assertion). They cover offline deterministic generation, all unchanged historical profiles, all unchanged other-track profiles, non-overlapping new paint/paving with road/pit/building exclusion, individual corner apexes, hotel/ground-building connection and preserved courtyards. Baseline profile checksums live in the reference manifest, so source ZIP validation does not require Git history.
- **62 car shape/layout/roster/atlas/native-mapping files remain byte-identical to 0.14**. No handling, car model, audio, camera-control or wheel-animation update is made in this release.
- Production build verifies real WASM identity **0.15.0-preview.1 / d934b07c** and matching emitted binary bytes. The latter is the unchanged track-data identity, not a WASM checksum. Corner details, era-scoped walls and shared scene facets do change the binary.

## Final render/browser regression

- **17 unique browser tests passed**: seven new Spa/Monaco/report cases; independent wheel pivot support; both car/Spa reference checks; both offline comparison/mobile suites; full 2021 deep-link/mobile selection; and high-detail facade/tunnel/local-asset validation. Actual mesh raycasts cover at least 25 tunnel road samples with zero hotel obstruction inside the 4.65 m clearance envelope. Browser batch: 16 passed in 4.2 minutes plus the 25-second high-detail check.
- **Optimized native all-eight-camera/render/physics smoke passed twice**: recent Spa/2023 and Monaco/1967. Exact results: `artifacts/015-native-smoke.log`. Native remains visually simpler; this is a software-renderer smoke test, not a hardware performance benchmark.

## Render evidence and limits

`spa-monaco-update.html` embeds **seven actual high-quality production views**, 1000 × 625: La Source, Les Combes, Malmedy, Bus Stop, finish straight, Monaco portal and hotel context. `data/spa-monaco-captures.json` records the exact images/cameras/version and input hashes. The broad fifteen-photo and ten-team 2021 pages were also recaptured and rebuilt for 0.15. No user reference image pixels are redistributed.

Initial renders exposed a remaining La Source grass pocket, a blank hotel infill facade and an exposed grassy hillside at the portal. The final captures show a paved inner island, outward-facing facade windows and explicit podium cladding instead. No ordinary ground-building exclusion was disabled. The hotel floor is at y=11.0044 m, above the existing road plus at least 4.65 m; the existing tunnel ceiling, lighting, guardrails and vehicle path remain intact.

Road/pit centrelines, legal racing width and timing-line position are unchanged. The historic Spa profiles remain byte-identical. Existing all-era Eau Rouge heights/kerbs/projected aprons are preserved; the latest surface can be retessellated without changing its footprint. Portal connection, hotel facade spacing/height, runoff widths, kerb extents, barrier offsets, garage architecture and materials remain authored estimates. Reference years/rights are not established; views are not camera-matched. No exact sponsor inventory, survey, scan, telemetry or real-device performance claim is made.

Evidence: `artifacts/015-{rust-final,node-final,python-final,followup-python-final,browser,native-smoke,reference-captures-final,track-captures,car-captures,reports}.log`.

## Published 0.15 verification

- Release source **`0bbf459`**, tag **`v0.15.0-preview.1`**, Pages commit **`12ecd760a2160f4206b94ec692e44d1d3bb1aad9`**. Live manifest returned 0.15.0-preview.1 / d934b07c.
- Public browser selected the 2021 Red Bull RB16B, started practice and accelerated through the shared WASM simulation. Wheel axle/support error remained zero through the steered-spin check.
- Public Monaco scene raycasts: **32 covered road samples, zero obstructions, minimum overhead hotel clearance 4.7612 m**. This measures the new hotel facets; it does not replace the existing tunnel ceiling clearance check.
- Public reports decoded all **20 car comparison images, 30 broad-audit images and 7 new scene images**, with filters working and no horizontal overflow at 390 px. **Zero page errors and zero failed HTTP responses** were recorded. Evidence: `artifacts/015-public.json`, `artifacts/015-live.log` and the four `015-public-*.png` captures.
- Source, browser and Linux ZIPs plus SHA256SUMS.txt were uploaded to the release. Remote digest/size matched local bytes; every ZIP passed CRC, embedded-report/provenance/build-commit checks and secret/cache exclusion. `RELEASE-ARCHIVES.json` now indexes 52 assets. Archives preserve release-source documentation; this post-publication record intentionally follows in a separate metadata commit.

## Reproduce

```sh
python3 scripts/build-corner-details.py
python3 scripts/build-reference-scenes.py
cargo test --features native
python3 -m unittest discover -s tests -p 'test_*.py'
bash scripts/build-web.sh
python3 scripts/serve-web.py --port 5186
# In another terminal; run GPU capture/validation jobs serially.
node scripts/capture-spa-monaco-update.mjs
python3 scripts/build-spa-monaco-report.py
node scripts/capture-track-audit.mjs
node scripts/capture-car-comparison.mjs
python3 scripts/build-photo-audit.py
python3 scripts/build-car-comparison.py
npm run build
npm test
APEX_URL=http://127.0.0.1:5186 npx playwright test tests/spa-monaco-followup.spec.js tests/wheel-pivots.spec.js tests/photo-reference.spec.js tests/car-comparison.spec.js tests/2021-grid.spec.js
APEX_URL=http://127.0.0.1:5186 npx playwright test tests/features.spec.js --grep 'high-detail materials'
cargo build --release --features native --bin apex-native
APEX_SMOKE=1 APEX_SMOKE_ALL_CAMERAS=1 APEX_SMOKE_TRACK=1 APEX_SMOKE_ERA=0 xvfb-run -a target/release/apex-native
python3 scripts/workspace-budget.py
```

---

# Validation — 0.14.0-preview.1

Branch `fix/wheel-pivots-and-photo-accuracy`, based on main `8becfba`. Tyre-axis correction, fifteen-photo all-track/all-era audit, bounded recent-surface and period-car refinements.

## Completed checks

- **83 Rust/native tests passed**: 74 shared library + 9 native. Includes per-axle radii, actual native terrain/road exclusion and new physical-apron coverage masking. Optimized Linux executable built successfully.
- **123 Node tests passed** in the final post-capture run, including every embedded image and shared input hash. The wheel regression checks all five eras, both steering locks and many revolutions; apron mask checks exclude vertical kerb sides and grass-only facets.
- **25 Python tests passed**, including all ten track audit metadata, all five recent refinements, older-profile hashes and deterministic offline geometry.
- **7 targeted browser tests passed on the final build**: production wheel axle/contact invariance; historical/recent Monza contact and labels; both offline comparison pages with mobile layouts and working filters. Both full-2021-grid/deep-link/mobile tests also passed after the grass-mask correction as part of the extended regression run.
- Production WASM identity and emitted binary bytes verified as **0.14.0-preview.1 / d934b07c**; the latter is the unchanged track-data identity, not the binary checksum.

- Optimized **native Spa/2023 all-eight-camera render/physics smoke passed**, reaching 119.0 km/h.
- **62 roster/shape/layout/atlas/embedded mapping files regenerate byte-identically**, after helmet refinement, shape/livery generation and Rust formatting.

## Evidence and scope

`artifacts/014-{rust-final,python,node-final,track-captures-final,browser-final,browser-regression,native-smoke,determinism}.log`. `data/photo-audit-captures.json` records all fifteen actual production render checksums, cameras and shared input hashes. `photo-accuracy.html` embeds fifteen credited reference photographs and fifteen game captures, with responsive offline filters, source/license links and per-card uncertainty. Updated `car-comparison.html` retains the ten-team 2021 comparison.

Terrain/shoulder grass is geometrically excluded from shared physical apron/kerb projections in the browser, and terrain in native. An initial visual capture exposed grass islands over sloped Spa paving; the post-mask capture shows the wide apron instead. Coarse-cell clipping has a projection AABB early-out so unrelated facets do not fragment each other. Initial pre-optimization capture timed out; that attempt is not counted as a passing result.

This is **not** a complete reconstruction of ten tracks/fifty historical layouts or 57 constructor chassis. Five recent track presets receive bounded corrections; five are reviewed/retained on insufficient evidence. Only representative cars from each era are compared. Source photos differ in date/viewpoint and are not camera-registered. Period dimensions, sponsor text and small aero remain authored approximations. **0/57 verified scans**. No calibrated telemetry, physical-controller or subjective audio validation is claimed. Native remains visually simpler and does not animate steering/spin; the browser wobble fix is not described as a new native animation feature.

## Final regression and publication

- **26 unique browser checks passed** on the final production build: 7 targeted wheel/contact/offline-report/mobile cases plus the 19-test extended game/grid/build-recovery/car-reference/showroom run. The 114 showroom changes (two complete 57-entry passes) loaded every atlas, disposed previous resources and kept existing geometry/texture ceilings. Extended run: 15.9 minutes using software rendering, including 5.6-minute showroom suite; this is not a device performance benchmark.
- Source/tag: `280b203`, **`v0.14.0-preview.1`**. Feature branch and main pushed. Pages commit **`093cef7ffda011e5550fbce9d1ec8c340419de6b`** publishes that coherent version.
- All four release downloads (source/web/Linux ZIPs + SHA256SUMS) uploaded; each remote SHA256 digest and byte length matches. Archive integrity, HTML/notice inclusion, no caches/history and zero credential bytes verified before upload. `RELEASE-ARCHIVES.json` now indexes **48 remotely verified assets**. Large ZIP copies stay outside the size-limited workspace.
- The public photo and 2021 comparison pages and all three new audit manifests/notices match local SHA256 bytes. **Live public browser check passed**: real Rust/WASM acceleration, 2021 selection, forty-frame independent wheel-axis/support test, both reports (20 + 30 decoded images), team/track/car filters and 390px audit layout; **zero page errors or HTTP error responses**. Evidence: `artifacts/014-public.json` and `014-public-{game,comparison,audit}.png`. Initial public screenshot/navigation attempts exceeded 30-second software-renderer bounds; the successful rerun uses an 800 × 600 view, a longer screenshot/navigation bound, a smaller wheel-regression render target and a fresh browser after releasing the game WebGL context. No game assertion was removed.

## Reproduce

```sh
cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
bash scripts/build-web.sh
python3 scripts/serve-web.py --port 5186
# in another terminal; avoid concurrent GPU runs
APEX_URL=http://127.0.0.1:5186 npx playwright test tests/wheel-pivots.spec.js tests/2021-grid.spec.js tests/car-comparison.spec.js tests/corners.spec.js
node scripts/capture-car-comparison.mjs
node scripts/capture-track-audit.mjs
python3 scripts/build-car-comparison.py
python3 scripts/build-photo-audit.py
bash scripts/build-web.sh
cargo build --release --features native --bin apex-native
python3 scripts/workspace-budget.py
```

---

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

## Published release verification

- Source/tag: `19ce2f0`, `v0.13.0-preview.1`; `main` and feature branch pushed. Pages commit `056ee6fa9829b064021e7b51ee8f012de3ec98a7` publishes that coherent build.
- **Live public Pages browser check passed**: query selects 2021 Red Bull RB16B, actual Rust/WASM accelerates above 3 m/s, version 0.13.0-preview.1; ten comparison cards / twenty decoded images, functioning team filter, **zero page errors or HTTP error responses**. Evidence: `artifacts/realism-public.json`, `artifacts/013-public-{game,comparison}.png`.
- Source/web/Linux ZIPs and SHA256SUMS uploaded to the GitHub release; all four byte lengths and GitHub SHA256 digests verified. ZIP integrity, absence of credential bytes and absence of caches/history checked before upload. `RELEASE-ARCHIVES.json` now indexes 44 remotely verified assets. Large ZIP copies remain external to the size-limited workspace.
- Final budget approximately **102 MB / fewer than 1,000 entries**, under 128 MB / 10,000. Exact current count: `python3 scripts/workspace-budget.py`.

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

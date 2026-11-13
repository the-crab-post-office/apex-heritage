# Validation — 0.8.0-preview.1

Workspace validation: **8 November 2026**. Branch: `feature/full-grid-liveries-showroom`; stable `main`/`v0.6.0` and the previous 0.7 release are preserved.

## Scope, not just pass counts

This update delivers expanded constructor selection, original reference-guided liveries, a selected-car 3D menu and source cleanup. **Historical road reconstruction remains unfinished**: all ten tracks retain recent mapped roads with explicit substitution labels on older presets. Exact historical facilities, surveyed elevation, exact corporate artwork, per-constructor chassis scans and race-by-race paint variants are not delivered. Native decals, scenery and UI remain simpler than web.

## Results

| Check | Result |
|---|---|
| Rust with native feature | **63 passed**: 60 library + 3 actual native-mesh regressions |
| Node | **88 passed** |
| Python geometry/offline regeneration | **11 passed** |
| Original full production browser run | **27 passed / 1 failed**; failure was the old painted-vertex diagnostic threshold after the atlas split |
| Corrected paint geometry/diagnostic production retest | **1 passed**, without lowering the regression threshold |
| New showroom suite, development build | **3 passed** |
| Final production menu/game/showroom suite | **11 passed** (8 menu/race + 3 showroom) |
| Final rebuilt atlas-only production verification | **3 passed** after final sponsor-text corrections |
| Rust release WASM/bindings/static build | Passed; Vite still warns about large chunks |
| Native Linux release build | Passed |
| Final Xvfb native render/physics smoke | Spa/V10 **119.6 km/h**; Monaco/1967 **75.2 km/h** |
| Offline atlas determinism | All **47 PNGs byte-for-byte identical** after regeneration |

The initial comprehensive browser run took 16.2 minutes. A concurrent retest temporarily crashed Chromium under the sandbox's limited memory; the isolated retest passed. Final browser checks are run serially to avoid this test-environment contention. Do not interpret the initial failed run as a clean all-pass run.

## New assertions and visual checks

- Shared catalog counts **9 / 18 / 10 / 10**, 47 unique constructor IDs, finite distinct power tuning, safe out-of-range fallbacks, per-team reference URLs and complete local 2048×1024 PNGs.
- Naturally aspirated 1988 constructors have zero lag and zero simulated boost during acceleration; turbo entries retain spool-up. This is not a full architecture-specific engine model.
- Showroom selects every constructor twice (**94 atlas loads**), checks readiness and bounded geometry/texture counts, and disposes its canvas/resources. Failed atlas requests explicitly fall back to solid team colour with visible status rather than leaving an unusable texture.
- 390 px mobile layout has no horizontal page overflow; reduced-motion disables rotation; race view suspends studio renders; camera controls remain usable.
- Browser screenshots inspected for Ferrari 2004, McLaren 1988 and modern selection; sponsor UV mirroring was corrected. This is visual sample review, not a certification of every sponsor's historical placement on every surface.
- Native menu screenshot inspected after correcting camera field-of-view units and providing a dedicated car viewport. Native race smoke verifies rendering and acceleration, not complete driven laps.
- Redundant checked-in map/building copies and obsolete hero are absent; browser and Rust consume authoritative data. Font/livery notices are included in release packaging and browser `/licenses/` assets.

## Retained coverage

Rust, Node, Python and production browser suites retain progressive spin/countersteer/assist/wet behaviour, swept barriers, recovery, **40 circuit/era pit-service flows**, shared physical corner meshes, all-four-off track limits, kerb bottoming and wheel-height support. Sampled all-ten modern road raycasts report zero missing road, pit-overlay, terrain/corner intrusions or centre errors across **6,395 samples**. Browser regressions also cover controller/disconnect input, real recording/fallback loading, Monaco tunnel, facades, AI/rain, session persistence and incompatible-build rejection. Historical preset dimensions/mesh finiteness are covered across all 40 presets; historic geographic accuracy is not.

Physical controller hardware, subjective driving/listening approval, suspension engineering fidelity, geographic elevation precision and legal permission to distribute branding remain unverified. AI is a small non-colliding field, not a full championship grid simulation. The catalog's completeness is constructor selection, not all drivers/entries or simultaneous cars.

## Reproduce

```sh
. "$HOME/.cargo/env"
cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/build-liveries.py
cargo fmt
./scripts/build-web.sh
python3 -m http.server 8080 --directory site
# Separate terminal; run serially on memory-constrained machines:
APEX_URL=http://127.0.0.1:8080 npx playwright test

cargo build --release --features native --bin apex-native
APEX_SMOKE=1 APEX_SMOKE_TRACK=0 APEX_SMOKE_ERA=2 xvfb-run -a target/release/apex-native
APEX_SMOKE=1 APEX_SMOKE_TRACK=1 APEX_SMOKE_ERA=0 xvfb-run -a target/release/apex-native
```

All HTML/CSS/JS/WASM/version assets report **0.8.0-preview.1**. Use the complete fresh static folder, not individual files copied over an old release. Logs, screenshots, downloaded visual references, caches, test reports and Git history are not packaged. Meaningful prior release ZIPs remain under `releases/`; source archives exclude that directory.

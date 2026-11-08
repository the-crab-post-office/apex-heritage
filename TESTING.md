# Validation — 0.7.0-preview.1

Workspace validation: **8 November 2026**. Feature branch: `feature/photo-referenced-corner-surfaces`; stable `main`/`v0.6.0` are unchanged.

## Scope, not just pass counts

This is a **partial delivery of the confirmed historical scope**. All ten recent mapped circuits have four corner-surface presets, not four genuinely reconstructed historical road/scenery layouts. Substitution labels are visible in setup and race HUD. Exact historical stand/barrier placement, surveyed kerb dimensions and all-ten historic road/pit/elevation/AI/minimap synchronization are **not validated or completed**. The map/photo evidence and remaining approximation risks are detailed in `data/CORNER-DETAILS-NOTICE.md`.

## Results

| Check | Result |
|---|---|
| Rust with native feature | **60 passed**: 57 library + 3 actual native-mesh regressions |
| Node | **86 passed** |
| Python geometry/offline regeneration | **11 passed** |
| Full production browser suite before final source-semantic refinement | **28 passed**, 10.6 minutes |
| Final production corner/surface/venue suite after refinement and rebuild | **17 passed**, 6.2 minutes |
| Rust release WASM/bindings/static build | Passed |
| Native Linux release build | Passed |
| Xvfb native start/render/physics smoke | Spa/V10 **119.6 km/h**; Monaco/1967 **75.2 km/h** |

The final refinement rejects open gravel paths, parking, parks, courts and beaches as mapped race runoff. It does not change car handling, controls or pit state flow. The final browser road audits explicitly select the **modern scene on all ten circuits**, not just the default 2004 surface preset. Historical preset dimensions/mesh finiteness are covered across **10 circuits × 4 eras** by Rust, with additional 1967/modern Monza browser checks. Full browser coverage also exercised controller input/disconnect behaviour, touch layout, engine recordings/fallbacks, pit service, varied materials/facades, Monaco tunnel, AI/rain, setup persistence and coherent build rejection.

## New contact/mesh assertions

- Oriented tyre-patch versus actual road triangles: front/rear and sideways cases, partial departures, inclusive white-line touch, no bounding-box false positives, visual/physical wheel-centre agreement.
- An actual `Simulation::step` stays valid with two tyre patches on the road and loses grip independently; moving completely outside sets zero legal patches, off-track and invalid-lap status.
- A deliberately high floor-probe fixture can bottom out while **all four patches remain legal**. A separate test uses an **actual authored Monza raised kerb**, not only a synthetic fixture, and confirms a floor strike with tyres still legal.
- Shared corner triangles have finite coordinates and nonuniform widths/raised profiles across all 40 presets. Barycentric picking is tested against points inside a bounding rectangle but outside the triangle.
- Native corner batches reproduce **every exact shared triangle vertex**, use bounded renderer batches, and retain the existing actual terrain/pit mesh regression. Venue batches for every circuit remain within **3,996 vertices**.
- Browser vertex totals equal the Rust contact mesh; rendered tyre bottoms match four telemetered support heights within **1 mm**; mapped grandstand buildings are not extruded twice. Old global box kerbs/rails and generic full-lap gravel shoulders are removed.
- Python independently checks whole collision capsules and stand footprints against complete race/pit roads, mapped rectangle orientation, photo-link metadata/substitute labels, runoff non-overlap, semantic source eligibility, and deterministic **offline byte-for-byte** regeneration.
- Browser road raycasts include the new actual corner meshes among overlays. Across **6,395 sampled road positions**, final all-ten modern audits report **zero** missing road hits, pit overlays, terrain intrusions, corner/shoulder intrusions or centre errors over tolerance. This is sampled rendering regression coverage, not proof about every possible viewing point or geographic accuracy.
- Existing progressive spin/countersteer/assist/wet behaviour, swept high-speed barrier impacts, recover/reset, and **40 circuit/era pit-service flows** still pass.
- Floor scrape DSP is audible while moving, silent when stationary, and retains existing recording/pitch/headroom tests.

Actual production stand, kerb/runoff and tunnel camera captures were inspected. Camera walkthroughs and synthetic contact fixtures are not autonomous or human-driven full laps. Native smoke tests establish startup/rendering/acceleration, not a complete native track walkthrough. Physical controller hardware, subjective handling/listening approval, suspension engineering fidelity, surveyed elevation and historical accuracy remain unverified. Barrier collision is a simplified car-centre capsule model without damage; grandstands remain scenery.

## Reproduce

```sh
. "$HOME/.cargo/env"
cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
./scripts/build-web.sh
python3 -m http.server 8080 --directory site
# In another terminal:
APEX_URL=http://127.0.0.1:8080 npx playwright test
# Focused final geometry suite:
APEX_URL=http://127.0.0.1:8080 npx playwright test tests/corners.spec.js tests/surfaces.spec.js tests/venue.spec.js

cargo build --release --features native --bin apex-native
APEX_SMOKE=1 APEX_SMOKE_TRACK=0 APEX_SMOKE_ERA=2 xvfb-run -a target/release/apex-native
APEX_SMOKE=1 APEX_SMOKE_TRACK=1 APEX_SMOKE_ERA=0 xvfb-run -a target/release/apex-native
```

Use the complete freshly built static folder. `version.json` and HTML/CSS/JS/WASM all report **0.7.0-preview.1**. Core/data hashes identify coherent assets, not survey precision. Logs, screenshots, research photographs, caches and test reports are disposable workspace artifacts and are not packaged. The old v0.6 validation record is retained in Git history rather than repeated here.

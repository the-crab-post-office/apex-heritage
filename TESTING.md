# Validation — 0.11.0-preview.1

Branch: `feature/finished-cars-camera-rigs`, based on preserved `v0.10.0-preview.1`. This pass improves original car geometry and adds cameras. **Zero of 47 constructor-specific scans are integrated.** Earlier Monaco/Spa changes remain; their previous validation records are in preserved release source ZIPs/tags, not counted as new passes here.

## Implemented scope

- Four shared authored era meshes in both clients; legacy 1988/2004 runtime primitive builders removed. Period turbo/V10 bodywork, wings, suspension, mirrors, radiator mouths, engine covers and exhausts are approximations, not constructor-specific CAD.
- Cockpit floor, instruments/headrest, arms/gloves/harnesses, wheel/brake/upright details, closed loft bulkheads, solid modern endplates, modern wheel covers and V10 four-groove dry tyres. Original 1967/2023 photo guidance retained; no new scan/photo evidence claimed for 1988/2004.
- Eight rigs in `data/cameras.json`: Chase, Cockpit, High chase, TV onboard, Nose, Rear-facing, Side tracking and Orbit. Browser selector supports keyboard/touch, C/RB cycles; native also supports 1–8 direct selection and an active-view label.
- Attached views inherit chassis pitch/roll. Cockpit mode hides only the player's isolated helmet/visor batches and makes halo batches translucent for road visibility; exterior views restore them. Opponents remain visible. Near plane reduced for close fittings.
- Showroom top/detail presets. Existing 47 constructor liveries and explicit scan-pending notices retained.
- 1988/2004 wheel dimensions are unchanged from the previous contact fallback; now explicitly stored alongside their shared meshes. This is not a physics re-tune.

## Current validation

| Check | Result |
|---|---|
| Rust release native-feature suite | **71 passed**: 64 library + 7 native |
| Node suite | **100 passed** |
| Python offline suite, including byte-deterministic car regeneration | **15 passed** |
| Final production browser checks | **13 passed** in 9.2 minutes |
| WASM, production static web and Linux native release builds | **Passed** |
| Native all-era/eight-camera rendering + driving smoke | **4 passed**, serially: 1967 **75.7**, 1988 **98.4**, 2004 **119.6**, 2023 **119.3 km/h** |

The 13 final browser cases comprise two new car/camera cases, eight existing game cases and three showroom cases. They cover all four rendered era cars, eight distinct camera poses, head/halo restoration, direct selection and C-key wraparound, mobile selector access, driving/braking/steering/recovery/pause/exit, wet quick-race AI, mobile sizing, setup persistence, recorded/procedural audio paths, and all 47 livery selections repeated with GPU resource bounds. No browser page errors occurred in the new car/camera cases. The earlier five-case pre-refinement run also passed but is not added to this total.

Actual renderer screenshots for all four era cars and cockpit/onboard/rear/orbit views were inspected. Initial inspection prompted period-specific flatter wing profiles, modern aero wheel covers, and cockpit halo translucency instead of accepting a heavily blocked view. Final captures are under ignored `artifacts/`. Screenshots are not generated concept art.

Vite still reports a large-chunk warning: shared generated geometry is bundled locally. Native shading/decals remain simpler. No subjective handling/listening approval or physical controller hardware certification is claimed. The entire unrelated Monaco/grounding/venue browser suite was not rerun in this stage; all offline suites were.

## Reproduce

```sh
. "$HOME/.cargo/env"
python3 scripts/build-car-shapes.py
cargo test --release --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
bash scripts/build-web.sh
cargo build --release --features native --bin apex-native
python3 -m http.server 8080 --bind 0.0.0.0 --directory site
# Separate terminal; run browser and native GL checks serially:
APEX_URL=http://127.0.0.1:8080 npx playwright test tests/cameras-and-finish.spec.js tests/game.spec.js tests/showroom.spec.js
for era in 0 1 2 3; do
  APEX_SMOKE=1 APEX_SMOKE_ALL_CAMERAS=1 APEX_SMOKE_TRACK=0 APEX_SMOKE_ERA=$era xvfb-run -a target/release/apex-native
done
```

`APEX_SMOKE_CAMERA=0..7` can select a single native smoke view instead. Safe workspace cleanup remains dry-run-first; no original uploads, previous releases or source assets were removed during this pass. Release-profile Rust checks avoid rebuilding the previously removed large debug cache.

## Accuracy / unfinished work

These are four shared-era reconstructions across 47 livery selections, **not 47 distinct chassis or licensed scans**. Source/rights and candidate-acquisition status remain in `SOURCES.md`, `data/PHOTO-REFERENCE-NOTICE.md` and `data/CAR-SCAN-STATUS.md`. Historic circuit routing, survey-correct scenery, exact constructor geometry and scan retopology remain unfinished. Modern Monaco and the photographed Eau Rouge/Raidillon complex remain intentionally shared by all eras per the user's choices.

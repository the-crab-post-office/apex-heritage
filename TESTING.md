# Validation — 0.10.0-preview.1

Branch: `feature/monaco-reference-visuals`, based on preserved tag `v0.9.1-preview.1`. This is an initial scenery/graphics/cleanup stage. **Zero of 47 constructor-specific scans are integrated.** Scan acquisition and retopology are not complete; see `data/CAR-SCAN-STATUS.md`.

## Scope

- Modern Monaco buildings and barrier positions for **all eras**, explicitly requested by the user. Historical-road substitution notices remain.
- Three recovered OSM landmarks (Casino, Hôtel de Paris, Fairmont), represented by 13 simple footprint parts preserving courtyards and protected road/pit corridors. The database has 490 Monaco building parts, not 490 newly surveyed structures.
- Photo-estimated heights/architectural rhythm, modular balcony/cornice details and simplified Casino towers. Landmarks use common road-level roof anchors above embedded foundations; taking only the lowest downhill footprint height had buried the Casino below the hillside.
- 1,208 additional photo-estimated temporary barrier pieces, for 1,326 total Monaco pieces. Approximate offsets (roughly ±1 m), not a calibrated photographic survey. Gaps remain wherever protected routes/buildings/existing barriers override estimates.
- Corrected multi-material mesh batching restores actual wall/roof draw ranges across all ten circuits; raw data counts alone did not prove visibility. New mesh tests check triangle preservation and ray hits. Browser checks independently raycast recovered building walls and still audit road triangles.
- Web filtered sky reflections, matching sky/sun direction, paint clear coat and rough rubber. Native receives the same recovered footprint/roof-height/barrier data but retains simpler shading and no web-only balcony/cornice batches.
- Avoided an unused extra livery allocation for each 1967/2023 car creation. Repeated 47-constructor showroom switching retains GPU-resource bounds.

## Validation record

Final release validation:

| Check | Result |
|---|---|
| Rust native-feature suite | **70 passed** (63 library + 7 native) |
| Node, including source metadata and material-group batching | **98 passed** |
| Python offline regeneration/courtyard/corridor checks | **15 passed** |
| Production grounding, architecture, showroom and venue suite before last roof/lighting refinement | **10 passed** (5.8 minutes) |
| Final production roof/architecture/low-high quality rerun | **2 passed** (1.3 minutes) after the last refinement |
| Final local-material/tunnel/no-external-request browser check | **1 passed** (24 seconds) |
| 47 showroom constructor selections, repeated | Included in the 10 passing tests; original geometry / scan-pending status is explicit |
| Final WASM/static/native release builds | **Passed**; existing Vite large-chunk warning remains |
| Final native Monaco/2023 driving smoke | **118.9 km/h**, passed serially after browser checks |

The final focused cases rerun two of the earlier ten browser cases and add one materials/tunnel case; this is **not thirteen distinct browser tests** or a full-suite run. Screenshots from the final actual 3D renderer were inspected for Casino, Hôtel de Paris and Fairmont areas. Grounding checks recorded no missing supports or floating sampled bottoms after adding the Monaco barriers.

The initial architecture screenshots revealed missing building bodies despite nonzero footprint/detail counts. This led to the multi-material batching fix and independent raycast regression, rather than treating those screenshots as completed work. A subsequent image review found low-elevation landmark roofs hidden behind terrain; roof anchors and camera targets were refined. The final focused production rerun validates those changes.

The prior barrier-grounding suite samples exact rendered post bottoms and concrete lower corners/edge midpoints against rendered ground, preserving the 0.9.1 fix. Independent geometric tests still exclude complete race/pit corridors for buildings, grandstands and barrier capsules. No collision-clearance check was weakened to accommodate the photo estimates.

## Cleanup / provenance

128 former loose validation logs and assistant work scripts were consolidated into a verified archive under `artifacts/archive/`. Original reference uploads, all source, asset notices and earlier release archives are retained. A dry-run-first cleanup script removes only ignored test/import/Python caches and, optionally, Rust debug build output; it refuses tracked content. Final cleanup removed **3,007,214,641 bytes** of generated caches (~2.80 GiB), plus a 6,174,823-byte image-search preview cache. Exact cleanup output is retained in the validation artifacts.

An earlier broad version replacement had accidentally changed the optional fsevents dependency's Node engine constraint. It is restored to the package registry's `^8.16.0 || ^10.6.0 || >=11.0.0`; version updates now target only owned manifest fields.

No third-party car scan/model was imported. Candidate uploader licenses and capture-method descriptions are recorded separately from verified full-scale scans. No paid purchase, authentication bypass or commercial-game mesh extraction was performed. Original reference photographs and image-search previews are not redistributed.

## Reproduce

```sh
. "$HOME/.cargo/env"
python3 scripts/monaco_reference.py
python3 scripts/build-corner-details.py
cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
./scripts/build-web.sh
python3 -m http.server 8080 --bind 0.0.0.0 --directory site
# Separate terminal; software-rendered browser/native checks run serially:
APEX_URL=http://127.0.0.1:8080 npx playwright test tests/monaco-visuals.spec.js tests/barrier-grounding.spec.js tests/venue.spec.js tests/showroom.spec.js
cargo build --release --features native --bin apex-native
APEX_SMOKE=1 APEX_SMOKE_TRACK=1 APEX_SMOKE_ERA=3 xvfb-run -a target/release/apex-native
python3 scripts/clean-workspace.py --apply --debug-cache
```

## Remaining limits

This is not a surveyed architectural digital twin, exact race-date barrier plan, historical Monaco reconstruction or completed scan-based car collection. Detailed landmark ornament, building interiors, constructor-specific chassis geometry, source camera calibration, subjective handling approval and physical controller hardware remain unverified. The full unrelated browser suite was not rerun for this stage. Prior release results remain available in their preserved source ZIPs/tags; they are not claimed as new passes here.

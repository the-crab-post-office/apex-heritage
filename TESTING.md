# Validation — 0.9.1-preview.1

Branch: `fix/grounded-barriers`; based on preserved tag `v0.9.0-preview.1`.

## Grounding patch

- Web barriers query a spatial index of the **actual rendered terrain, road, pit and corner/shoulder triangles**, rather than taking the maximum of analytic terrain and a nearby road sample.
- Native uses its actual terrain, pit and corner triangles. Both renderers subdivide long spans to at most 1.5 m and adapt around terrain creases; sloped members use their full three-dimensional length.
- Concrete bases have ground-conforming lower corners with a 6 cm minimum embed; foundations extend further below ground at sampled apron/grass steps. Fence and guardrail posts embed 10 cm. The prior fence post began a metre above its nominal base; it now reaches the ground. Posts retain original mapped segment spacing, independent of adaptive rail subdivision.
- Horizontal mapped barrier/collision footprints, road/pit clearance, car shapes and the explicitly all-era photo-guided Spa profile are unchanged.

### Patch validation

- Rust: **69 passed** (62 library + 7 native tests), including synthetic sloped and stepped concrete foundations, actual-triangle/top-layer sampling, adaptive spans and bounded finite venue meshes for all ten circuits.
- Node: **93 passed**, including three new ground-support/interpolation/span tests.
- Release WASM/static and native Linux builds: passed. The existing large Vite-chunk warning remains.
- Native Spa/2023 driving smoke: **119.3 km/h**, no mesh-capacity warnings.
- Production browser grounding and route-clearance checks: **5 passed (2.9 minutes)**. Across the three grounding cases, **5,305 independent raycast samples** found zero missing ground hits and zero floating sampled foundations/post bottoms (maximum signed gap −5.2 cm; posts approximately 10 cm embedded). The grounding audit independently raycasts rendered post bottoms and concrete lower corners/edge midpoints against the rendered ground, not just against cached placement heights. Cases cover Spa 2023 low, Spa 1967 high and Monaco 2023 low.

An initial development check exposed too few sampled posts at Monaco (449 total footings, only seven with the original stride); the final check samples more densely. During the version bump, stale HTML/CSS identity constants correctly triggered the build-coherence guard. All displayed/runtime identities were then updated together before final production validation. A stronger edge-midpoint audit then exposed additional apron/grass steps, fixed by extending foundations below those transitions. These intermediate failures are not counted as passes. One native smoke attempt was killed while competing with software-rendered browser tests for the 2 GB sandbox; the final serial native smoke passed.

Reproduce this patch's focused browser checks after `./scripts/build-web.sh`:

```sh
APEX_URL=http://127.0.0.1:8080 npx playwright test tests/barrier-grounding.spec.js tests/venue.spec.js
```

The complete older full browser suite and Python regeneration suite were **not rerun for this rendering-only patch**. Their preceding-release results and caveats are retained below, not represented as new patch results.

---

## Preceding release validation — 0.9.0-preview.1

Branch: `feature/photo-cars-eau-rouge`. The previous 0.8 release and stable main are preserved. This update responds to the supplied 2023 car, 1967 car and Eau Rouge/Raidillon photographs. User-confirmed scene choice: **modern photo-guided Eau Rouge for every era**.

## Results

| Check | Result |
|---|---|
| Rust with native feature | **65 passed**: 62 library + 3 native-mesh regressions |
| Node | **90 passed** |
| Python geometry/offline regeneration | **13 passed** |
| Initial full production browser suite | **32 passed / 1 stale assertion failed** (14.6 minutes) |
| Final production car/scene/showroom/venue suite | **7 passed** after updating stand-count validation and the last visual refinements |
| Rust release WASM/bindings/static build | Passed; large Vite-chunk warning remains |
| Native Linux release build | Passed |
| Xvfb native driving smoke, Spa/2023 | **119.3 km/h**, no mesh-capacity warnings |
| Xvfb native driving smoke, Spa/1967 | **75.7 km/h**, no mesh-capacity warnings |
| Native menu reference review | Both 1967 and 2023 menu captures inspected |
| Shared chassis offline regeneration | Byte-for-byte deterministic |

The initial browser failure expected eight Spa grandstand objects. The revised renderer correctly uses 69 terrain-following modules from the same eight mapped footprints. The assertion now checks agreement with the shared Rust module count **and eight unique mapped footprint IDs**, retaining the road/pit exclusion checks. This was a stale test assumption, not a claim of 69 newly mapped grandstands. The final focused suite passes on the packaged build.

## New checks

- **Car silhouettes:** bounded, finite, indexed shared chassis and wheel meshes. The 1967 profile includes the oval radiator cavity/surround, open monocoque, exposed engine/header parts and roll hoop; it has no modern wings, halo or sidepods. The 2023 profile includes curved mainplanes/DRS flap, undercut pods, intake openings, halo/centre pillar and venturi-floor parts.
- **Wheel agreement:** shared generated layout data controls visible wheel anchors and Rust contact. Modern wheelbase is 3.40 m, wheel-centre half-track 0.90 m; classic front/rear tyre widths are 0.22/0.34 m. These are authored approximate proportions, not surveyed engineering dimensions. Contact-patch/track-limit assertions retain their geometric checks with the updated dimensions.
- **Eau Rouge profile:** 40.0 m compression-to-crest rise, peak sampled climb approximately 17.4%; geographic anchor rotation invariance; exact offline regeneration. Rust samples and steps the car on the climb in all four eras with all four tyre patches legal and matching road support. This is section contact coverage, not four autonomously driven complete laps.
- **Local all-era scene:** compression/uphill/crest/exit kerbs and red/green paved apron are identical across the four selections. The covered hillside stand is terrain-following; local outer fencing is retained even for the 1967 car, as part of the explicitly requested modern scene. All-ten road/pit/stand/barrier exclusion tests remain.
- **Browser screenshots:** actual showroom canvas captures for both new profiles and an elevated actual 3D Eau Rouge/Raidillon view. No AI-generated render or photographic background is substituted for the game. Driver-eye and elevated scene views were inspected during refinement.
- **Native:** the same car triangles are rendered, with simpler lighting and baked vertex shading. The draw-call index budget accommodates the largest shared aero batch. Native smoke/menu checks do not establish full-lap scenery accuracy or physical controller behaviour.

## Retained regression scope

Rust/Node/Python coverage retains spin/countersteer/assists/wet behaviour, recording/pitch DSP, recovery, swept barriers, playable pit service across 40 circuit/era combinations, all-four-off track limits, physical kerb/floor support, road/pit mesh clipping and deterministic map/corner generation. Browser coverage includes all ten modern road-surface audits, Monaco tunnel/facades, controls/disconnect, session persistence, wet AI/rain, recording fallbacks, build-coherence rejection, all 47 atlas selections twice, GPU-resource bounds, failed-texture fallback, reduced motion and mobile layout.

## Scope and remaining limits

These are photo-guided original procedural approximations, **not scans, surveys or photographic equivalence**. Car chassis remain shared within each era rather than unique engineering replicas for every constructor. Tyres, suspension, aero and mechanical dimensions are approximate. The road correction intentionally uses the pictured modern Eau Rouge complex for all eras; it does not finish historic Spa or the other historical road/scenery layouts. Their existing substitution notices remain visible. Stand/forest/paint extents and detailed intermediate road heights are not surveyed. Native vegetation, lighting and scenery remain simpler than web. DRS is a visible assembly, not a new operable DRS system.

Physical controller hardware, subjective handling/listening approval, exact sponsor typography/placement, geographic accuracy elsewhere and legal permission to distribute marks remain unverified. See `data/PHOTO-REFERENCE-NOTICE.md` and the existing source/asset notices. Reference photographs are not redistributed.

## Reproduce

```sh
. "$HOME/.cargo/env"
python3 scripts/build-car-shapes.py
python3 scripts/build-liveries.py
cargo fmt
python3 scripts/build-elevation.py
python3 scripts/build-pits.py
python3 scripts/build-corner-details.py
cargo test --features native
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
./scripts/build-web.sh
python3 -m http.server 8080 --directory site
# Separate terminal; keep browser runs serial on a 2 GB sandbox:
APEX_URL=http://127.0.0.1:8080 npx playwright test

cargo build --release --features native --bin apex-native
APEX_SMOKE=1 APEX_SMOKE_TRACK=0 APEX_SMOKE_ERA=3 xvfb-run -a target/release/apex-native
APEX_SMOKE=1 APEX_SMOKE_TRACK=0 APEX_SMOKE_ERA=0 xvfb-run -a target/release/apex-native
```

Use the complete coherent **0.9.1-preview.1** static build rather than individual files copied over an old release. Logs, screenshots, reference images, caches and test reports are ignored workspace artifacts and are not packaged. Licenses, editable authoring data and prior releases are retained.

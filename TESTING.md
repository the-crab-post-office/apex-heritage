# Validation record — 0.6.0

Validated in this workspace on **8 November 2026**.

## 0.6 safety furniture / rear grip

- **Rust native-feature: 49 passed** (47 library + 2 native renderer regressions). New handling coverage checks ordinary cornering/straight acceleration, brief versus sustained compound mistakes, assists, countersteer/lift recovery, wet grip and consistent breakaway across 20–240 Hz public-API rates. A fixed-position/fixed-speed on-road rig verifies that the actual simulation transmits the new slides in all four eras, independently of walls/runoff; this is a controlled handling test, not a human lap. Recover/reset restore velocity heading and rear grip.
- New actual-simulation impact tests run at **100 m/s and the maximum 50 ms API step on all ten circuits**; the car is deflected/slowed and the lap invalidated instead of crossing the barrier. Separate swept tests cover a thin wall and stationary overlap resolution. Every pit-route point remains free of barrier collision. Native safety meshes for every circuit are finite and stay within the **3,996-vertex batch cap**. Existing terrain/pit mesh and 40 era/circuit pit-service flows still pass.
- **Node: 81 passed. Python: 9 passed.** Four new Python checks independently recompute exact whole-capsule, road, open-pit, building and full stand/roof-footprint exclusions; verify six stands/18 tyre sections per circuit and stand orientation; and regenerate the venue database byte-for-byte offline. Placement checks certify conservative planar exclusions, not real-world facility locations.
- **Production browser: 26 passed in 8.4 minutes**, including the previous controller/audio/pit/car/tunnel regressions, all **6,395 drawn-road probes with zero missing roads, pit overlays or terrain/shoulder intrusions**, and new Spa/Monaco venue checks. The latter compare Rust/renderer barrier counts, inspect finite instance transforms, full road/pit clearance, six stands, 1,836 individual seats and spectator/tyre instances per scene. They also capture actual stand/fence/tyre views. Test captures freeze the camera/animation rather than allowing the chase camera to overwrite an inspection view.
- **Final production feature/venue rerun: 5 passed in 1.6 minutes** after the final tyre colour/stack-spacing and recover-state adjustments. Spa/Monaco grandstands and the final Spa tyre-barrier close-up were visually inspected. All runtime assets remain local.
- **Native Linux release build + Xvfb render/physics smoke:** Spa/V10 **119.6 km/h**, Monaco/1967 **75.2 km/h**; final rebuilt Spa binary passed again at **119.6 km/h**. These are automated start/render/physics checks, not a native full-lap or tunnel walkthrough. Physical controller hardware, subjective force/handling feel and listening approval remain unverified.

Reproduce: `cargo test --features native`, `npm test`, `python3 -m unittest discover -s tests -p 'test_*.py'`; build with `scripts/build-web.sh`, serve `site/`, then `APEX_URL=http://127.0.0.1:8080 npx playwright test`. Geometry regeneration/tests require Python Shapely. The checked-in venue is original approximate furniture, not surveyed/scanned facilities; collision is a car-centre capsule approximation without damage, and grandstands are scenery. Native rendering is deliberately lower-detail than browser PBR.

## Historical 0.5 corrected visuals / mapped pits

- **Rust native-feature: 37 passed** (36 library + one real native terrain/pit-mesh regression). The service-flow test now covers **all 10 circuits × all 4 eras**, not just one circuit. Entry, stopping, service timing, era fuel rules and exit complete on every mapped route. Native actual mesh coverage now includes the **clipped pit asphalt** as well as terrain, and rejects batches over the renderer's vertex limit. The initial unbatched clipped-pit implementation exceeded that limit; this regression caught it and the renderer now splits safe batches.
- **Node: 81 passed**: previous 65 plus **11 mapped-pit** and **5 real-material** checks. Pit tests verify selected real way IDs/layout variants, endpoint registration, monotonic race progress, finite geometry and a maximum 11 m departure from the source geography (the documented Monaco strip is the main estimated case). Material tests parse real JPEG headers/dimensions for every supplied colour/normal/roughness map; 1K sources may be rectangular, and Gravel001 has no source roughness map. No synthetic 1K resolution claim is made for satellite data.
- **Python: 5 passed**. `scripts/build-pits.py` also regenerates the new derived pit database offline from the retained geographic source snapshot without network access.
- **Native Linux release + Xvfb smoke:** passed at **119.6 km/h** for Spa/V10; a further Monaco/1967 start/render/physics smoke passed at **75.2 km/h**. The latter is not a native tunnel walkthrough. Native now uses tiled ground/building materials, profiled cars, cylindrical tyres/spokes and a basic tunnel enclosure. It does not match browser PBR/lighting fidelity.
- **Browser production validation: 24 passed in 6.8 minutes**, including all **6,395 drawn-surface probes with zero pit-overlay hits, terrain/shoulder intrusions or missing roads**. After visual inspection caught a missing UV attribute on the new body profiles, the profiles were made compatible with material batching and regression assertions now require an actual painted body batch on all four eras. The three feature scenarios passed again after that fix. Final tunnel finish removes generic red/white race kerbs under the roof and shades its asphalt; its final feature rerun is recorded below. New-feature assertions check a 1024 px grass map (not a stretched satellite image), six facade families, two tunnel-wall sides, 72 fixtures, all four car variants and zero external runtime requests. Actual road audits now include **pit asphalt and paint**, counting any projected pit overlay hit even if the pit surface is lower than the race road. This closes the former test blind spot exposed by the user's screenshots. Pit auditing accepts the existing road at intentionally shared entrance/exit portions instead of requiring a duplicated raised pit mesh there.

**Final production feature rerun: 3 passed in 57.3 seconds** after the painted-body and tunnel-finish corrections. Final Monaco tunnel screenshots were inspected: painted bodywork is visible, no red/white kerbs remain under the roof, walls/guardrail bands/fixtures are present, and no browser page errors were reported.

Scenery/box widths and building identities are not survey-certified by these tests. The supplied Monaco photo informs the authored enclosure/material/lighting layout, not exact architectural dimensions. Physical controller hardware and a subjective speaker/headphone listening review remain unverified.

## Historical 0.4 validation (superseded by 0.5 above)


- **Rust:** 30 core tests; 36 native-feature library tests (including those 30), plus one actual native terrain-mesh regression = **37 total native-feature tests passed**. Native now decodes every actual shipped JPEG in a regression; an initial unsupported-JPEG smoke failure was caught and fixed by enabling the image decoder. Native Linux release build and 120-frame Xvfb physics/render smoke passed at **119.6 km/h**. No hardware controller/audio-device certification is claimed.
- **Node:** **65 tests passed**: audio 16, imagery/projection 11, controller 3, build-coherence 7, polygon geometry 3, geographic elevation 13, scenery 12. Python offline geographic regeneration: **5 passed**.
- **Browser new-feature suite:** **3 development tests passed**, covering simulated controller-driven menu/start/analog acceleration/brake/steering, one-shot camera/pit/limiter/pause actions and disconnect pause; a real WASM pit-practice drive into the lane, marked-box stop, timed service and exit; and local photographic terrain loading with pit-surface clearance. These three also passed in the full production suite; production additionally checks Back → setup, actual Monaco canopy presence and no external runtime asset requests.
- Audio tests now check stable periodic firing pitch in the actual shipped recording-derived PCM at two RPM values for each sampled era. They also retain nonzero recording influence, RPM response, six-voice headroom, late-arriving bank and procedural fallback coverage. Tests establish DSP behaviour, not a subjective listening approval or exact historic-engine match.
- Pit tests exercise all ten generated lane endpoints/box ranges, all four eras' service flow, no service for a missed box, no recover shortcut out of a stop, zero-dt service timing and era-specific fuel replenishment. Browser drives the public practice approach with steering, then throttle/brake control in the assisted lane; it is accelerated virtual-time regression, not a human full-lap test. Rendered pit meshes are raycast against actual terrain/shoulders.
- Imagery tests verify real JPEG headers/native decoding, all ten source IDs/COG URLs/10 m native-resolution declarations, coverage of the complete geographic circuit, north-up UV orientation and vegetation masks. These do not establish facade, individual-tree or laser-scan fidelity.

**Full production browser suite: 24 passed in 6.6 minutes**, served as plain static HTTP from the production `site/` directory. All ten circuits' **6,395 actual drawn-surface probes** still reported zero missing roads, terrain/overlay intrusions or centre errors. After a small controller-exit lifetime guard, **all three feature scenarios passed again in 1.0 minute** against the rebuilt production assets, including simultaneous Back + pit request with zero browser page errors.

Reproduce: `npm run build`, serve `site/` over HTTP, then `APEX_URL=http://127.0.0.1:8080 npx playwright test`. Feature-only: append `tests/features.spec.js`. Logs/screenshots are disposable local `artifacts/`, deliberately not packaged.

## Retained 0.3.2 terrain/road regression background

The 0.3.1 geographic-data correction did not fix the whole visible problem. Sampling scalar heights does not test raster-grid triangle interiors or independently triangulated full-width ribbons. An actual Three.js-mesh audit reproduced **six terrain intrusions and two shoulder/apron intrusions in Monaco**, with a maximum of **2.826 m**, and smaller centerline-to-rendered-road errors in Spa, Monaco, Suzuka and Imola. The road meshes now share centerline vertices; terrain and shoulder polygons are geometrically subtracted from the complete projected road footprint.

The exact supplied Spa screenshot was not reproduced in the fresh source preview: its 35 m/+0.0% text matched the previous HTML defaults, whereas a fresh browser showed 53 m/+0.5% with the expected styles. Mixed/stale assets were a plausible additional issue, **not a proven explanation**. Version checks and a fresh preview origin make this distinguishable rather than relying on an instruction to clear the cache.

## Historical 0.3.2 results (superseded by 0.4 above)

| Check | Result |
|---|---|
| Rust core library tests | **24 passed** |
| Rust native-feature library tests | **28 passed** (includes the same 24) |
| Actual native terrain mesh regression, all ten tracks | **1 passed**; native total **29** |
| Python geographic/offline-regeneration tests | **5 passed** |
| Node elevation / scenery / audio | **13 / 12 / 13 passed** |
| Node build-coherence / polygon geometry | **7 / 3 passed**; Node total **48** |
| Browser development coverage (two batches) | **21 passed** |
| Full browser production suite, plain static HTTP | **21 passed** |
| Rust → WASM release / bindings | Passed |
| Linux x86-64 native release build | Passed |
| Native Xvfb rendering/physics smoke | 120 frames, acceleration assertion, **119.6 km/h** |

## Actual-mesh rendering coverage

Browser raycasts interrogate the **drawn Three.js meshes**, not `height()` functions. At five lateral positions on every eighth segment, **6,395 locations across all ten circuits** had zero missing road hits, terrain intrusions, shoulder/apron intrusions or centerline errors over the 1.5 cm tolerance. Terrain/overlay checks do not discard objects merely because they are more than 4 m above the road. Maximum measured centerline error was **0.00000361 m**, dominated by Float32 vertex storage. This is sampled regression coverage, not a mathematical test of every possible viewing position.

| Circuit | Probe locations | Intrusions / missing road / center errors |
|---|---:|---|
| Spa, wet | 875 | 0 / 0 / 0 |
| Monaco | 415 | 0 / 0 / 0 |
| Monza | 725 | 0 / 0 / 0 |
| Silverstone | 735 | 0 / 0 / 0 |
| Suzuka | 730 | 0 / 0 / 0 |
| Interlagos | 540 | 0 / 0 / 0 |
| Imola | 615 | 0 / 0 / 0 |
| Nürburgring GP | 645 | 0 / 0 / 0 |
| Montréal | 545 | 0 / 0 / 0 |
| Hockenheim | 570 | 0 / 0 / 0 |

The native regression builds the **actual Macroquad terrain mesh** for every circuit, spatially indexes its final Float32 triangles and checks their interpolated interiors against the same road probe positions. It also verifies batches stay under the renderer's index/vertex limits. Rust and JS polygon tests verify area subtraction and interpolated y, including high triangles whose vertices alone do not establish road clearance. JS also tests upward winding on both shoulder sides.

Camera walkthroughs render changing positions at geographic Spa Eau Rouge/Les Combes and Monaco hairpin/tunnel-road landmarks. Their saved images were inspected. These are injected camera/vehicle poses, **not autonomous physics laps**; actual keyboard-driven physics is tested separately. The 0.5 clients now include an approximate tunnel enclosure; native is simpler and has no browser-style dynamic lighting. A complete surveyed architectural tunnel is not claimed.

Startup tests require compatible HTML, CSS, JS, WASM and server versions plus matching track-data hashes. Unit tests inject a stale/missing value for each component. A browser test deliberately serves an outdated `version.json` and confirms an explicit visible build-mismatch error with no race constructed. The visible versioned HUD and immediate non-placeholder telemetry are checked in the wet Spa session.

## Geographic elevation coverage

- All ten circuits have bounded source windows from Copernicus GLO-30, retained with source URLs, local metre-space grid spacing/origins and absolute source elevations. Offline regeneration reproduces the checked-in output.
- Rotating point zero on **every circuit** and rebuilding leaves heights at the same world coordinates unchanged within 2 mm numeric tolerance. There are no fractional-lap authoring keys or profile offsets left.
- Fixed geographic positions in Spa check that the Les Combes area is higher than Eau Rouge and Stavelot. Monaco checks that Casino is substantially higher than Boulevard Albert Ier, and that the main tunnel road stays below the surface model.
- Tunnel geometry comes from mapped Boulevard Louis II, OSM way 4230891. Deep inside the corrected tunnel, the road remains near an explicitly authored 6 m above-sea-level height, rather than following the hotel/cliff above it. Portal transitions have bounded gradients.
- Suzuka's upper/lower legs are identified at the geographic crossover; ground heights agree while the upper road retains more than 7.5 m separation, using an authored 8 m clearance.
- JavaScript and Rust both test bilinear 2D grid sampling and agreement between every circuit's road bed and road-point base heights. Far-field terrain must sample the geographic grid instead of extruding a nearby road section's height.
- Native/core tests verify that off-road vehicles follow the rendered geographic ground instead of hovering at the nearest road height. The terrain mesh's deliberate vertical clearance and shoulder blend are included in that calculation.
- Existing grade, reverse-heading, uphill/downhill gravity, loop continuity, finite height and bounded-gradient tests remain active.

## Scenery, audio and gameplay regressions

All **2,878 exported building polygons** clear the entire closed road corridor in independent Rust and JavaScript checks. Synthetic cases cover long segments, the closing segment, canopy overhang, crossing polygon edges and enclosing polygons. Native concave roofs retain their mapped footprint.

Real shipped PCM is decoded and rendered, not mocked. Sampled-era tests compare real-PCM output against zeroed-PCM output, check fractional playback/RPM response and headroom, and apply late-arriving banks to player/AI voices. The actual browser AudioWorklet acknowledges its recording bank. Blocked PCM requests must retain working synthesized audio, and the modern unsampled era is explicitly labeled as procedural. Earlier synthesis, shift, stereo, throttle and muting tests remain active.

Browser tests cover circuit/era/team selection and persistence; actual WASM driving, braking, steering and recovery; matching car/render height; pause/camera/exit; nonzero AudioWorklet output; wet Suzuka AI/bridge/voices; mobile layout; elevation chart and volume; Monaco's mapped start and complete generated-scenery exclusion; modern fallback; and deliberately missing recording assets.

## Accuracy and validation limits

GLO-30 is an approximately **30 m digital surface model**, including vegetation and buildings. Filtering cannot completely remove canopy/building error. It is not bare-earth lidar, laser-scanned road height, camber or kerb geometry. The Monaco tunnel's 6 m road level and Suzuka's 8 m clearance are authored exceptions at mapped/geometric locations, not surveyed measurements. The tests establish geographic anchoring and implementation consistency, not survey certification. Full provenance and rights: `data/ELEVATION-NOTICE.md`.

Headless Chromium/software WebGL and Linux Xvfb were used. No physical audio-driver/speaker, mobile/gamepad hardware, other browser engine or Windows/macOS native certification is claimed. Lap tests inject centerline positions, not autonomous full-physics laps. Native remains a simpler free-drive client without browser AI/weather/records features; headless native smoke disables device initialization and tests audio DSP separately.

The driving model remains grounded 2.5D, not a suspension/jump simulator. Vite's bundled game/database chunks exceed its 500 kB advisory threshold; builds succeed. Static output is about **9 MB uncompressed**, including editable source/derived databases and licence downloads. This is not a frame-rate benchmark.

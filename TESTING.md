# Validation record — 0.3.1

Validated in this workspace on **8 November 2026**.

## Root cause and former test gap

The old elevation keyframes were hand-authored against lap fractions. Matching arrays and smooth loop seams did **not** prove that hills occurred at the correct geographic locations. The old profiles were removed, rather than merely rotated. New regressions test world-coordinate landmarks and start-index invariance against coordinate-sampled GLO-30 source grids.

## Results

| Check | Result |
|---|---|
| `cargo test --lib` | **22 passed** |
| `cargo test --features native --lib` | **26 passed** (includes the same 22) |
| Python geographic/offline-regeneration tests | **5 passed** |
| `npm run test:elevation` | **13 passed** |
| `npm run test:scenery` | **12 passed** |
| `npm run test:audio` | **13 passed** |
| Browser development suite | **8 passed** |
| Browser production suite on plain static HTTP server | **8 passed** |
| Rust → WASM release / bindings | Passed |
| Linux x86-64 native release build | Passed |
| Native Xvfb rendering/physics smoke | 120 frames, acceleration assertion, **119.6 km/h** |
| Elevation data and licence downloads | HTTP 200 in development and static production |

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

The driving model remains grounded 2.5D, not a suspension/jump simulator. Vite's bundled game/database chunks exceed its 500 kB advisory threshold; builds succeed. Static output is about **5.33 MB uncompressed**, including editable source/derived databases and licence downloads. This is not a frame-rate benchmark.

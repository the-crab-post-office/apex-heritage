# Validation record — 0.3

Validated in this workspace on **8 November 2026**.

| Check | Result |
|---|---|
| `cargo test --lib` | **20 passed** |
| `cargo test --features native --lib` | **24 passed** (includes the same 20) |
| `npm run test:audio` | **13 passed** |
| `npm run test:scenery` | **12 passed** |
| Browser development tests | **8 passed** in one run |
| Browser production tests, plain HTTP static server | **8 passed** in one run |
| Rust → WASM release / bindings | Passed |
| Linux x86-64 native release build | Passed |
| Native Xvfb smoke | 120 rendered frames, acceleration assertion, **119.4 km/h** |
| Editable databases and notices | HTTP 200 in both dev and static production |
| Elevation regeneration | Byte-identical before/after `build-elevation.py`, including rotated tracks |

## New map and start coverage

- All **2,878 exported building polygons** on all ten circuits clear the entire closed road corridor in independent Rust and JavaScript geometry checks. The importer excludes the road plus 3.5 m; runtime checks retain 3 m.
- Synthetic cases cover objects halfway between widely spaced vertices, closing-segment clearance, canopy overhang, polygon edges crossing the road, a large polygon enclosing the road, and a safe interior footprint. Grid acceleration is used only in the browser; native tests check all segments directly.
- A concave L-shaped roof triangulates to four triangles with the correct total area. Native renders the actual mapped polygons, not covering boxes.
- Monaco's source index is rotated to the mapped start node, with northwest heading toward Sainte Dévote and low Albert Ier elevation. The browser verifies actual Rust WASM spawn and height against the same point zero and checks every generated tree canopy and rendered building footprint for road clearance.
- Five corrected markers have less than 2 m snap distance to uniformly sampled points. Both copies of building and track data must be byte-identical. Five other starts are explicitly marked unverified, not silently certified.
- Elevation profiles and their relative ground/bridge alignment remain covered by the previous tests, including Suzuka's crossover and signed grade gravity.

## New recording coverage

- Real shipped PCM loops are decoded and rendered, not mocked. The three sampled era tests compare real-PCM rendering with zeroed-PCM rendering and require an audible-level numeric difference, finite output, headroom with six voices and RPM-dependent fractional playback.
- Samples arriving after telemetry must attach to existing player/AI voices. Switching to the modern unsampled era removes the recorded layer.
- Native tests verify sample count, nonzero RMS, boundary continuity, finite/bounded playback, RPM response and the explicit modern fallback.
- Browser tests require an acknowledgment from the actual AudioWorklet after it receives the recording bank. They verify the recorded car metadata and absence of asset-load errors. Deliberately blocking `.pcm` requests must leave working procedural audio rather than preventing the race.
- Prior signal tests still cover synthesized fallback timbres, throttle response, firing frequency, spatial panning, shift/lift transients, six-voice mixing and smooth muting. Actual worklet output is inspected through an AnalyserNode.

These are engineering signal/asset checks, **not acoustic certification**. The recordings are trackside pullaways with ambient sound and changing RPM, not isolated measured in-car banks. No exact car match, measured playback RPM anchor or verified modern recording is claimed.

## Eight browser tests

1. Ten circuits, filters, four eras/four teams, comparison, weather/assists, persistence, garage and records.
2. Actual WASM acceleration/braking/steering, recovery, camera, pause/resume/exit, matching render height and nonzero worklet output.
3. Wet Suzuka race: five AI, rain, separated bridge, six audio voices.
4. Mobile menu at 390×844 with no horizontal overflow.
5. Elevation chart and persisted master-volume slider.
6. Monaco marker/spawn/height, real recording acknowledgment, complete generated scenery exclusion.
7. Explicit modern V6 procedural fallback.
8. Missing recording assets preserve synthesized audio and playable race startup.

## Limits

- Headless Chromium/software WebGL and Linux Xvfb only; no physical speakers, host audio-driver certification, gamepad/mobile hardware, other browser engines or Windows/macOS binary certification.
- Full-lap logic tests inject centerline positions, not an autonomous physics-driven lap. The driving model is grounded 2.5D with authored elevations, not measured terrain or wheel suspension.
- Native remains a simpler free-drive client without browser AI/weather/records features. Audio device initialization is intentionally disabled in headless native smoke; DSP is tested separately.
- Vite's lazy race/3D/database chunk exceeds its 500 kB advisory threshold. Build succeeds. Production output is approximately **3.52 MB uncompressed**, including editable ODbL database downloads; this is not a frame-rate benchmark.

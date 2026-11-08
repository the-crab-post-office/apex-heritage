# Validation record

Validated in this workspace on **8 November 2026**.

## Results

| Check | Result |
|---|---|
| `cargo test --lib` | **10 passed**, 0 failed |
| Rust → `wasm32-unknown-unknown` release build | **Passed** |
| `wasm-bindgen` web binding generation | **Passed** |
| `cargo check --features native --bin apex-native` | **Passed** |
| Linux x86-64 native release build | **Passed** |
| `APEX_SMOKE=1 xvfb-run -a ./target/release/apex-native` | **Passed**: 120 rendered frames, acceleration assertion; reported 125.5 km/h |
| `npm run build` | **Passed**; self-contained static `site/` output |
| Browser tests against Vite development server | **4 passed**, 0 failed |
| Same browser tests against separately served static production release | **4 passed**, 0 failed |

Browser suite: headless Chromium via Playwright with software WebGL enabled; desktop 800×600, mobile 390×844. Production validation used a plain Python HTTP server, so no Vite development transforms or API endpoints were required.

## Rust coverage

1. Exactly ten sensible, closed/resampled tracks.
2. Independently modified power for every team in every era.
3. Acceleration and braking.
4. Reset/recovery and current-lap invalidation.
5. Non-finite input rejection.
6. No laps counted while standing still.
7. A forward, complete ordered-checkpoint circuit traversal records a lap.
8. Reversing around the circuit does not record a lap.
9. Wet conditions reduce available braking grip.
10. Turbo boost builds over time rather than arriving instantly.

The complete-lap unit test injects successive centerline positions to test lap/checkpoint logic; it is **not an autonomous driver completing a lap with the full vehicle model**.

## Browser coverage

1. Ten selectable circuits; seven Europe/three rest-of-world filter counts; map/title update; four eras with four teams each; car comparison; wet/assist selection; setup persistence after reload; garage and empty records UI.
2. Actual Rust WASM session: throttle increases speed, steering changes yaw, braking slows the car, camera switches, recovery invalidates the lap, pause freezes simulated elapsed time, resume and exit work. No page exceptions in this test.
3. Wet 1988 quick race at Suzuka: five AI cars, rain geometry, three-lap mode and raised bridge rendering geometry.
4. Narrow-screen paddock: all ten circuit cards and no horizontal page overflow.

## What this does not prove

- No cross-browser certification, GPU benchmark or claimed frame-rate target.
- Physical gamepad hardware and real mobile touch play have not been manually certified.
- Windows/macOS native builds have not been compiled or run here.
- Native and browser renderers intentionally have different feature sets; only the Rust vehicle dynamics are shared.
- No validation of real tyre telemetry, actual car horsepower, historical rankings, track survey geometry or accurate elevations.
- No endurance, network/multiplayer, collision, pit-stop or tyre-strategy tests; those features are not implemented.
- Browser tests skip the visual countdown for the driving assertion to avoid measuring software-renderer startup speed.

## Build note

Vite reports an advisory that the lazily loaded 3D race JavaScript chunk is a little above 500 kB before gzip (approximately 136 kB gzip). The build succeeds. The 3D renderer is loaded only when a session starts. The full static release is approximately 1.3 MB uncompressed, including artwork, Rust WASM and all scripts.

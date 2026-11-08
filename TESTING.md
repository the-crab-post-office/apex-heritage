# Validation record — 0.2

Validated in this workspace on **8 November 2026**.

## Results

| Check | Result |
|---|---|
| `cargo test --lib` | **17 passed**, 0 failed |
| `cargo test --features native --lib` | **19 passed**, 0 failed (the same 17 plus two native audio tests) |
| Rust → `wasm32-unknown-unknown` release / bindings | **Passed** |
| Linux x86-64 native release build | **Passed**, including CPAL audio output |
| `APEX_SMOKE=1 xvfb-run -a ./target/release/apex-native` | **Passed**: 120 rendered frames and acceleration assertion; reported 119.4 km/h on the elevated circuit |
| `npm run test:audio` | **9 passed**, 0 failed |
| `npm run build` | **Passed**, static `site/` output includes the bundled AudioWorklet |
| Browser tests against Vite development server | **5 passed**, 0 failed |
| Same browser tests against independently served production build | **5 passed**, 0 failed |

Browser suite: headless Chromium / Playwright with software WebGL; desktop 800×600 and mobile 390×844. Production validation uses a plain Python HTTP server, without Vite transforms. The browser tests inspect a real running AudioWorklet through an AnalyserNode, not just mocked audio calls.

## Rust coverage

Existing tests cover the ten closed circuits, distinct team power, acceleration/braking, reset/recovery, invalid-input rejection, stationary lap prevention, ordered lap checkpoints, reverse-lap prevention, wet grip and turbo buildup.

New elevation/drivetrain tests cover:

- Native/WASM and browser height datasets are identical; every point has a finite profile sample, a continuous loop seam and bounded grade.
- Reversing heading reverses the signed road grade.
- Gravity changes coasting speed differently uphill and downhill on an isolated synthetic slope.
- Suzuka's upper branch is more than 7 m above its crossing branch, while underlying ground remains aligned.
- RPM remains continuous when crossing the old artificial 47 km/h boundary.
- Upshifting drops RPM and briefly cuts torque; idle remains stable.
- Native synthesis produces finite, audible, bounded output for all four eras; muting decays to silence.

The full-lap test injects successive centerline positions to test lap logic; it is **not an autonomous full-dynamics lap**. Native audio samples are tested numerically; physical speakers and the host audio driver are not certified by those tests. The native headless smoke deliberately disables device initialization.

## Browser coverage

1. Circuit selection/filtering, four eras with four teams, team comparison, weather/assists, persisted setup, garage and records UI.
2. Actual Rust WASM acceleration, steering, braking, camera switching, recovery, pause/resume/exit. Checks that the car's rendered height equals Rust telemetry, that the worklet is running and generates non-zero PCM, and that no page exception occurred.
3. Wet 1988 Suzuka race: five AI cars, rain, raised bridge, three-lap mode and six engine voices with valid stereo data.
4. Mobile paddock: all ten circuits and no horizontal overflow.
5. Elevation chart and persisted master-volume slider.

## Audio DSP coverage

The nine offline JavaScript tests render original synthesis into sample buffers and check:

- All four era voices produce finite, audible, bounded output.
- Throttle increases sound energy.
- V10 firing frequency tracks 6,000 versus 12,000 RPM at the expected 500/1,000 Hz fundamental.
- Stereo panning measurably separates left/right energy.
- Voice gain fades to silence.
- Six mixed engines, gear shifts and lift-off remain finite and within tested headroom.

These are signal-level checks, **not claims of acoustic fidelity to real recordings**.

## Limits and build notes

- Heights are authored approximations, not surveyed track elevations. The road-following model remains grounded and does not simulate airborne cars or wheel suspension.
- No cross-browser, physical gamepad, real mobile device, audio-hardware or Windows/macOS native certification.
- No claimed frame-rate target or GPU benchmark. Native and browser renderers intentionally have different feature sets.
- Browser driving assertions skip the visual countdown to avoid measuring software-renderer startup speed.
- Vite's lazy 3D chunk is slightly above its 500 kB advisory threshold (about 137 kB gzip); the build succeeds. Total static release is approximately **1.6 MB uncompressed**, including Rust WASM, artwork and the engine processor.

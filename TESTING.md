# Validation — 0.11.1-preview.1

Branch: `feature/adjustable-camera-controls`, based on preserved `v0.11.0-preview.1`. User chose expanded camera controls: adjustable distance/FOV, free-look and saved preferences. Eight existing rigs and all car/track assets are retained. **Verified constructor scans remain 0/47.** Earlier release results remain in their preserved source ZIPs/tags and are not counted as new passes here.

## Implemented scope

- Browser settings gear beside the camera selector. Per-camera vertical FOV 45–100° and exterior distance 0.60–1.80×. Onboard distance is disabled; physical mounts do not move when distance preferences are supplied.
- Right-drag pointer-capture free-look, with release/cancel/blur cleanup, and labeled touch/keyboard-operable look buttons. Center clears transient look; resetting a rig clears its tuning and look, without affecting other rigs. Alt + wheel adjusts exterior distance.
- Selected view and independent per-rig settings use stable IDs in versioned local storage. Temporary look angles never persist. Malformed/future data and denied/quota-limited storage are handled; failed writes display a session-only message instead of breaking racing.
- Panel Escape closes the panel and returns focus. Escape can then pause even while the gear button has focus. Native inputs: right-drag, FOV brackets, wheel/PgUp/PgDn distance, Backspace center, Home reset. Native user-config JSON saves selected rig and tuning; smoke mode ignores all preference files and never writes them.
- Explicit cleanup on race disposal prevents duplicate slider/pointer handlers after re-entry. Mobile settings remain within the viewport; panel footer styling is isolated from the main site footer. Mobile timing/build/control placement avoids collisions with the new menu.
- FOV overrides suppress Chase's speed-dependent FOV expansion; reset restores the default automatic behavior. Shared JS/Rust tuning bounds keep exterior adjustment separate from attached camera mounts.

## Validation record

| Check | Result |
|---|---|
| Rust release native-feature suite | **75 passed**: 66 library + 9 native |
| Node suite | **105 passed** |
| Production browser camera/constructor/controller cases | **6 passed**, 3.6 minutes, before final footer/mobile/focus refinements |
| Focused final production settings rerun | **3 passed**, 1.5 minutes, after final footer/mobile/focus changes |
| Release WASM/static web/native Linux builds | **Passed**; existing Vite large-chunk warning remains |
| Native eight-camera driving/render smoke | **2 passed** serially: 2004 **119.6 km/h**, 2023 **119.3 km/h**; preference path untouched |

The six-case run includes three new settings cases, the previous two car/camera cases, and the simulated-controller driving/camera/disconnect case. New checks cover FOV/distance changes, true right-drag movement, fixed onboard mounts, independent per-camera preferences, reload restoration, transient-look reset, mobile look controls, explicit blocked-storage fallback and disposal/re-entry. Actual browser-rendered desktop/mobile settings screenshots were inspected; footer inheritance originally made the reset label too small and was fixed. These are real game captures, not generated concept art.

A final review caught Rust's `signum(+0.0) == +1`, which would have treated an idle wheel like scrolling. Native input now explicitly ignores zero/nonfinite wheel values and includes a regression test. Default distance-one math also preserves the exact preset coordinates rather than adding floating-point drift.

The focused reruns overlap earlier cases: do not add their counts as distinct tests. Python/offline geometry generation and the full unrelated browser/game/scenery suites were **not rerun** for this control-only pass. Physical controller/mouse hardware and subjective camera comfort remain unverified; browser pointer and simulated controller behavior are exercised automatically. Native camera preference serialization and transform/input math have unit coverage, not a claim of full end-to-end desktop file-persistence certification.

## Reproduce

```sh
. "$HOME/.cargo/env"
cargo test --release --features native
npm test
bash scripts/build-web.sh
cargo build --release --features native --bin apex-native
python3 -m http.server 8080 --bind 0.0.0.0 --directory site
# Separate terminal; run browser and native OpenGL checks serially:
APEX_URL=http://127.0.0.1:8080 npx playwright test tests/camera-controls.spec.js tests/cameras-and-finish.spec.js tests/features.spec.js --grep 'camera|controller-only|blocked|race exit'
APEX_URL=http://127.0.0.1:8080 npx playwright test tests/camera-controls.spec.js
for era in 2 3; do
  APEX_SMOKE=1 APEX_SMOKE_ALL_CAMERAS=1 APEX_SMOKE_TRACK=0 APEX_SMOKE_ERA=$era xvfb-run -a target/release/apex-native
done
```

Native preferences normally use `$XDG_CONFIG_HOME/apex-heritage/cameras.json` or `~/.config/apex-heritage/cameras.json`; `APEX_CAMERA_PREFS` overrides the path. Smoke mode does not load or modify it. Browser preferences use `apex-camera-preferences-v1`, separate from race setup. No local user preferences, original uploads, caches or previous releases are bundled in new packages.

## Remaining scope

This is a camera-control update, not scan acquisition or a new constructor-specific model pass. The collection remains four authored era silhouettes across 47 liveries. Modern Monaco and the photographed Eau Rouge/Raidillon complex remain intentionally shared by all eras. Source/rights, historical-route and survey limitations in `SOURCES.md` and the asset notices remain unchanged.

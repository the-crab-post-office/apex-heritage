# Workspace map

- `src/` — shared Rust simulation, native renderer and native mesh tests.
- `web/` — browser renderer, UI and local runtime assets.
- `data/` — editable geometry/reference databases and asset-specific licenses.
- `scripts/` — offline regeneration, import, build, release and safe cleanup tools.
- `tests/` — Rust-adjacent offline, Node and Playwright regression suites.
- `releases/<version>/` — complete verified release ZIPs and checksums (preserved).
- `artifacts/` — ignored game captures and validation history, never bundled as runtime assets.
- `artifacts/archive/pre-0.10-validation.zip` — previous loose session logs/work scripts, verified before consolidation.
- `site -> build/site` — generated current static preview; recreate with `scripts/build-web.sh`.
- `target/`, `node_modules/` — rebuildable tool output/dependencies, not source deliverables.

Original user reference uploads stay outside the project in `../uploads/`; they are never removed by cleanup or included in a release.

## Safe cleanup

```sh
python3 scripts/clean-workspace.py                  # dry-run
python3 scripts/clean-workspace.py --apply          # generated test/import caches
python3 scripts/clean-workspace.py --apply --debug-cache # also Rust debug build cache
```

The cleanup command rejects tracked files and preserves source, licenses, reference uploads, captures, release archives and the current preview. It does not uninstall dependencies or toolchains.

## Important unfinished work

`data/CAR-SCAN-STATUS.md` and `data/car-asset-status.json` track all 47 requested constructor-specific scans. None is yet integrated; the existing cars must not be described as scanned replicas. Modern Monaco is user-selected for all eras. Source/massing/placement uncertainties are in `data/MONACO-REFERENCE-NOTICE.md`.

## Current car / camera pipeline (0.11)

- `scripts/build-car-shapes.py` generates all four era meshes and shared wheel layouts; 1988/2004 no longer use legacy runtime primitive builders.
- `data/cameras.json` defines eight rigs consumed by `web/cameras.js` and `src/cameras.rs`. Attached views inherit chassis pose; only the player's isolated head batches are hidden in cockpit mode; halo batches become translucent.
- Browser direct selector supports touch/keyboard; native uses C/RB or 1–8. Camera smoke validation can use `APEX_SMOKE_ALL_CAMERAS=1` or `APEX_SMOKE_CAMERA=0..7`.

## Adjustable camera preferences (0.11.1)

- `web/camera-controls.js`: pure bounded tuning, pose adjustment and versioned preference serialization; covered by Node tests.
- `web/race-camera-controls.js`: accessible settings panel, pointer-capture free-look, touch look buttons, local-storage failure handling and teardown.
- `src/cameras.rs`: matching distance/FOV/free-look math. `src/bin/camera_controls/mod.rs`: native input and user-local file preferences; smoke checks ignore preference files and never save them.
- `apex-camera-preferences-v1` is the browser local-storage key. Mode uses stable rig IDs; views have independent distance/FOV values. Temporary look angles are not persisted.

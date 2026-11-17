# Workspace map

- `src/` — shared Rust simulation, native renderer and native mesh tests.
- `web/` — browser renderer, UI and local runtime assets.
- `data/` — editable geometry/reference databases and asset-specific licenses.
- `scripts/` — offline regeneration, import, build, release and safe cleanup tools.
- `tests/` — Rust-adjacent offline, Node and Playwright regression suites.
- `releases/<version>/` — complete verified release ZIPs and checksums (preserved).
- `artifacts/` — ignored game captures and validation history, never bundled as runtime assets.
- `artifacts/archive/pre-0.10-validation.zip` — previous loose session logs/work scripts, verified before consolidation.
- `site -> build/previews/<version>-<fingerprint>` — generated current static preview; recreate with `scripts/build-web.sh`.
- `target/`, `node_modules/` — rebuildable tool output/dependencies, not source deliverables.

Original user reference uploads stay outside the project in `../uploads/`; they are never removed by cleanup or included in a release.

## Safe cleanup

```sh
python3 scripts/clean-workspace.py                  # dry-run
python3 scripts/clean-workspace.py --apply          # generated test/import caches
python3 scripts/clean-workspace.py --apply --debug-cache # also Rust debug build cache
python3 scripts/clean-workspace.py --apply --release-cache # also compiler intermediates; keeps executables
```

The cleanup command rejects tracked files and preserves source, licenses, reference uploads, captures, release archives and the current preview. It does not uninstall dependencies or toolchains.

## Important unfinished work

`data/CAR-SCAN-STATUS.md` and `data/car-asset-status.json` track all 57 constructor-season entries (the original 47 plus the full 2021 grid). None is yet integrated; the existing cars must not be described as scanned replicas. Modern Monaco is user-selected for all eras. Source/massing/placement uncertainties are in `data/MONACO-REFERENCE-NOTICE.md`.

## Current car / camera pipeline (0.11)

- `scripts/build-car-shapes.py` generates all five era meshes and shared wheel layouts; 1988/2004 no longer use legacy runtime primitive builders.
- `data/cameras.json` defines eight rigs consumed by `web/cameras.js` and `src/cameras.rs`. Attached views inherit chassis pose; only the player's isolated head batches are hidden in cockpit mode; halo batches become translucent.
- Browser direct selector supports touch/keyboard; native uses C/RB or 1–8. Camera smoke validation can use `APEX_SMOKE_ALL_CAMERAS=1` or `APEX_SMOKE_CAMERA=0..7`.

## Adjustable camera preferences (0.11.1)

- `web/camera-controls.js`: pure bounded tuning, pose adjustment and versioned preference serialization; covered by Node tests.
- `web/race-camera-controls.js`: accessible settings panel, pointer-capture free-look, touch look buttons, local-storage failure handling and teardown.
- `src/cameras.rs`: matching distance/FOV/free-look math. `src/bin/camera_controls/mod.rs`: native input and user-local file preferences; smoke checks ignore preference files and never save them.
- `apex-camera-preferences-v1` is the browser local-storage key. Mode uses stable rig IDs; views have independent distance/FOV values. Temporary look angles are not persisted.

## Coherent publishing (0.11.2)

`npm run build` compiles to `build/staging-site`, then `scripts/publish-site.py` verifies HTML/CSS/assets plus the actual WASM identity (`scripts/verify-core.mjs`) and atomically switches `site` to a complete fingerprinted preview. Old generated previews are cleanup candidates, never the active target. A failed build leaves the previous preview untouched.

Use `python3 scripts/serve-web.py --port 8080` from source. Web ZIPs include the same standalone server as `serve.py` and static-host `_headers` cache rules. The legacy caching server was retired; the current live preview is **Fixed game**, port 5186. HTML/CSS metadata use build-time tokens, not hand-edited version strings.

Release-cache cleanup removes only Rust intermediates (`deps`, `build`, `incremental`, `.fingerprint`, `examples`); it keeps the finished native executable and WASM outputs. Rebuilding afterwards will recompile dependencies. Source/asset/previous-release/upload hashes are checked across cleanup.


## Modern Monaco Piscine

- `scripts/piscine_reference.py`: offline refinement invoked by `scripts/build-corner-details.py` (requires Shapely 2.1+ for constrained triangulation).
- `data/monaco-piscine-map.json`: retained OSM geography/attribution; no network required to regenerate.
- `data/monaco-piscine.json`: shared non-driving scenic facets, boxes and terrain cutouts; `src/piscine.rs` and `web/graphics.js` consume it.
- `tests/test_piscine_reference.py`, `tests/piscine-visuals.spec.js`, Rust `piscine::tests`: mapped water/corridor/all-era/visual regressions.
- `artifacts/piscine-{overhead,entry,exit}.png`: actual game captures, not AI-generated imagery.


## GitHub migration / workspace budget

Repository: https://github.com/the-crab-post-office/apex-heritage . Source/history/feature branches and release tags are preserved there. `gh-pages` contains only the compiled static game; `scripts/deploy-pages.py` publishes a verified build without copying uploads or credentials. Vite assets, runtime build-manifest requests and credit/license links are relative so root and `/apex-heritage/` hosting both work.

All 40 previous archive/checksum files from versions 0.6–0.12 were uploaded as GitHub release assets and verified against GitHub's SHA256 digests and sizes before older local copies were moved. `RELEASE-ARCHIVES.json` is the persistent download/digest index. Current 0.12 ZIPs remain under `releases/0.12.0-preview.1/`; older redundant local copies are outside `/home/user` and may disappear, but the GitHub copies persist. No original reference uploads were published.

Rebuildable Rust toolchains/registries, Node dependencies, browser caches, npm caches and Rust compiler output were moved to `/var/tmp/apex-workspace-cache/` with symlinks for the current session. Those files are **not persisted** with the workspace. After a sandbox restart, reinstall Rust/wasm-bindgen, `npm ci` and Playwright browsers as needed. Inactive generated previews and old diagnostic captures were moved there too; current Piscine screenshots and validation evidence remain in `artifacts/`.

`python3 scripts/workspace-budget.py` audits all regular files and symlinks in `/home/user`, including Git history/uploads, without following external cache links. Limits are conservatively checked as **128,000,000 bytes and 10,000 entries**. Do not follow external cache symlinks when calculating persisted workspace size.


Public deployment verified: https://the-crab-post-office.github.io/apex-heritage/ (Monaco loaded and accelerated using Rust WASM, no page errors/failed responses). Source repository is public; original user photos and the supplied GitHub credential were not published. The credential attachment is moved out of the persisted workspace to private temporary storage after publication; revoke/rotate it once no longer needed.

After archival and Git object repacking (without pruning history), the complete `/home/user` audit was approximately **106 MB / 590 entries**, including the current release ZIPs, active preview, source, complete local Git history and reference uploads. Exact current figures: `python3 scripts/workspace-budget.py`. This leaves margin below the conservative 128,000,000-byte / 10,000-entry caps.

## 0.13 car comparison

`web/public/car-comparison.html` is a self-contained deliverable with ten licensed reference photos and actual game captures. Rebuild captures via `scripts/capture-car-comparison.mjs`, then run `scripts/build-car-comparison.py` and rebuild the web site. `data/CAR-REFERENCE-PHOTOS.md` and `data/car-references.json` retain full credit, sources, license and photo checksums. Captures are not scans; there are still zero verified car scans. 2021 uses the latest track-surface profile as an explicitly labelled substitute, not a newly surveyed 2021 circuit.

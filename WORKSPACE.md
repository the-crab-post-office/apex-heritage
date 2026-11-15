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

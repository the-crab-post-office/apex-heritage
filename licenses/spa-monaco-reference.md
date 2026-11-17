# Spa corners / Monaco building-tunnel reference follow-up — 0.15

User-selected scope: new **Spa surfaces and collision barriers only on the latest preset**, also used as the explicitly labelled 2021 substitute. The previous 1967/1988/2004 Spa profiles remain byte-identical. Existing user-selected all-era Eau Rouge and modern Monaco exceptions remain unchanged.

## Reference-only user images

`data/spa-monaco-reference.json` records filenames, SHA256 hashes and interpretation of the five supplied views. Their original sources, capture dates and redistribution rights are not established. **No user image pixels are included in the game, source repository, reports or release archives.** The first view looks like a game render and is not treated as survey evidence. Corporate sponsor signs visible in the views are not copied as photographic textures or corporate vectors.

## What changes

- La Source: connected outside paved escape; paved inner pit island instead of a large grass pocket; short rounded apex and exit kerbs; a narrow green border and red/yellow outer safety blocks.
- Les Combes / Malmedy: independent T5 right, T6 left and T7 right apex/exit windows, with separate green-painted margins and outside gravel. Long generic kerbs through several changes of direction are removed.
- Bus Stop: short right-left apexes, broad inside green/paved areas, diagonal escape hatching and a green-edged finish straight. Staggered grid boxes approach the existing timing line; legal road width, pit route and timing-line position are unchanged.
- New runoff/paint polygons replace existing overlapping surfaces, clear both racing and pit roads plus mapped building footprints, and follow the nearest local Spa road surface rather than a fixed distant corner height. New modern barriers are selected by the same Rust venue used for collision and both renderers.
- Monaco: explicit overhead hotel infill connects the original mapped Fairmont outline across the previously clipped road corridor, with preserved courtyards, a portal connection, stacked facade bands and windows. The ordinary ground-building clearance filter is **not disabled**. The hotel floor starts above the existing 4.65 m tunnel ceiling. Both web and native use the same authored facet data, on every era.

## Attribution and limits

Original authored geometry and markings; underlying mapped features © OpenStreetMap contributors, ODbL 1.0, as credited in `SOURCES.md` and the existing Monaco/corner notices. Mapped Fairmont outline and courtyard provenance: `data/monaco-reference.json`; hotel heights and portal connection remain estimates, not scans.

No camera matching, surveyed variable-width racing road, exact sponsor inventory, calibrated material measurement or historical Spa reconstruction is claimed. The mapped road/pit centrelines are not rerouted. Paddock structures, runoff widths, barrier offsets, facade spacing and paint extents remain simplified. Wet/dry source views are not proof of a single year's exact configuration.

Reproduce: run `scripts/build-corner-details.py` and `scripts/build-reference-scenes.py`; build/serve; run `scripts/capture-spa-monaco-update.mjs`; then `scripts/build-spa-monaco-report.py` and rebuild. The report embeds **actual game captures only**, not the user images. Full broad photo audit attribution remains in `data/PHOTO-AUDIT-NOTICE.md`.

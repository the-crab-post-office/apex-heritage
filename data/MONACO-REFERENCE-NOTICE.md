# Modern Monaco visual-reference update

The user explicitly selected **modern Monaco for every car era**. This does not reconstruct historical Monaco. Existing historical-road substitution notices remain.

## Mapped geometry (ODbL-1.0)

© OpenStreetMap contributors — https://www.openstreetmap.org/copyright
Database license: https://opendatacommons.org/licenses/odbl/1-0/

`monaco-reference.json` retains a compact editable extract from the public OSM map API, retrieved 8 November 2026:
https://www.openstreetmap.org/api/0.6/map?bbox=7.4260,43.7380,7.4315,43.7415

Recovered landmark outlines:
- Casino de Monte-Carlo, way 161769674.
- Fairmont Monte Carlo, relation 2093796 / outer way 156242249.
- Hôtel de Paris Monte-Carlo, relation 8280869 / outer way 157719657.

A separate multi-material batching bug also removed roof/facade draw ranges in the browser; it is now fixed across all circuits, with triangle-count and raycast regressions. The previous importer omitted all multipolygon relations, and rejected complete building footprints intersecting a road margin. These landmarks were consequently absent or represented only by small adjacent buildings. The new offline refinement retains mapped courtyards, splits them into simple footprint parts for both renderers, and clips only protected road/pit corridors. This intentionally avoids obstructing the current simplified road; it is not a claim that actual buildings have such cuts. Additional named-building metadata improves existing footprints, including Le Mirabeau and Sainte-Dévote Chapel. No building has been placed at a random lap fraction.

## Photo-guided original detail

Reference URLs and observations are in `monaco-reference.json`. Inspected hairpin photographs show stacked balconies, pale façades, retaining terraces and tightly placed three-rail Armco. Inspected Hôtel de Paris photography informs pale stone, cornices and dark iron balcony rhythm. Casino photography informs simplified paired roof towers and patinated roof colouring. Main landmark heights (19/25/28 m) and modular details are authored visual estimates, not measured drawings or scans. The roofs are anchored relative to the adjacent existing road profile (indices retained in JSON), with foundations extended down to the lowest terrain edge, avoiding buried landmarks on steep ground. This is an authored elevation adaptation, not a surveyed building datum. Fine sculpture, signs and specific ornament are not reproduced.

Photo-estimated temporary race barrier sections are anchored to named circuit areas and the existing mapped centreline. Offsets carry approximately ±1 m uncertainty; there is no calibrated multi-camera reconstruction. Protected road branches, pit access, buildings and existing barrier pieces override estimates. Some gaps are intentionally retained where evidence or geometry is insufficient. Positions are shared with the native renderer and physical barrier collision database; foundations retain actual rendered-ground support.

Reference photographs are **not redistributed** and are not pasted into material textures. Third-party photo rights remain with their respective owners. The original modular façade-detail code is licensed separately from OSM-derived coordinates.

## Scope limits

This is an initial Monaco-focused graphics/scenery stage. Other circuits retain their previous mapped scenery. Modern Monaco buildings and barrier locations do not imply accurate historical road layouts. The present-day map may include developments newer than the 2023 car season. Car scan replacement remains unfinished: see `CAR-SCAN-STATUS.md` (0/47 verified scans integrated).

Regenerate offline:

```sh
python3 scripts/monaco_reference.py
python3 scripts/build-corner-details.py
```

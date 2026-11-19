# Building appearance — scope, sources and original artwork

The 4,419 records in `buildings.json` include split parts of some mapped buildings. All receive explicit appearance records in `building-appearance.json` across 13 circuit venues. Some road-conflicting footprints are clipped into safe parts or omitted at rendering time. A database assignment is not a claim that every original footprint can safely be drawn unchanged.

## Photographic evidence

`building-photo-references.json` retains the 13 venue reference-page URLs, observed features, inspected-preview hashes and rejected/render-only references. The photographs informed venue material character and selected architectural cues. They do **not** establish every building's identity, current facade, exact dimensions, roof pitch or hidden side. No stock photograph pixels are copied into textures, screenshots, source or the public site. Research thumbnails are reference-only and are not distribution assets.

The 78 facade JPEGs in `web/assets/facades` are original procedural drawings made by `scripts/build-building-appearance.py`. They are project artwork, not licensed stock-photo facades. They reuse six architectural material families with venue palettes and explicit per-record assignment; these are not 4,419 unique hand-modelled/photo-matched facades.

## Geometry and uncertainty

Mapped building data remain © OpenStreetMap contributors, ODbL 1.0; see `OSM-NOTICE.md` and venue-specific notices. Original mapped source records remain editable and unchanged. Display-only appearance records conservatively revise default-estimated heights on small buildings and add estimated hip roofs only to small low convex footprints. Known height/level values remain authoritative except selected eaves/roof decomposition within the retained mapped maximum-height envelope.

Silverstone Wing's folded five-bay roof and estimated 12 m eaves/30 m maximum envelope are authored interpretations, not a surveyed roof. Imola tower's red crown is an original approximation inside its mapped plan/21 m envelope. The browser contains additional decorative arches; the native client is simpler. Yas hotel lattice gaps/glazing/connector geometry remain estimates from mapped outlines and reference photographs. Existing explicit modern Monaco landmark/tunnel rules remain unchanged.

Road and pit clearance are never disabled for ordinary buildings. Appearance `safe_footprints` are display-only cutbacks against the mapped road/pit clearance envelope; ambiguous tiny/interior-hole remnants may be omitted. This avoids putting buildings across drivable roads but is not a cadastral correction to OSM.

## Rebuild

`python3 scripts/build-building-appearance.py` generates the appearance JSON, original facade JPEGs and Rust asset include table without network access (Python Pillow and Shapely required); follow with `cargo fmt`. Rebuild reference scenes separately with `python3 scripts/build-reference-scenes.py`. Both clients use the same appearance assignments and earth/banking formulas. Browser material/lighting detail is richer than native.

Banking: Zandvoort T3 deliberately peaks at 10 degrees as requested, not the real variable bowl maximum. T14 retains 18 degrees and blends flat by station 801. Continuous banked earth, outward fade and a lower closure bed replace the vertical apron curtains. These are authored playable terrain transitions, not surveyed road engineering or a calibrated banked-corner tyre model.

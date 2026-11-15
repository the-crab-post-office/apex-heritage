# Photo-guided cars and Eau Rouge / Raidillon — 0.9

Independent, original procedural reconstruction. This update uses the user's three supplied reference photographs as visual guides, not as textures. No pixels from `image-1.png`, `image-2.png` or `image-3.png` are copied into game assets or release ZIPs. The supplied gameplay screenshot documents the previous result, not a source for real-world measurements.

## Car geometry

- **2023:** a more slender raised nose; a curved spoon-shaped front mainplane with separate aerofoil flaps; low undercut sidepods and recessed radiator openings; venturi-floor edges and diffuser fences; substantial curved halo and centre pillar; engine-cover/airbox opening; curved rear mainplane/DRS flap, swan-neck supports and beam wing; rounded tyre shoulders, dished rims and compound/lettering bands. Dark modern wing panels replace the former red secondary-colour wings. Mirror housings are carbon rather than accidentally sampling the yellow nose patch.
- **1967:** a rounded cigar monocoque rather than the modern pointed wedge; open oval radiator cavity with a rolled surround; open cockpit sides; exposed cam covers, inlet trumpets and exhaust headers; roll hoop and visible wishbones/coilovers; narrow front tyres and wider rear tyres. No wings, halo or modern sidepods.
- `scripts/build-car-shapes.py` generates `data/car-shapes.json` and `data/car-layouts.json` offline. Both renderers consume the same authored triangles. Layouts also feed Rust's wheel/contact model so the new 2023 wheelbase/track and 1967 rear tyre width agree with visible wheels. 1988/2004 retain the previous meshes.
- These are **shared era silhouettes**, not 19 separately scanned constructor chassis. The photographs guide proportions and distinctive parts; they do not supply exact engineering dimensions. Team atlases remain original stylised reconstructions, not exact corporate lettering. See `LIVERY-NOTICE.md` for rights and roster limitations.

## Eau Rouge / Raidillon

The user explicitly chose **the photographed modern complex for every car era**. Only this local complex is overridden; the remainder of Spa and the other circuits retain the existing mapped-layout limitations and substitution labels.

The corrected height profile uses geographic control points in `spa-reference.json`: approximately **40 m** from compression to crest, with a maximum sampled climb of approximately **17.4%**. This is an authored road-profile approximation informed by the image and published descriptions, **not a survey, laser scan or photogrammetric reconstruction**. Useful cross-checks:

- https://lapmeta.com/en/track/variation/14 — describes the approximately 40 m / 17% Eau Rouge–Raidillon climb.
- https://spatrackexperience.be/en/the-circuit/ — same broad climb/gradient description.

`build-elevation.py` applies the profile after DSM filtering. Geographic anchors, not fractional-lap keys, keep the hill fixed when sample zero is rotated. Absolute elevation datum and detailed intermediate grades remain approximate. The same road-height arrays feed Rust contact/gravity, web/native road meshes, terrain blending, HUD grade and the menu elevation chart. Planar centreline, AI path and minimap remain the existing mapped road; no conflicting second road alignment is introduced.

`spa_reference.py`, called by `build-corner-details.py`, replaces the old broad generic Raidillon kerb/runoff window with separate compression, uphill-apex, blind-crest and exit kerbs, red/green paved apron bands, and connected outer barriers/fencing. Their heights, widths, extents and exact colours are photo-guided estimates. Paved paint retains the shared physical paved-runoff classification; the outer white line still defines legal track limits. All these local elements are the same across 1967/1988/2004/2023 selections.

Long hillside stand footprints are segmented into contiguous, terrain-following modules to avoid elevating the entire structure to its highest terrain corner. The Raidillon stand receives a dark roof and taller tiers, guided by the supplied photograph; the underlying mapped footprint is retained rather than claiming a newly surveyed stand. The forest backdrop is denser and tree crowns are layered. Web lighting and terrain normals are less washed-out/faceted. Native keeps simpler lighting/vegetation but shares the road profile, physical kerbs/apron, connected barriers, covered stand and car triangles.

## Accuracy and permissions

The result is a recognisably revised **playable prototype**, not a claim of photographic equivalence. Stand roof geometry, terrain banks, paint extents, forest placement and car engineering remain approximations. The update does not finish all-ten historical road/scenery reconstruction or establish survey-correct elevation elsewhere. Current pits remain mapped approximations. Reference-photo ownership is not represented as transferred; the images are reference-only and are not redistributed. Existing OSM, Copernicus, circuit-map, CC0 material, recording, font and trademark notices remain applicable.

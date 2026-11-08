# Reference and asset provenance

Research date: 8 November 2026. These sources inform a **simplified artistic prototype**. They do not establish survey accuracy, period correctness, or licensed architectural/car reproductions.

## Circuit maps

- Source: [Tomislav Bacinger — f1-circuits](https://github.com/bacinger/f1-circuits)
- Input: [`f1-circuits.geojson`](https://github.com/bacinger/f1-circuits/blob/master/f1-circuits.geojson)
- License: MIT, copyright 2019–2025 Tomislav Bacinger. Full notice retained in `data/CIRCUITS-LICENSE.md`.
- Processing: local equirectangular projection in metres (111,320 metres per degree with latitude-adjusted longitude); two gentle Chaikin smoothing passes; uniform sampling at roughly 5 metres; closed loop.
- Source IDs: `be-1925`, `mc-1929`, `it-1922`, `gb-1948`, `jp-1962`, `br-1940`, `it-1953`, `de-1927`, `ca-1978`, `de-1932`.
- Length metadata is retained from the source. Rendered polyline length can differ after projection and smoothing. Corner counts are UI reference values rather than dynamically detected geometry.
- Source collection is not a historical-layout catalog. All cars use the same provided layout. Hockenheim is the shorter modern GP shape; Nürburgring is GP-Strecke, not Nordschleife.

Cross-reference maps/history: [F1 Chronicle circuit map collection](https://f1chronicle.com/formula-1-circuit-maps/) and [RacingCircuits.info directory](https://www.racingcircuits.info/find-a-circuit/a-to-z-circuit-list.html).

## Photographic references

Images were searched and visually inspected for surroundings and broad scenery cues. **No third-party photographs or thumbnails are copied into the application, release package or source archive.** Stock-photo previews remain reference-only; licenses for redistribution were not obtained.

| Circuit | Reference page | Cues used in original procedural scenery |
|---|---|---|
| Spa-Francorchamps | [Circuits of the Past — Eau Rouge or Raidillon](https://www.circuitsofthepast.com/eau-rouge-or-raidillon/) | Forested setting, hills, pit structures, red/yellow curb palette. Heights now use the coordinate-sampled GLO-30 estimates described below, not hand-authored climb/dip keys; no surveyed Raidillon heights are claimed. |
| Monaco | [Monaco waterfront/circuit reference](https://thefuture3d.com/blog/monaco-grand-prix-3d-scanning-street-circuit) | Dense pale buildings, waterfront and moored yachts. No exact street furniture or tunnel reconstruction. |
| Monza | [Monza track aerial photography collection](https://www.istockphoto.com/photos/monza-track) | Parkland, mature trees and long straight sections. |
| Silverstone | [Silverstone aerial imagery collection](https://gettyimages.com/videos/silverstone-aerial) | Open airfield-like landscape and angular-roof pit architecture. |
| Suzuka | [Wikimedia Commons — Suzuka Circuit aerial photograph, 1987](https://commons.wikimedia.org/wiki/File:Suzuka_Circuit_Aerial_photograph_1987.jpg) | Figure-eight crossover, open fields and tree belts. A stylized observation wheel is an additional recognizable cue, not a reconstruction from this aerial. A synthetic/AI image found in another search was deliberately excluded as evidence. |
| Interlagos | [Interlagos event photography collection](https://www.pexels.com/search/interlagos%20circuit/) | Dense venue buildings and an urban circuit setting. A separately surfaced 1976 aerial was not used to define the modern track layout. |
| Imola | [Motor Valley — Imola guided tour](https://www.motorvalley.it/en/experiences/tour-guided-autodrome-of-imola/) | Tower massing, horizontal façade bands and red upper architectural accents. |
| Nürburgring GP | [Dyler — GP-Strecke aerial](https://dyler.com/blog/127/nurburgring-has-a-record-that-will-never-be-beaten) | Forested Eifel setting and broad GP facility footprint. Article title refers to wider Nürburgring history, not the playable layout. |
| Montréal | [Circuit Gilles-Villeneuve aerial reference](https://www.reddit.com/r/formula1/comments/ap8996/aerial_view_of_circuit_gilles_villeneuve/) | Island setting, flanking water and tree belts. Photo credit/licensing was not established, so no image is redistributed. |
| Hockenheim | [Hockenheim aerial reference](https://www.pinterest.com/pin/571746115169312209/) | Forest edge and stadium-like grandstand arrangement. Pin is a visual reference, not a licensing source. |

Landmarks are approximate architectural cues and are not positioned from a detailed survey. Native scenery is more limited than web scenery. Vegetation, road materials, fences, water, yachts, wheel and car models use original code. Buildings now use OSM footprints; arbitrary pit blocks, stands and city-building placement were removed.

## Car and performance references

Car names and years identify historically inspired machines. Geometry is original and generic within each era. No logos, sponsor decals, scanned meshes or official manufacturer blueprints were used.

The central gameplay distinctions are low-aero classic cars, turbo boost buildup, a high-revving V10 era and heavier high-downforce modern cars. Mass, power, grip, aero, braking and steering parameters are approximations. Team modifiers are authored game balance, **not source-backed historical measurements or rankings**. In particular, era-wide handling does not simulate every real engine architecture represented in the roster.

## Original artwork and dependencies

- `web/assets/heritage-hero.jpg`: AI-generated original motorsport concept artwork. Shown as concept art in the menu; **not an actual screenshot or third-party track photograph**. The image is generic promotional artwork and does not change to a photographic representation of each selected circuit.
- WebGL car meshes, textures and world geometry: original procedural code in `web/graphics.js`.
- Engine audio: licensed real recording layers for the first three eras, blended with original four-stroke-inspired synthesis/transients. The modern V6 is procedural. See the 0.3 recording section and asset-specific CC BY-SA notice; presets remain illustrative rather than measured replicas.
- Three.js: MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE
- Lucide: ISC/MIT attribution as shipped by the dependency, https://github.com/lucide-icons/lucide/blob/main/LICENSE
- Macroquad: MIT/Apache-2.0 as shipped by the dependency, https://github.com/not-fl3/macroquad
- Other dependencies retain their own notices in their packages. `package-lock.json` and `Cargo.lock` pin the dependency resolutions.

This project is independent and not endorsed by Formula One Licensing B.V., the FIA, teams or circuits. Naming and commercial distribution require a separate rights review.

## Original elevation update (0.2, superseded in 0.3.1)

**Historical implementation note: the fraction-keyed authoring approach below was removed because it misplaced hills geographically. Current heights use the coordinate-based GLO-30 process documented at the end of this file.**

`scripts/build-elevation.py` contains explicitly authored progress/height keyframes for all ten tracks. Periodic monotonic cubic interpolation creates per-point `heights` and `ground_heights` in both copies of the map dataset. Values are relative metres, not absolute altitude. The selected gameplay height ranges are Spa 104 m, Monaco 43 m, Monza 9 m, Silverstone 18 m, Suzuka 40 m, Interlagos 43 m, Imola 31 m, Nürburgring GP 51 m, Montréal 5 m and Hockenheim 7 m. **These are authored settings, not newly verified geographic measurements.**

Suzuka's upper branch receives an 8 m lift, while ground interpolation uses the underlying profile. The Rust core projects onto locally tracked segments to avoid crossover branch jumps, computes grade relative to heading and applies the corresponding gravity component. Web and native car pitch and height follow that core state. The model is constrained to the road surface, not a full vertical/suspension dynamics simulation.

CPAL (Apache-2.0) is used only for native device output: https://github.com/RustAudio/cpal . Native audio-device playback has not been certified on physical speakers here; native DSP output is covered by numerical tests.

## Mapped scenery and start references (0.3)

Present-day OpenStreetMap building ways were downloaded on 8 November 2026 through Overpass. `data/buildings.json` and its browser copy contain the editable derived database, per-circuit timestamps, original OSM way IDs, polygon footprints and height-estimation provenance. See `data/OSM-NOTICE.md` for the ODbL notice, inverse projection, exclusions and limitations. There are no randomly positioned replacement buildings. All footprints are checked against the full closed road corridor, and tree canopies use continuous segment distances, including adjacent circuit branches and the closing segment.

Monaco's source point zero was near Casino rather than Boulevard Albert Ier. OSM node [4937755860](https://www.openstreetmap.org/node/4937755860) provides a mapped start/finish reference, snapped 0.32 m to the processed centreline. The polygon order, road heights and ground heights were rotated together; `profile_offset` preserves elevation-generation reproducibility. Browser/native spawn, gantry, AI and lap progress now share that corrected origin. Silverstone, Imola, Nürburgring GP and Hockenheim also use mapped markers. Five others retain unverified source-order starts; see the notice rather than assuming every marker is a modern F1 start line.

## Real engine recordings (0.3)

The first three era presets now use low/high PCM loops derived from Edvvc (Ed Pond)'s real Goodwood 2010 recordings: Lotus-BRM 24 (1962), Toleman-Hart TG183B (1983) and Williams-Renault FW18 (1996). Explicit Commons file-page grants are CC BY-SA 3.0. Full credits, source pages, license basis (including the older embedded NC metadata discrepancy), adaptations and limitations are in `web/assets/audio/NOTICE.md`; machine-readable windows and playback anchors are in `recordings.json`. `scripts/build-recordings.py` reproduces all six loops.

Both native CPAL and browser AudioWorklet interpolate the same embedded/shipped 24 kHz PCM and blend it with original synthesized drivetrain/transient/noise layers. Browser AI also uses recorded layers, with spatial gain/pan and Doppler. Missing browser samples retain a synthesized fallback. The modern 2023 V6 remains synthesized: no matching verified recording was obtained. Real trackside samples do not establish exact engine-model or RPM calibration; the Hart sample is four-cylinder rather than the 1988 V6 roster's engine architecture.


## Geographic elevation correction (0.3.1)

The original lap-fraction elevation keyframes were not geographic evidence and misplaced terrain features. They were removed entirely. `data/elevation-dem.json` now retains bounded GLO-30 Public source windows downloaded by HTTP range reads from the public AWS Copernicus COG distribution on 8 November 2026. `scripts/build-elevation.py` regenerates all ten profiles offline by sampling map coordinates, not sample-zero-relative progress. `tests/test_elevation.py` rotates each circuit's point zero, rebuilds and verifies that world-coordinate heights are unchanged.

The DSM is a surface model, including trees and buildings, at approximately 30 m resolution—not track surveys or bare-earth lidar. Spatial median/Gaussian filters and periodic along-road filtering suppress artefacts; residual canopy/building error is still possible. Surrounding terrain is a 2D geographic field, with a broad road-bed blend, not an extrusion of whichever piece of track happens to be nearest. The sea-level offset uses the same local datum. Cars leaving the shoulders follow rendered ground instead of floating at the nearest road height.

OSM way [4230891](https://www.openstreetmap.org/way/4230891), Boulevard Louis II, identifies Monaco's main tunnel. Road geometry and portal references are retained in `data/road-structures.json`, ODbL. The tunnel's approximate 6 m above-sea-level road correction avoids sampling the hotel/cliff over the tunnel; it is explicitly authored, not measured. Suzuka's two crossing legs are identified geographically, with an authored 8 m clearance on the upper leg. No absolute-survey accuracy is claimed for those corrections.

Full source, required Copernicus copyright/derived-product notice, licence links, parameters and limitations: `data/ELEVATION-NOTICE.md`. Editable source grids and derived track arrays are shipped and available under `/licenses/` in web builds. The browser credits reproduce the Copernicus notice. Data redistribution is separate from the MIT code licence.

## Road-surface rendering correction (0.3.2)

No new external geographic sources or terrain heights were introduced. The rendering correction uses original polygon-clipping code in `web/road-surface.js` and `src/surface_mesh.rs` to keep drawn terrain and grass out of the projected asphalt footprint, with centerline-split road bands. The data provenance/approximation limits above remain unchanged. Build hashes identify matching data, not geographic accuracy.

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
| Spa-Francorchamps | [Circuits of the Past — Eau Rouge or Raidillon](https://www.circuitsofthepast.com/eau-rouge-or-raidillon/) | Forested setting, hills, pit structures, red/yellow curb palette. Actual Raidillon elevation is not reconstructed. |
| Monaco | [Monaco waterfront/circuit reference](https://thefuture3d.com/blog/monaco-grand-prix-3d-scanning-street-circuit) | Dense pale buildings, waterfront and moored yachts. No exact street furniture or tunnel reconstruction. |
| Monza | [Monza track aerial photography collection](https://www.istockphoto.com/photos/monza-track) | Parkland, mature trees and long straight sections. |
| Silverstone | [Silverstone aerial imagery collection](https://gettyimages.com/videos/silverstone-aerial) | Open airfield-like landscape and angular-roof pit architecture. |
| Suzuka | [Wikimedia Commons — Suzuka Circuit aerial photograph, 1987](https://commons.wikimedia.org/wiki/File:Suzuka_Circuit_Aerial_photograph_1987.jpg) | Figure-eight crossover, open fields and tree belts. A stylized observation wheel is an additional recognizable cue, not a reconstruction from this aerial. A synthetic/AI image found in another search was deliberately excluded as evidence. |
| Interlagos | [Interlagos event photography collection](https://www.pexels.com/search/interlagos%20circuit/) | Dense venue buildings and an urban circuit setting. A separately surfaced 1976 aerial was not used to define the modern track layout. |
| Imola | [Motor Valley — Imola guided tour](https://www.motorvalley.it/en/experiences/tour-guided-autodrome-of-imola/) | Tower massing, horizontal façade bands and red upper architectural accents. |
| Nürburgring GP | [Dyler — GP-Strecke aerial](https://dyler.com/blog/127/nurburgring-has-a-record-that-will-never-be-beaten) | Forested Eifel setting and broad GP facility footprint. Article title refers to wider Nürburgring history, not the playable layout. |
| Montréal | [Circuit Gilles-Villeneuve aerial reference](https://www.reddit.com/r/formula1/comments/ap8996/aerial_view_of_circuit_gilles_villeneuve/) | Island setting, flanking water and tree belts. Photo credit/licensing was not established, so no image is redistributed. |
| Hockenheim | [Hockenheim aerial reference](https://www.pinterest.com/pin/571746115169312209/) | Forest edge and stadium-like grandstand arrangement. Pin is a visual reference, not a licensing source. |

Landmarks are approximate architectural cues and are not positioned from a detailed survey. Native scenery is more limited than web scenery. Vegetation, road materials, fences, buildings, grandstands, water, yachts, wheel and car models are generated from original code.

## Car and performance references

Car names and years identify historically inspired machines. Geometry is original and generic within each era. No logos, sponsor decals, scanned meshes or official manufacturer blueprints were used.

The central gameplay distinctions are low-aero classic cars, turbo boost buildup, a high-revving V10 era and heavier high-downforce modern cars. Mass, power, grip, aero, braking and steering parameters are approximations. Team modifiers are authored game balance, **not source-backed historical measurements or rankings**. In particular, era-wide handling does not simulate every real engine architecture represented in the roster.

## Original artwork and dependencies

- `web/assets/heritage-hero.jpg`: AI-generated original motorsport concept artwork. Shown as concept art in the menu; **not an actual screenshot or third-party track photograph**. The image is generic promotional artwork and does not change to a photographic representation of each selected circuit.
- WebGL car meshes, textures and world geometry: original procedural code in `web/graphics.js`.
- Engine audio: original Web Audio oscillators; no sampled recordings or licensed sound bank.
- Three.js: MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE
- Lucide: ISC/MIT attribution as shipped by the dependency, https://github.com/lucide-icons/lucide/blob/main/LICENSE
- Macroquad: MIT/Apache-2.0 as shipped by the dependency, https://github.com/not-fl3/macroquad
- Other dependencies retain their own notices in their packages. `package-lock.json` and `Cargo.lock` pin the dependency resolutions.

This project is independent and not endorsed by Formula One Licensing B.V., the FIA, teams or circuits. Naming and commercial distribution require a separate rights review.

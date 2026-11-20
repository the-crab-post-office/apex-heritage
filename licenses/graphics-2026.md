# Graphics / 2026 update

Research cutoff: **8 November 2026**. All eleven 2026 constructors have a launch scheme. Twenty-two additional paint choices are curated from official Formula 1 / team announcements in `liveries-2026.json`; this is **not an exhaustive season archive**. Later Las Vegas reveals are outside this cutoff. All graphics are original simplified interpretations, not official textures, scans, CAD or exact decal replicas. Reference photographs remain with their owners and are not bundled.

## Vehicle construction

A separately authored compact 2026 silhouette has a 3.4 m wheelbase, narrower 280 / 375 mm tyres, 18-inch-style covered wheels, shaped radiator inlets, sculpted undercuts, exposed suspension, compact wing/endplate treatment and cooling louvres. Initial FIA 2026 dimensional rationale: https://www.fia.com/news/new-era-competition-fia-showcases-future-focused-formula-1-regulations-2026-and-beyond . Launch references for all eleven cars: https://www.theguardian.com/sport/gallery/2026/feb/10/f1-2026-formula-one-new-season-cars-in-pictures . Proportion adjustments are visual estimates, not exact constructor geometry. Power, mass and handling are gameplay tuning, not certified regulatory/telemetry values. 2026 uses a common baseline, deliberately avoiding invented championship rankings. Active aero, energy deployment and overtake systems are **not simulated**; no fake DRS state is generated.

Paint is selected independently of constructor: specials do not create additional teams, change physics, or enter the opponent roster as duplicate constructors. Audio is an explicitly procedural hybrid-V6 approximation, not a 2026 recording.

## All thirteen circuits

Per-region daylight, haze and ground bounce; stronger high-quality environment reflections; bank-conforming rubber/braking streaks, restrained repair seams and grid-side paint; street-circuit drainage; instanced roadside delineators outside full-loop/pit clearance and mapped buildings. Extra detail uses at most four batches per world. Low quality retains the inexpensive detail and avoids added post shadows. Wet weather reduces rubber contrast. These are authored visual estimates, not photographed/surveyed exact placements.

Existing road geometry, collision surfaces, physics, historic presets, Zandvoort banking/ground repair, all-era modern Eau Rouge/Raidillon and Monaco's overhead hotel/tunnel are retained. The 2026 era uses the latest supported mapped layout with an explicit recent-layout-substitute label; it does not assert 2026 layout accuracy.

## Reference-photo inspection

Official Barcelona VCARB FC and Audi Singapore gallery images were downloaded to a temporary reference cache and inspected. This informed the blue/green/white angular VCARB treatment and purple/pale floral-geometric Audi treatment. No photo pixels are used in generated textures. Source URLs are recorded per selectable livery.

## Audit limits, not hidden passes

The detailed raycast audit samples finite stations; it is not proof that every square centimetre has been surveyed. Monaco's outside-road terrain probes include water/scene-edge no-hit locations. Pit-edge raycast seams at Zandvoort and Baku (one no-hit each at audit stride 12, zero intrusions) are also present in the previous 0.16.0 build and are explicitly baseline-checked rather than attributed to this visual pass. These do not alter the retained racing-road/banking geometry; the racing-road audit checks missing triangles, occlusion and centre-height error separately.

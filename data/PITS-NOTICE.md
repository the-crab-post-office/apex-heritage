# Mapped current pit lanes — OpenStreetMap (ODbL 1.0)

© OpenStreetMap contributors. Source and database rights: https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/1-0/ . This adapted pit-lane database is distributed under ODbL 1.0, separately from the code's MIT licence.

Bounded public OSM API snapshots were retrieved on 8 November 2026. Exact bounding-box API URLs, timestamps, original way/node IDs, tags and geographic polylines are retained in `pit-lanes-osm.json`. `scripts/build-pits.py` reproduces `pit-lanes.json` offline (numpy/scipy/shapely). The derived database is embedded in the Rust core and returned to both renderers, so physics and visible routes use the same source path.

Selected ways: Spa 323851541; Monaco 850261588 + 1388331347, with public-street connection 166399479 + 1453878835; Monza 38168747; Silverstone **International** 227902927; Suzuka main 120917578 (not West Circuit); Interlagos 33779109 (not karting); Imola 196368195; Nürburgring GP 30815119 (not the separate northern pit route); Montréal 413000959; Hockenheim 15446020.

Processing: local-metre projection, approximately 5 m resampling, existing race-map endpoint registration and monotonically matched race progress. Heights remain estimates from the existing road profile, smoothed away from joins and matched where the lane rejoins the racing surface. **6 m width, service-box position, garage/wall details and limiter values are gameplay approximations**, not measured surveys. The current layout is shared by all car eras, not a historic reconstruction.

Monaco's OSM raceway pit path stops before the newer mapped pit-exit strip. Its intervening Boulevard Albert 1er public-street centreline is connected using actual OSM nodes, then explicitly registered to the separated eastern strip (up to 9 m) to avoid treating the public street centre as an accurate race-day lane. This refinement is authored, not a surveyed paint-line claim.

Pit asphalt/paint is geometrically subtracted from the main race-road footprint in both renderers. At real entrance/merge portions the existing race asphalt remains visible; a second raised pit ribbon must not cover it. Intentional real-world merging is different from the former generic lane extending onto unrelated corners.

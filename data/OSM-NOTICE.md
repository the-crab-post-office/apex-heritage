# OpenStreetMap building and marker database

© OpenStreetMap contributors. Available under the Open Database License 1.0:
https://opendatacommons.org/licenses/odbl/1-0/
Attribution and contributor information: https://www.openstreetmap.org/copyright

`buildings.json`, `start-markers.json`, their browser copies, and OSM-derived start-reference fields in `tracks.json` are OSM-derived data, **not MIT-licensed original assets**. The remaining circuit centreline geometry retains the separate MIT notice in CIRCUITS-LICENSE.md. Code is licensed separately from these databases.

Retrieved 8 November 2026 from https://overpass-api.de/api/interpreter. Per-circuit OSM base timestamps are stored in the building database. The exported database is supplied in editable JSON form with source OSM way IDs. Each footprint is a polygon in local metres: x=(longitude-origin.longitude) × 111320 × cos(origin.latitude), z=−(latitude-origin.latitude) × 111320. Origins are stored per circuit in tracks.json, permitting inversion to geographic coordinates. Source ways can be inspected at https://www.openstreetmap.org/way/ID; markers at https://www.openstreetmap.org/node/ID.

Processing: building ways near the track, projected to local coordinates, limited to 300 metres from the circuit; invalid/tiny polygons omitted; complete polygons intersecting the rendered road plus a 3.5-metre margin omitted rather than moved. Runtime checks retain a 3-metre margin. Multipolygon relations and holes are not imported. These are present-day locations, not era-specific reconstructions. Heights use OSM height where given, else 3 m per mapped level, else an explicitly estimated 8 m. Roofs are flat, original artistic geometry, not surveyed architectural replicas. Unmapped structures are not replaced with randomly placed buildings.

Monaco, Silverstone, Imola, Nürburgring GP and Hockenheim start references are snapped to mapped start/start-finish markers within 12 m, with nearest uniform track sample and original driving direction retained. Source markers and snap distances are recorded in tracks.json. Imola's distinct race start marker is used as the prototype's unified start/lap line. Spa's nearby marker is rejected as too far from the GP centreline. Spa, Monza, Suzuka, Interlagos and Montréal retain unverified source-order starts; no claim of a complete surveyed ten-circuit start-line audit is made.

In 0.3.1, `road-structures.json` additionally retains mapped Monaco tunnel way geometry (including Boulevard Louis II way 4230891). This OSM-derived geometry is also ODbL. Its authored road-height correction and the separately licensed Copernicus surface grid are documented in ELEVATION-NOTICE.md. Elevation regeneration no longer uses the former `profile_offset` mechanism; it samples geographic coordinates.

## 0.10 Monaco extension

`monaco-reference.json` contains a compact ODbL extract from the OSM public map API, including Fairmont and Hôtel de Paris multipolygon outer/inner rings. `scripts/monaco_reference.py` preserves courtyard voids and clips only protected road/pit margins, rather than rejecting whole landmarks. Three recovered landmarks produce 13 simple footprint parts; contemporary OSM building metadata updates nearby existing buildings. The source URL, IDs, date and exact processing are retained in `MONACO-REFERENCE-NOTICE.md`. These are modern locations for all eras at the user's explicit request. Photo-estimated heights and authored modular facade details are not surveyed architectural replicas.

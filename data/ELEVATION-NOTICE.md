# Geographic elevation data (0.3.1)

**0.9 local exception/update:** Eau Rouge/Raidillon now uses a geographically anchored, photo-guided modern climb and the same local kerbs/paved apron/barriers for all eras, explicitly requested by the user. 1967 and 2023 car silhouettes are revised with shared web/native meshes. These are authored approximations, not surveys or scans. See [PHOTO-REFERENCE-NOTICE.md](PHOTO-REFERENCE-NOTICE.md); the remaining historical-layout limitations below still apply.

Terrain and road elevation estimates are **produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.**

Dataset: Copernicus DEM GLO-30 Public, approximately 30 m digital **surface** model (buildings/vegetation included), AWS Cloud Optimized GeoTIFF distribution. Retrieved 8 November 2026.

- Official collection, licensing and required notices: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- Free & Open WorldDEM-30 user licence (within mission annex): https://s3.waw3-1.cloudferro.com/swift/v1/portal_uploads_prod/CSCDA_ESA_Mission-specific_Annex_31_Oct_22_latest.pdf
- AWS distribution description: https://copernicus-dem-30m.s3.amazonaws.com/readme.html
- Dataset DOI: https://doi.org/10.5270/ESA-c5d3d65

`elevation-dem.json` contains bounded original source-grid windows, source URLs, metre-space origins/pixel spacing and absolute elevations rounded to centimetres. Inverse geographic projection is documented in OSM-NOTICE.md. `scripts/import-elevation.py` fetches those windows using HTTP range reads; no complete global tiles, API key or runtime network requests are needed. This data is not covered by the game's MIT code licence. Retain the source notice and applicable Copernicus user-licence obligations when redistributing it or adaptations.

Processing: 3×3 spatial median and 0.65-pixel Gaussian filtering suppress isolated DSM artefacts; bilinear sampling at geographic circuit coordinates; periodic along-road Gaussian filtering over 30 m (45 m Monaco, 55 m Monza); elevations expressed relative to a local datum retained per track. This does **not** recover a surveyed bare-earth model from a DSM. Forest canopies/buildings and the 30 m resolution still limit accuracy. No laser-scanned kerbs, road camber or certified elevation-change figures are claimed.

Road structures are separate, explicit corrections, not terrain pixels: Monaco's mapped Boulevard Louis II tunnel (OSM way 4230891) is held near an **authored approximate 6 m sea-level road elevation**, with smooth portal approaches, instead of routing the road over the hotel/cliff seen by the DSM. Suzuka's geometric crossover retains an **authored 8 m clearance** on the geographically identified upper leg. These heights are not surveyed. The relevant OSM geometry in `road-structures.json` is © OpenStreetMap contributors, ODbL 1.0; see OSM-NOTICE.md.

Surrounding terrain uses the 2D geographic height field, blended to a broad road bed nearby so terrain does not cover the road. Coastlines are no longer flattened with arbitrary x/z cutoffs. Sea level is offset by the same geographic datum as the road. Montréal’s river level is estimated from the low, flat surface-elevation band (5th percentile of its source window), rather than incorrectly treating the river as sea-level ocean. Profiles are sampled from coordinates, not arbitrary lap fractions; rotating a start index must leave hills at the same world coordinates.

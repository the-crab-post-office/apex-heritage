# Satellite-photo terrain — Copernicus Sentinel-2

**Contains modified Copernicus Sentinel data 2025.**

**0.5 update:** these crops are retained as source/provenance for the vegetation guide only; they are no longer stretched onto the ground in either renderer. Detailed ground surfaces now use separately credited metre-scale CC0 material tiles (`MATERIALS-NOTICE.md`).

The ten JPEG images in `web/assets/imagery/` are georeferenced, true-colour crops of Sentinel-2 Level-2A observations distributed as Cloud-Optimized GeoTIFFs by Element 84 Earth Search / AWS. Original scene IDs, acquisition dates, COG URLs, local-metre crop bounds, native resolution and approximate vegetation masks are retained in the editable `data/imagery.json` manifest (web download: `/licenses/imagery.json`).

Official programme: https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2

Legal notice: https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice

EU law grants free, full and open access, including reproduction, distribution, adaptation and combination with other data, without warranties of quality or suitability. When distributing modified data retain the notice **“Contains modified Copernicus Sentinel data 2025”**, identify its source and indicate modifications. The data providers do not endorse this game.

Processing by APEX / HERITAGE: bounded HTTP-range COG reads; selection of low-cloud scenes in May–September 2025; reprojected to each circuit's local metre coordinates; bilinear resampling to 512×512; JPEG compression. `scripts/import-imagery.py` retains the import procedure. Dark-green photographic pixels provide a coarse vegetation-placement mask, not measured individual trees.

**Important limits:** source true-colour pixels are approximately **10 m**, sometimes resampled finer in the exported crop. These are real satellite photographs, **not** drone/trackside photogrammetry, laser scans, detailed road textures, facade textures, historical-period scenery, or road-height surveys. Heights still come from the existing approximate GLO-30 surface field and explicit road corrections. Building shapes remain mapped OSM footprints with simplified original facades. Ground imagery may show roads/facilities whose geometry differs slightly from the smoothed game layout.

The Monaco tunnel canopy/wall/columns are an original approximate reconstruction informed by the mapped tunnel extent in `data/road-structures.json` and the publicly viewable photo https://flickr.com/photos/gasheadsteve/3884456661 (Arrr!, reference only). That photograph/thumbnail is **not redistributed** or used as a game texture. Tunnel clearance and construction details are authored, not scanned or surveyed. A search for reusable complete racing-circuit LiDAR/photogrammetry did not establish a suitable licensed all-ten-circuit asset set; no commercial simulator track files were copied.

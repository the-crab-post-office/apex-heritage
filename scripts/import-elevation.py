#!/usr/bin/env python3
"""Read bounded GLO-30 COG windows, not full global tiles. Offline source snapshot.
Requires rasterio + numpy. No elevation API or network access at game runtime.
"""
import json,math
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import from_bounds
ROOT=Path(__file__).resolve().parent.parent
tracks=json.loads((ROOT/'data/tracks.json').read_text());out=[]
for t in tracks:
 o=t['origin'];lat0=o['latitude'];lon0=o['longitude'];scale=111320*math.cos(math.radians(lat0));la=math.floor(lat0);lo=math.floor(lon0)
 key=f'Copernicus_DSM_COG_10_{"N"if la>=0 else "S"}{abs(la):02}_00_{"E"if lo>=0 else "W"}{abs(lo):03}_00_DEM';url=f'https://copernicus-dem-30m.s3.amazonaws.com/{key}/{key}.tif'
 xs=[p[0]for p in t['points']];zs=[p[1]for p in t['points']];pad=480
 west=lon0+(min(xs)-pad)/scale;east=lon0+(max(xs)+pad)/scale;north=lat0-(min(zs)-pad)/111320;south=lat0-(max(zs)+pad)/111320
 with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_MAX_RETRY='2'):
  with rasterio.open(url)as src:
   window=from_bounds(west,south,east,north,src.transform).round_offsets().round_lengths();array=src.read(1,window=window)
   if not np.isfinite(array).all()or(array< -1000).any():raise ValueError(f'Missing DEM pixels: {t["id"]}')
   transform=src.window_transform(window);lon,lat=transform*(.5,.5)
   out.append({'id':t['id'],'source_url':url,'x0':round((lon-lon0)*scale,6),'z0':round(-(lat-lat0)*111320,6),'dx':round(transform.a*scale,6),'dz':round(-transform.e*111320,6),'nx':array.shape[1],'nz':array.shape[0],'altitudes':[round(float(v),2)for v in array.ravel()]})
 print(t['name'],array.shape,'range',round(float(array.min()),1),round(float(array.max()),1),flush=True)
result={'source':'Copernicus DEM GLO-30 Public, AWS COG distribution','resolution':'Approximately 30 m; digital SURFACE model, not surveyed road elevations','attribution':'© DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.','license':'https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model','retrieved':'2026-11-08','tracks':out}
(ROOT/'data/elevation-dem.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False))

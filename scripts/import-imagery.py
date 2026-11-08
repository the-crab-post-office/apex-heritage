#!/usr/bin/env python3
"""Bounded Sentinel-2 TRUE-COLOUR satellite crops, not invented photogrammetry.
Requires requests, rasterio, numpy, Pillow. No runtime network calls or API keys.
Source metadata + projection are retained; full 100 km tiles are never downloaded.
"""
import json,math,concurrent.futures
from pathlib import Path
import requests,numpy as np,rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'web/assets/imagery';OUT.mkdir(parents=True,exist_ok=True)
tracks=json.loads((ROOT/'data/tracks.json').read_text())
def fetch(t):
 o=t['origin'];lon=o['longitude'];lat=o['latitude'];xs=[p[0]for p in t['points']];zs=[p[1]for p in t['points']];pad=480
 x0=min(xs)-pad;x1=max(xs)+pad;z0=min(zs)-pad;z1=max(zs)+pad
 bbox=[lon+x0/(111320*math.cos(math.radians(lat))),lat-z1/111320,lon+x1/(111320*math.cos(math.radians(lat))),lat-z0/111320]
 response=requests.post('https://earth-search.aws.element84.com/v1/search',json={'collections':['sentinel-2-l2a'],'bbox':bbox,'datetime':'2025-05-01T00:00:00Z/2025-09-30T23:59:59Z','query':{'eo:cloud_cover':{'lt':10}},'limit':15},timeout=40);response.raise_for_status()
 features=sorted(response.json()['features'],key=lambda f:f['properties'].get('eo:cloud_cover',100))
 crs=f'+proj=eqc +lat_ts={lat} +lat_0={lat} +lon_0={lon} +a=6378236.421 +b=6378236.421 +units=m +no_defs'
 # Radius chosen so local map degrees equal the project's 111320 metres/degree.
 transform=from_bounds(x0,-z1,x1,-z0,512,512)
 best=None
 with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_MAX_RETRY='1',GDAL_HTTP_TIMEOUT='30'):
  for f in features[:6]:
   try:
    with rasterio.open(f['assets']['visual']['href'])as src:
     with WarpedVRT(src,crs=crs,transform=transform,width=512,height=512,resampling=Resampling.bilinear)as vrt:a=vrt.read([1,2,3])
    valid=np.mean(np.max(a,axis=0)>0);cloud=np.mean(np.min(a,axis=0)>220)
    if valid>.999 and (best is None or cloud<best[0]):best=(cloud,f,a)
    if best and best[0]<.002:break
   except Exception as e: print(t['id'],'candidate skipped',str(e)[:160],flush=True)
 if best is None:raise RuntimeError('No complete photographic crop: '+t['id'])
 cloud,f,a=best;image=Image.fromarray(np.moveaxis(a,0,2));name=t['id']+'.jpg';image.save(OUT/name,quality=88,optimize=True)
 thumb=np.asarray(image.resize((64,64),Image.Resampling.BILINEAR)).astype(float);r,g,b=np.moveaxis(thumb,2,0)
 # Dark green photographic pixels guide tree placement, not individual-tree scans.
 forest=((g>r*1.08)&(g>b*1.03)&(g<125)&(r<100))
 result={'id':t['id'],'file':name,'bounds':[x0,z0,x1,z1],'width':512,'height':512,'source_resolution_m':10,'scene':f['id'],'datetime':f['properties']['datetime'],'source_url':f['assets']['visual']['href'],'catalog_url':f'https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{f["id"]}','tile_cloud_cover_percent':f['properties'].get('eo:cloud_cover'),'bright_pixel_fraction':round(float(cloud),5),'forest_grid_size':64,'forest_mask':''.join('1'if x else'0'for x in forest.flat)}
 print(t['name'],f['id'],'cloud/bright',round(float(cloud),4),'forest',int(forest.sum()),flush=True);return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:results=list(pool.map(fetch,tracks))
manifest={'attribution':'Contains modified Copernicus Sentinel data 2025; processed by APEX / HERITAGE. COG distribution: Element 84 Earth Search / AWS.','license':'https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice','processing':'Georeferenced 10 m Sentinel-2 Level-2A true-colour COG crops; reprojected to local track metres, bilinear resampling, JPEG compression. Dark-green threshold is only an approximate vegetation guide. Not drone photography, photogrammetry, LiDAR, road surveys or historical-period imagery.','tracks':results}
(ROOT/'data/imagery.json').write_text(json.dumps(manifest,separators=(',',':'),ensure_ascii=False))

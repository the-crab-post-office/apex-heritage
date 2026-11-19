#!/usr/bin/env python3
"""Deterministic offline expansion builder. --geometry bootstraps DEM imports.
Existing ten circuits and their references are preserved byte-for-byte as JSON
records. Sources/limits: data/EXPANSION-NOTICE.md.
"""
import json,math,argparse
from pathlib import Path
import numpy as np
from shapely.geometry import LineString
R=Path(__file__).resolve().parents[1]
IDS=['ae-2009','nl-1948','az-2016']
def read(p):return json.loads((R/p).read_text())
def save(p,d):(R/p).write_text(json.dumps(d,separators=(',',':'),ensure_ascii=(p in ['data/tracks.json','data/corner-details.json'])))
def geometry():
 source=R/'data/expansion-map-source.json'
 maps=[s['map']for s in read('data/expansion-map-source.json')['tracks']]if source.exists()else[f for f in read('.map-import/f1-circuits.geojson')['features']if f['properties']['id']in IDS]
 tracks=[t for t in read('data/tracks.json')if t['id']not in IDS]
 for id in IDS:
  f=next(f for f in maps if f['properties']['id']==id);p=f['properties'];xy=np.array(f['geometry']['coordinates']);lon,lat=(xy.min(axis=0)+xy.max(axis=0))/2
  points=np.c_[(xy[:,0]-lon)*111320*math.cos(math.radians(lat)),-(xy[:,1]-lat)*111320]
  if np.linalg.norm(points[0]-points[-1])<1:points=points[:-1]
  # Corner-preserving Chaikin pass; much less rounding than the old tracks.
  # Preserve the first source start/finish coordinate during cyclic resampling.
  weight=.10 if id=='az-2016'else .20
  q=np.roll(points,-1,axis=0);smoothed=np.empty((len(points)*2,2));smoothed[::2]=(1-weight)*points+weight*q;smoothed[1::2]=weight*points+(1-weight)*q
  line=LineString([*smoothed,smoothed[0]]);n=math.ceil(line.length/5);start=line.project(__import__('shapely').geometry.Point(points[0]))
  if id=='nl-1948'and source.exists():
   marker=next(e for r in read('data/expansion-map-source.json')['tracks']if r['id']==id for e in r['elements']if e.get('tags',{}).get('raceway')=='finish')
   mp=[(marker['lon']-lon)*111320*math.cos(math.radians(lat)),-(marker['lat']-lat)*111320]
   start=line.project(__import__('shapely').geometry.Point(mp))
  pts=[list(line.interpolate((start+i*line.length/n)%line.length).coords[0])for i in range(n)]
  meta={
   'ae-2009':('Yas Marina','UNITED ARAB EMIRATES','AE',16,'desert','Abu Dhabi · racing around the marina.',14),
   'nl-1948':('Zandvoort','NETHERLANDS','NL',14,'dunes','Banked corners in the coastal dunes.',12),
   'az-2016':('Baku','AZERBAIJAN','AZ',20,'city','Old City walls meet the Caspian straight.',8)
  }[id]
  name,country,code,turns,biome,tagline,width=meta
  old=next((t for t in read('data/tracks.json')if t['id']==id),{})
  t=dict(id=id,name=name,country=country,code=code,turns=turns,biome=biome,tagline=tagline,length=p['length'],width=width,elevation=0,points=[[round(v,3)for v in a]for a in pts],origin=dict(longitude=float(lon),latitude=float(lat),metres_per_degree=111320),start_reference=(dict(status='snapped to mapped marker',osm_node=marker['id'],snap_distance=round(line.distance(__import__('shapely').geometry.Point(mp)),3))if id=='nl-1948'else dict(status='source order, unverified')),heights=[0]*n,ground_heights=[0]*n,layout_status='Modern layout for all cars; historical alignments are not reconstructed',layout_year=2021 if id!='az-2016'else 2016)
  # Preserve previously imported DEM until explicitly regenerated.
  if old.get('points')==t['points']:
   for k in ['heights','ground_heights','terrain','elevation','elevation_datum','sea_level','water_level','elevation_source','road_corrections','banking']: 
    if k in old:t[k]=old[k]
  tracks.append(t);print(name,n,'points',round(line.length),'m / official',p['length'],flush=True)
 save('data/tracks.json',tracks)
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--geometry',action='store_true');args=ap.parse_args();geometry()
 if not args.geometry:
  from expansion_context import build
  build(R)

#!/usr/bin/env python3
"""Import real OSM building ways (ODbL); no buildings invented for missing areas.
Requires: pip install shapely. python3 scripts/import-osm.py [--cached] [track-id ...]
Fetches bounded snapshots into ignored .map-import/, then exports compact footprints.
The checked-in derived database is sufficient to run web/native fully offline.
"""
import json,math,sys,time,re
from pathlib import Path
import urllib.request,urllib.parse
from shapely.geometry import Polygon,LineString
ROOT=Path(__file__).resolve().parent.parent
tracks=json.loads((ROOT/'data/tracks.json').read_text())
selected={v for v in sys.argv[1:]if not v.startswith('--')};cached='--cached'in sys.argv
headers={'User-Agent':'ApexHeritagePrototype/0.3 (offline educational map import; OSM attribution retained)'}
out=[]
for t in tracks:
 target=ROOT/'.map-import'/f"{t['id']}.json";o=t['origin'];cos=math.cos(math.radians(o['latitude']))
 def project(p):return [round((p['lon']-o['longitude'])*111320*cos,3),round(-(p['lat']-o['latitude'])*111320,3)]
 if not target.exists() and not cached and (not selected or t['id']in selected):
  lat=[o['latitude']-z/111320 for x,z in t['points']];lon=[o['longitude']+x/(111320*cos)for x,z in t['points']]
  q=f'[out:json][timeout:50];way["building"]({min(lat)-.0025:.6f},{min(lon)-.004:.6f},{max(lat)+.0025:.6f},{max(lon)+.004:.6f});out tags geom;'
  url='https://overpass-api.de/api/interpreter?'+urllib.parse.urlencode({'data':q})
  with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=75)as response:raw=response.read()
  obj=json.loads(raw)
  if obj.get('remark'):raise ValueError(obj['remark'])
  target.parent.mkdir(exist_ok=True,parents=True);target.write_bytes(raw);time.sleep(1)
 if not target.exists():raise FileNotFoundError(f'{target}: missing snapshot; refusing to replace with fictional buildings')
 data=json.loads(target.read_text());road=LineString(t['points']+[t['points'][0]]);corridor=road.buffer(t['width']/2+3.5);buildings=[];rejected=0
 for e in data['elements']:
  if e['type']!='way' or len(e.get('geometry',[]))<4:continue
  points=[project(p) for p in e['geometry']];poly=Polygon(points)
  if not poly.is_valid or poly.area<6 or poly.distance(road)>300:continue
  if poly.intersects(corridor):rejected+=1;continue
  tags=e.get('tags',{});h=8.;source='estimated default 8 m'
  def number(v):
   match=re.match(r'^\s*(\d+(?:\.\d+)?)',v or'');return float(match[1])if match else None
  height=number(tags.get('height'));levels=number(tags.get('building:levels'))
  if height: h=height;source='OSM height'
  elif levels:h=levels*3.;source='estimated from OSM levels at 3 m/floor'
  buildings.append({'osm_id':e['id'],'footprint':points[:-1]if points[0]==points[-1]else points,'height':round(max(3.,min(150.,h)),2),'height_source':source})
 out.append({'id':t['id'],'snapshot':data.get('osm3s',{}).get('timestamp_osm_base','unknown'),'rejected_road_overlap':rejected,'buildings':buildings})
 print(t['name'],len(buildings),'mapped footprints;',rejected,'road overlaps omitted')
db={'attribution':'© OpenStreetMap contributors','license':'https://opendatacommons.org/licenses/odbl/1-0/','source':'https://www.openstreetmap.org/copyright','processing':'Local metre projection; within 300 m of circuit; entire footprint outside road + 3.5 m. Heights estimated when not mapped. Building ways only, not multipolygon relations.','tracks':out}
s=json.dumps(db,separators=(',',':'),ensure_ascii=False)
for file in ['data/buildings.json','web/assets/buildings.json']:(ROOT/file).write_text(s)

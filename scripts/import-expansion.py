#!/usr/bin/env python3
"""Fetch bounded sources for the three 0.16 circuits. No runtime network dependency.
Raw downloads go to ignored .map-import; build-expansion.py consumes the retained
compact geographic source. Existing circuits are never reimported by this tool.
"""
import concurrent.futures,json,math,time,urllib.request,urllib.parse
from pathlib import Path
R=Path(__file__).resolve().parents[1];CACHE=R/'.map-import';CACHE.mkdir(exist_ok=True)
IDS=['ae-2009','nl-1948','az-2016']
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ApexHeritage/0.16 educational offline circuit prototype'}),timeout=150)as r:return r.read()
geo=CACHE/'f1-circuits.geojson'
if not geo.exists():geo.write_bytes(fetch('https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson'))
features=[next(f for f in json.loads(geo.read_text())['features']if f['properties']['id']==i)for i in IDS]
def osm(f):
 id=f['properties']['id'];p=CACHE/(id+'-context.json')
 if not p.exists():
  xy=f['geometry']['coordinates'];xs,ys=zip(*xy);bounds=f'{min(ys)-.003},{min(xs)-.005},{max(ys)+.003},{max(xs)+.005}'
  q=f'[out:json][timeout:100];(way[building]({bounds});way[highway=raceway]({bounds});way[barrier]({bounds});way[leisure=marina]({bounds});way[natural=water]({bounds});way[water]({bounds});way[historic]({bounds});way[building=grandstand]({bounds});node[raceway]({bounds}););out tags geom;'
  for host in ([]if id=='nl-1948'else ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']):
   try:
    b=fetch(host+'?'+urllib.parse.urlencode({'data':q}));d=json.loads(b)
    if d.get('remark'):raise ValueError(d['remark'])
    p.write_bytes(b);break
   except Exception as e:print(id,'OSM retry',type(e).__name__,str(e)[:100],flush=True)
  else:
   # Core OSM API is a bounded fallback when Overpass is overloaded.
   import xml.etree.ElementTree as ET
   xml=fetch('https://api.openstreetmap.org/api/0.6/map?'+urllib.parse.urlencode({'bbox':f'{min(xs)-.005},{min(ys)-.003},{max(xs)+.005},{max(ys)+.003}'}))
   root=ET.fromstring(xml);nodes={n.attrib['id']:n for n in root.findall('node')};elements=[]
   tags=lambda n:{t.attrib['k']:t.attrib['v']for t in n.findall('tag')}
   for w in root.findall('way'):
    tt=tags(w)
    if not any(k in tt for k in ['building','barrier','historic','water'])and tt.get('highway')!='raceway'and tt.get('natural')!='water'and tt.get('leisure')!='marina':continue
    refs=[n.attrib['ref']for n in w.findall('nd')]
    if not all(i in nodes for i in refs):continue
    elements.append(dict(type='way',id=int(w.attrib['id']),tags=tt,geometry=[dict(lon=float(nodes[i].attrib['lon']),lat=float(nodes[i].attrib['lat']))for i in refs]))
   for n in nodes.values():
    tt=tags(n)
    if 'raceway'in tt:elements.append(dict(type='node',id=int(n.attrib['id']),lat=float(n.attrib['lat']),lon=float(n.attrib['lon']),tags=tt))
   p.write_text(json.dumps({'osm3s':{'timestamp_osm_base':root.find('meta').attrib.get('osm_base')if root.find('meta')is not None else'unknown'},'elements':elements}))
 d=json.loads(p.read_text());print(id,'OSM',len(d['elements']),flush=True)
 return {'id':id,'map':f,'osm_timestamp':d.get('osm3s',{}).get('timestamp_osm_base'),'elements':d['elements']}
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:out=list(pool.map(osm,features))
supplement=R/'data/expansion-hotel-source.json'
if supplement.exists():
 extra=json.loads(supplement.read_text())['elements'];known={e['id']for e in out[0]['elements']}
 for e in extra:
  if e['id']not in known:out[0]['elements'].append(e);known.add(e['id'])
(R/'data/expansion-map-source.json').write_text(json.dumps({'source':'MIT bacinger/f1-circuits + © OpenStreetMap contributors ODbL 1.0; bounded snapshots','map_url':'https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson','tracks':out},separators=(',',':')))

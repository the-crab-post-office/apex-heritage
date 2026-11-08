#!/usr/bin/env python3
"""Deterministic authored safety furniture, NOT surveyed circuit facilities.
Exact planar exclusion against the full race loop, open mapped pit and OSM
buildings. All dimensions/positions are original prototype approximations.
"""
import json,math
from pathlib import Path
from shapely.geometry import LineString,Polygon,Point
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
tracks=json.loads((ROOT/'data/tracks.json').read_text());pits=json.loads((ROOT/'data/pit-lanes.json').read_text())['tracks'];buildings=json.loads((ROOT/'data/buildings.json').read_text())['tracks'];output=[]
def rect(x,z,yaw,w,d):
 return [[round(x+a*math.cos(yaw)+b*math.sin(yaw),3),round(z-a*math.sin(yaw)+b*math.cos(yaw),3)]for a,b in [(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2)]]
for t,pit,layer in zip(tracks,pits,buildings):
 p=t['points'];n=len(p);road=LineString(p+[p[0]]).buffer(t['width']/2+3.5);lane=LineString([(a[0],a[2])for a in pit['points']]).buffer(pit['width']/2+3.5)
 built=unary_union([Polygon(b['footprint']).buffer(1)for b in layer['buildings']]);protected=unary_union([road,lane,built]);barriers=[];stands=[];tyre_segments=0
 tunnel=set()
 for c in t.get('road_corrections',[]):
  if c['type']=='tunnel':tunnel.update(range(c['start_index'],c['end_index']))
 def section(i,side,offset):
  a=p[(i-1)%n];b=p[(i+1)%n];dx=b[0]-a[0];dz=b[1]-a[1];l=math.hypot(dx,dz);return [p[i][0]+dz/l*side*offset,p[i][1]-dx/l*side*offset]
 for i in range(0,n,5):
  if any((i+j)%n in tunnel for j in range(6)):continue
  j=(i+5)%n;v=[p[i][0]-p[(i-5)%n][0],p[i][1]-p[(i-5)%n][1]];w=[p[j][0]-p[i][0],p[j][1]-p[i][1]];bend=abs(math.atan2(v[0]*w[1]-v[1]*w[0],v[0]*w[0]+v[1]*w[1]))
  for side in [-1,1]:
   kind='tyres'if bend>.15 and tyre_segments<18 and(i//5)%2==0 else 'concrete'if t['code']=='MC'or bend>.22 else 'armco'
   offset=t['width']/2+(10 if kind=='tyres'else 5.4 if t['code']=='MC'else 7)
   a,b=section(i,side,offset),section(j,side,offset);radius=.52 if kind=='tyres'else .27
   shape=LineString([a,b]).buffer(radius+.15)
   if shape.intersects(protected):continue
   barriers.append({'index':i,'a':[round(v,3)for v in a],'b':[round(v,3)for v in b],'radius':radius,'height':1.18 if kind=='tyres'else 1.25 if kind=='concrete'else .95,'kind':kind,'fence':kind!='tyres'and(i//5)%3!=0})
   if kind=='tyres':tyre_segments+=1
 # Search complete route, not just start-relative boxes; favour known viewing
 # areas without claiming these authored stands are actual real-world stands.
 for fraction in [.015,.13,.30,.48,.66,.84,.95]:
  found=False
  for shift in [0,5,-5,12,-12,24,-24]:
   i=(int(fraction*n)+shift)%n;a=p[i];b=p[(i+2)%n];yaw=math.atan2(b[0]-a[0],b[1]-a[1]);normal=[math.cos(yaw),-math.sin(yaw)]
   for offset in [28,42,60,85]:
    for side in [1,-1]:
     x=a[0]+normal[0]*side*(t['width']/2+offset);z=a[1]+normal[1]*side*(t['width']/2+offset)
     # local +Z is toward the circuit: bleachers rise toward local -Z.
     syaw=yaw+(-math.pi/2 if side>0 else math.pi/2)
     footprint=rect(x,z,syaw,32,17);poly=Polygon(footprint)
     if poly.intersects(protected)or any(poly.distance(Polygon(s['footprint']))<25 for s in stands):continue
     stands.append({'index':i,'x':round(x,3),'z':round(z,3),'yaw':round(syaw,6),'width':32,'depth':17,'rows':9,'roof':len(stands)%3!=2,'footprint':footprint});found=True;break
    if found:break
   if found:break
  if len(stands)>=6:break
 output.append({'id':t['id'],'name':t['name'],'barriers':barriers,'grandstands':stands})
 print(t['name'],len(barriers),'safety sections;',tyre_segments,'tyre sections;',len(stands),'grandstands')
 assert len(stands)>=3 and len(barriers)>50 and tyre_segments>0
(ROOT/'data/venue.json').write_text(json.dumps({'source':'Original authored prototype trackside furniture; NOT mapped/surveyed facilities. Placement excludes race road +3.5m, open pit lane +3.5m, and mapped building footprints.','tracks':output},separators=(',',':')))

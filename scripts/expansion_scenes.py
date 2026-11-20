"""Original landmark geometry from retained mapped outlines and inspected photos.
No photographic texture pixels. Simplified hotel shell/walkway and castle wall,
not exact architectural replicas. Water outlines are coarse satellite-guided
traces, not cadastral coastlines or surveys.
"""
import json,math
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
from shapely import constrained_delaunay_triangles
from expansion_context import project,nearest,section

def append_scenes(R,tracks,scenes):
 source=json.loads((R/'data/expansion-map-source.json').read_text())['tracks'];images=json.loads((R/'data/imagery.json').read_text())['tracks'];pits=json.loads((R/'data/pit-lanes.json').read_text())['tracks']
 def quad(s,p,color,tag):
  for a,b,c in [(0,1,2),(0,2,3)]:s['facets'].append(dict(p=[[round(v,4)for v in p[i]]for i in[a,b,c]],color=color,tag=tag))
 def flat(s,poly,y,color,tag):
  for part in getattr(poly,'geoms',[poly]):
   if part.geom_type!='Polygon':continue
   for q in constrained_delaunay_triangles(part).geoms:s['facets'].append(dict(p=[[round(x,4),round(y,4),round(z,4)]for x,z in list(q.exterior.coords)[:3]],color=color,tag=tag))
 def extrude(s,poly,lo,hi,color,tag):
  for part in getattr(poly,'geoms',[poly]):
   if part.geom_type!='Polygon':continue
   part=orient(part,sign=1);flat(s,part,hi,color,tag)
   for ring in [part.exterior,*part.interiors]:
    xy=list(ring.coords)
    for a,b in zip(xy,xy[1:]):quad(s,[[a[0],lo,a[1]],[b[0],lo,b[1]],[b[0],hi,b[1]],[a[0],hi,a[1]]],color,tag)
 def beam(s,a,b,r,color,tag):
  dx,dz=b[0]-a[0],b[2]-a[2];ll=math.hypot(dx,dz)or 1;nx,nz=dz/ll*r,-dx/ll*r
  quad(s,[[a[0]-nx,a[1]-.05,a[2]-nz],[b[0]-nx,b[1]-.05,b[2]-nz],[b[0]+nx,b[1]+.05,b[2]+nz],[a[0]+nx,a[1]+.05,a[2]+nz]],color,tag)
 for t in tracks[-3:]:
  id=t['id'];src=next(s for s in source if s['id']==id);s=dict(track=t['name'],eras=[0,1,2,3,4,5],facets=[],objects=[],scope='Modern scenery for all cars. Original map/photo-guided estimates; no historical reconstruction.');scenes.append(s)
  road=LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+2);pit=next(p for p in pits if p['id']==id);pitpoly=LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+1);protected=unary_union([road,pitpoly])
  if id in ['ae-2009','az-2016']:
   # Coarse water boundaries traced in the retained georeferenced Sentinel crop.
   # All road/pit projections excluded even where the image is ambiguous.
   image=next(a for a in images if a['id']==id);x0,z0,x1,z1=image['bounds']
   pixels=([(290,286),(311,291),(321,309),(323,343),(331,355),(367,354),(372,342),(368,305),(356,278),(350,231),(367,219),(392,235),(392,295),(421,341),(433,388),(439,512),(359,512),(342,442),(326,390),(290,354)]if id=='ae-2009'else[(512,224),(457,244),(420,262),(369,279),(320,300),(275,326),(237,350),(191,394),(165,445),(155,512),(512,512)])
   water=Polygon([(x0+x/512*(x1-x0),z0+y/512*(z1-z0))for x,y in pixels]).buffer(0).difference(protected)
   flat(s,water,t['water_level'],'#328d94'if id=='ae-2009'else'#447d86','water')
  if id=='ae-2009':
   for wayid in [520940413,1228229328]:
    e=next(e for e in src['elements']if e['id']==wayid);poly=Polygon([project(t,p)for p in e['geometry']]).buffer(0);centre=poly.centroid;ii=nearest(t,[centre.x,centre.y]);base=t['heights'][ii];height=float(e['tags']['height']);clearpoly=poly.difference(protected)
    extrude(s,clearpoly,base,base+height-9,'#385963','yas-hotel-facade')
    rect=list(poly.minimum_rotated_rectangle.exterior.coords)[:4];a,b,c=rect[:3];ll=math.dist(a,b);dd=math.dist(b,c)
    if ll<dd:a,b,c=b,c,rect[3];ll,dd=dd,ll
    ux,uz=(b[0]-a[0])/ll,(b[1]-a[1])/ll;vx,vz=-uz,ux
    # Domed gridded skin over the two mapped wings; dark glass bands beneath.
    def shell(u,v):
     return[centre.x+ux*ll*.55*u+vx*dd*.6*math.sin(v),base+height-10+11*max(0,1-u*u)**.5*math.cos(v),centre.y+uz*ll*.55*u+vz*dd*.6*math.sin(v)]
    for j in range(20):
     u=-1+j/10;v=u+.1
     for k in range(12):
      aa=-math.pi/2+k*math.pi/12;bb=aa+math.pi/12;pp=[shell(u,aa),shell(v,aa),shell(v,bb),shell(u,bb)]
      panel=[[v*.88+sum(p[axis]for p in pp)/4*.12 for axis,v in enumerate(q)]for q in pp];quad(s,panel,'#9aafb6'if(j+k)%2 else'#c2d0d0','yas-hotel-shell');beam(s,pp[0],pp[2],.13,'#edf0e8','yas-hotel-lattice');beam(s,pp[1],pp[3],.13,'#edf0e8','yas-hotel-lattice')
    for level in range(2,int(height-9),3):
     band=poly.buffer(.025).difference(poly.buffer(-.24));extrude(s,band,base+level,base+level+.6,'#e6e8dd','yas-hotel-balconies')
    s['objects'].append(dict(name=e['tags'].get('name'),osm_way=wayid,height=height))
   walkway=next(e for e in src['elements']if e['id']==1387292013);poly=Polygon([project(t,p)for p in walkway['geometry']]).buffer(0);ii=nearest(t,[poly.centroid.x,poly.centroid.y]);floor=max(t['heights'][i]for i in range(max(0,ii-8),min(len(t['heights']),ii+9)))+9
   extrude(s,poly,floor,floor+8,'#526f7c','yas-hotel-walkway');
   for level in [0,1.2,6.7,7.8]:extrude(s,poly.buffer(.04).difference(poly.buffer(-.18)),floor+level,floor+level+.18,'#d8e0dc','yas-hotel-bridge-frames');
   flat(s,poly,floor,'#7e9093','yas-hotel-walkway-floor');s['clearance']=dict(minimum=9.,kind='estimated connecting walkway floor above local road')
   # T1 pit exit is a mapped underground route. A modest explicit bridge/portal
   # cue makes that role legible; the actual main road remains above the lane.
   for tag in ['YAS MARINA','ABU DHABI']:s['objects'].append(dict(name=tag,source='original scene cue, not sponsor signage'))
  if id=='az-2016':
   # Thin crenellated wall footprint at the actual T8/T9 corridor. The
   # separately tagged city_wall way 299450006 is the palace wall 388 m away.
   e=next(e for e in src['elements']if e['id']==1502989778);xy=[project(t,p)for p in e['geometry']]
   for a,b in zip(xy,xy[1:]):
    line=LineString([a,b]);poly=line.buffer(1.3,cap_style=2).difference(protected);mid=line.interpolate(.5,normalized=True);i=nearest(t,[mid.x,mid.y]);base=t['heights'][i]-1
    extrude(s,poly,base,base+9.5,'#b9a47e','castle-wall')
    for d in range(0,int(line.length),4):
     p=line.interpolate(d);merlon=Point(p.x,p.y).buffer(.85,quad_segs=1).difference(protected);extrude(s,merlon,base+9.5,base+11,'#c4b08b','castle-crenellations')
   candidates=[p for p in xy if Point(p).distance(road)>6.5];target=t['points'][527];centre=min(candidates,key=lambda p:math.dist(p,target));base=t['heights'][nearest(t,centre)]-1
   poly=Point(centre).buffer(4.8,quad_segs=8).difference(protected);extrude(s,poly,base,base+15,'#bca780','castle-turret')
   for j in range(12):
    a=j/12*math.tau;p=Point(centre[0]+math.cos(a)*4.3,centre[1]+math.sin(a)*4.3).buffer(.8,quad_segs=1).difference(protected);extrude(s,p,base+15,base+16.5,'#c7b48f','castle-turret-merlons')
   s['objects'].append(dict(name='Old City wall / castle corridor',osm_way=e['id'],source='mapped wall; height/turret/crenellation dimensions estimated from photos'))
  # Original starting boxes, grounded at the same banked road point as tyres.
  for k in range(10):
   i=(len(t['points'])-8-k*3)%len(t['points']);off=(-1 if k%2 else 1)*t['width']*.24
   lo,hi=off-1.1,off+1.1
   def mark(row,lateral):
    q=section(t,row,lateral);return [q[0],t['heights'][row]+lateral*t.get('banking',[0]*len(t['points']))[row]+.09,q[1]]
   for left,right in [(lo,lo+.12),(hi-.12,hi)]:quad(s,[mark(i,left),mark(i+1,left),mark(i+1,right),mark(i,right)],'#e2e2d6','grid-paint')
   a,b,c=mark(i,lo),mark(i,hi),mark(i+1,lo);delta=[(c[k]-a[k])*.024 for k in range(3)]
   quad(s,[a,b,[b[k]+delta[k]for k in range(3)],[a[k]+delta[k]for k in range(3)]],'#e2e2d6','grid-paint')

"""Offline map/photo-guided scenery for the three modern expansion circuits."""
import json,math,copy,re
import numpy as np
from shapely.geometry import Polygon,LineString,Point
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles
IDS=['ae-2009','nl-1948','az-2016']
PIT_IDS={'ae-2009':[176695254,176695255,176695253],'nl-1948':[38144527],'az-2016':[1513267145]}
# Individually authored corner station windows, based on the retained map and
# inspected photographs. Not a repeated automatic curvature decoration.
CORNERS={
'ae-2009': [('Turn 1',49,76,1,28),('Turns 2–3',126,155,-1,18),('North hairpin T5',251,286,-1,40),('Turn 6',483,501,-1,32),('Turn 7',510,528,1,22),('Marsa T9',695,747,-1,36),('Turn 10',798,819,1,14),('Hotel T11',836,854,-1,14),('Hotel T12',862,880,1,12),('Hotel T13',899,920,1,12),('Turn 14',956,977,-1,14),('Turn 15',995,1013,1,15)],
'nl-1948':[('Tarzan T1',61,91,1,30),('Gerlach T2',130,150,1,15),('Hugenholtz T3',151,181,-1,13),('Hunserug',206,228,1,15),('Scheivlak',309,363,1,27),('Masters',411,455,1,20),('Turn 9',464,489,-1,23),('Turn 10',497,533,1,23),('Hans Ernst left',600,618,-1,15),('Hans Ernst right',619,640,1,15),('Turn 13',704,735,1,14),('Arie Luyendyk T14',748,815,1,18)],
'az-2016':[('Turn 1',35,46,-1,20),('Turn 2',116,128,-1,18),('Turn 3',280,293,-1,14),('Turn 4',327,341,1,12),('Turn 5',370,382,-1,12),('Turn 6',400,413,-1,10),('Turn 7',478,491,1,10),('Castle T8',519,529,1,0),('Castle T9',530,540,-1,0),('Castle T10',548,558,1,0),('Castle T11',566,576,-1,0),('Turn 12',603,616,-1,10),('Turn 15',725,742,-1,18),('Turn 16',785,799,-1,20)]}
URLS={'ae-2009':'https://driven-international.com/yas-marina-circuit-redesign','nl-1948':'https://studiodromo.it/portfolio/zandvoort/','az-2016':'https://www.redbull.com/in-en/baku-city-circuit-formula-racing-jehan-daruvala'}
def load(R,p):return json.loads((R/p).read_text())
def save(R,p,d):(R/p).write_text(json.dumps(d,separators=(',',':'),ensure_ascii=(p in ['data/tracks.json','data/corner-details.json'])))
def project(t,p):
 o=t['origin'];return [(p['lon']-o['longitude'])*111320*math.cos(math.radians(o['latitude'])),-(p['lat']-o['latitude'])*111320]
def nearest(t,p):return int(np.argmin(np.sum((np.asarray(t['points'])-p)**2,axis=1)))
def section(t,i,off):
 n=len(t['points']);a,b=t['points'][(i-1)%n],t['points'][(i+1)%n];dx,dz=b[0]-a[0],b[1]-a[1];ll=math.hypot(dx,dz)
 return [t['points'][i][0]+dz/ll*off,t['points'][i][1]-dx/ll*off]
def banks(t):
 n=len(t['points']);bank=[0.]*n
 windows=([(150,163,172,185,-math.tan(math.radians(18))), (744,766,799,825,math.tan(math.radians(18)))]if t['id']=='nl-1948'else [(685,702,739,757,-.05)]if t['id']=='ae-2009'else [])
 for a,b,c,d,slope in windows:
  for i in range(a,d+1):
   f=min(1,(i-a)/max(1,b-a),(d-i)/max(1,d-c));f=f*f*(3-2*f);bank[i]=round(slope*f,6)
 t['banking']=bank

def pit_record(t,source):
 coords=[];tunnels=[];walked=0.;ids=PIT_IDS[t['id']]
 for id in ids:
  way=next(e for e in source['elements']if e['id']==id);xy=[project(t,p)for p in way['geometry']]
  if coords and math.dist(coords[-1],xy[-1])<math.dist(coords[-1],xy[0]):xy.reverse()
  if coords:assert math.dist(coords[-1],xy[0])<2,(id,'unmapped pit connector')
  size=LineString(xy).length
  if way.get('tags',{}).get('tunnel')=='yes':tunnels.append([walked,walked+size])
  walked+=size;coords+=xy if not coords else xy[1:]
 entry,exit=nearest(t,coords[0]),nearest(t,coords[-1]);n=len(t['points']);span=(exit-entry)%n;assert 0<span<n/2
 coords[0]=t['points'][entry];coords[-1]=t['points'][exit];line=LineString(coords);ds=np.linspace(0,line.length,math.ceil(line.length/5)+1);points=[list(line.interpolate(float(d)).coords[0])for d in ds]
 indices=[];last=0
 for p in points:
  candidates=[(entry+j)%n for j in range(last,span+1)];k=int(np.argmin([math.dist(t['points'][i],p)for i in candidates]));last+=k;indices.append((entry+last)%n)
 heights=[t['heights'][i]for i in indices]
 # Smooth the registered lane elevations without DSM building/bridge spikes.
 from scipy.ndimage import gaussian_filter1d
 heights=gaussian_filter1d(heights,3,mode='nearest')
 if tunnels:
  for a,b in tunnels:
   for j,d in enumerate(ds):
    f=min(1,max(0,(d-a+35)/35),max(0,(b+35-d)/35));f=f*f*(3-2*f);heights[j]-=5.*f
 for j,d in enumerate(ds):
  heights[j]+=(t['heights'][entry]-heights[0])*max(0,1-d/35)
 end=t['heights'][exit]-heights[-1];heights+=end*np.maximum(0,1-(ds[-1]-ds)/35)
 heights[0]=t['heights'][entry];heights[-1]=t['heights'][exit]
 return dict(id=t['id'],name=t['name'],points=[[round(p[0],3),round(float(h),3),round(p[1],3)]for p,h in zip(points,heights)],track_indices=indices,entry_index=entry,exit_index=exit,box_distance=round(float(line.length*.39),3),length=round(line.length,3),width=6.,limit=80/3.6,osm_way_ids=ids,source='OSM mapped current pit-lane ways; projected/resampled; endpoint registration; estimated width/service-box/heights'+('; Yas tunnel lowered 5 m, approximate ramps, not a survey'if tunnels else''),registered_points=0,tunnel_ranges=tunnels)

def buildings(t,source):
 road=LineString(t['points']+[t['points'][0]]);mask=road.buffer(t['width']/2+3.5);out=[];rejected=0
 for e in source['elements']:
  tags=e.get('tags',{});xy=[project(t,p)for p in e.get('geometry',[])]
  if 'building'not in tags or len(xy)<4 or xy[0]!=xy[-1]or tags.get('parent_relation'):continue
  poly=Polygon(xy)
  if not poly.is_valid or poly.area<6 or poly.distance(road)>300:continue
  if poly.intersects(mask):rejected+=1;continue
  try:h=float(re.search(r'\d+(?:\.\d+)?',tags.get('height','')).group());hs='OSM height'
  except (ValueError,AttributeError):h=float(tags.get('building:levels',3))*3;hs='estimated from OSM levels at 3 m/floor'if'building:levels'in tags else'estimated default 9 m'
  out.append(dict(osm_id=e['id'],footprint=[[round(v,3)for v in p]for p in xy[:-1]],height=round(max(3,min(150,h)),2),height_source=hs,name=tags.get('name:en',tags.get('name',''))))
 return dict(id=t['id'],snapshot=source['osm_timestamp'],rejected_road_overlap=rejected,buildings=out)

def detail_record(t,pit,build,source):
 id=t['id'];pts=t['points'];n=len(pts);w=t['width']/2;line=LineString(pts+[pts[0]]);road=line.buffer(w+.15);pitpoly=LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+.65);protected=unary_union([road,pitpoly]);building=unary_union([Polygon(b['footprint'])for b in build['buildings']]);exclude=unary_union([protected.buffer(.2),building.buffer(.5)])
 kerbs=[];runoffs=[];used=Polygon();barriers=[];stands=[]
 barrier_protected=protected.buffer(1.1);barrier_buildings=building.buffer(.3)
 def add_runoff(poly,kind,name,i):
  nonlocal used
  poly=poly.buffer(0).difference(exclude).difference(used)
  for part in getattr(poly,'geoms',[poly]):
   if part.geom_type!='Polygon'or part.area<1:continue
   triangles=[[[round(x,3),round(z,3)]for x,z in list(q.exterior.coords)[:3]]for q in constrained_delaunay_triangles(part).geoms]
   if triangles:runoffs.append(dict(name=name,index=i,kind=kind,follow_road=True,triangles=triangles,evidence='photo-guided original extent; authored estimates; not surveyed'))
  used=unary_union([used,poly])
 for j,(name,a,b,side,depth)in enumerate(CORNERS[id]):
  inside=-side;width=[.95,1.15,1.35][j%3]
  for label,start,end,s,ww in [('apex',a,b,inside,width),('exit',(a+b)//2,min(n-1,b+7),side,width*.85)]:
   kerbs.append(dict(name=name+' '+label,start_index=start,end_index=end,side=s,width=round(ww,3),height=.045 if id!='nl-1948'else .055,shape='ramp',color_a='#bc302a',color_b='#efece2',stripe_length=1.4,source='inspected photos and mapped corner; cross-section/extent estimates'))
  # Turquoise continuous paved edge / short green edge precedes gravel.
  for s in ([]if id=='az-2016'and depth==0 else [-1,1]):
   inn=[section(t,i,s*(w+1.5))for i in range(a,b+1)];out=[section(t,i,s*(w+3.8))for i in range(a,b+1)]
   add_runoff(Polygon(inn+out[::-1]),'turquoise_paint'if id=='ae-2009'else'green_paint',name+' painted margin',(a+b)//2)
  if not depth:continue
  inn=[section(t,i,side*(w+3.9))for i in range(a,b+1)];out=[section(t,i,side*(w+3.9+depth*max(0,math.sin(math.pi*(i-a)/(b-a)))**.5))for i in range(a,b+1)]
  add_runoff(Polygon(inn+out[::-1]),'asphalt'if id!='nl-1948'else'gravel',name+' outer escape',(a+b)//2)
 # Compact city circuit: barriers define the corridor, dunes have more room.
 for side in [-1,1]:
  for i in range(n):
   j=(i+1)%n;off=w+(2.7 if id=='az-2016'else 10 if id=='nl-1948'else 15)
   if id=='nl-1948'and 20<i<145:off=w+7
   if any(a-6<=i<=b+9 and side==s and depth for _,a,b,s,depth in CORNERS[id]):off+=max(d for _,a,b,s,d in CORNERS[id]if a-6<=i<=b+9 and side==s)
   a,b=section(t,i,side*off),section(t,j,side*off)
   seg=LineString([a,b]);capsule=seg.buffer(.35)
   if capsule.intersects(barrier_protected)or capsule.intersects(barrier_buildings):continue
   barriers.append(dict(index=i,a=[round(v,3)for v in a],b=[round(v,3)for v in b],radius=.3,height=1.15,kind='concrete'if id=='az-2016'or i<180 or i>n-90 else'armco',fence=True,osm_id=0,evidence='photo-guided original racing barrier; estimated offset, not mapped individual panels'))
 def stand(poly,osm,name,roof=True):
  rect=poly.minimum_rotated_rectangle
  if rect.area<35 or rect.intersects(exclude):return
  corners=list(rect.exterior.coords)[:-1];a,b=corners[0],corners[1];ww=math.dist(a,b);dd=math.dist(b,corners[2])
  if ww<dd:a,b=corners[1],corners[2];ww,dd=dd,ww
  if dd>70:return
  x,z=rect.centroid.x,rect.centroid.y;i=nearest(t,[x,z]);yaw=math.atan2(b[1]-a[1],-(b[0]-a[0]))
  if math.sin(yaw)*(pts[i][0]-x)+math.cos(yaw)*(pts[i][1]-z)<0:yaw+=math.pi
  stands.append(dict(index=i,x=round(x,3),z=round(z,3),yaw=round(yaw,6),width=round(ww,3),depth=round(dd,3),rows=max(3,min(24,round(dd/1.7))),roof=roof,footprint=[[round(v,3)for v in p]for p in corners],osm_id=osm,name=name,evidence='mapped OSM rectangle'if osm else'photo-guided temporary grandstand; authored position/extent, not a surveyed footprint'))
 for e in source['elements']:
  if e.get('tags',{}).get('building')!='grandstand':continue
  p=Polygon([project(t,q)for q in e['geometry']]).buffer(0)
  if p.area>0:stand(p,e['id'],e['tags'].get('name','Mapped grandstand'))
 # Fill temporary event facilities from the inspected photo contexts, never
 # label them as OSM footprints or assume they existed in earlier decades.
 targets={'ae-2009':[(272,1,95,65,18),(720,1,85,65,18),(23,1,60,65,18)],'nl-1948':[(78,1,73,65,18),(166,-1,60,45,14),(782,1,57,65,18)],'az-2016':[(7,-1,68,70,18),(1148,-1,67,70,18),(790,1,55,45,15)]}[id]
 for i,side,off,ww,dd in targets:
  centre=section(t,i,side*off);a=section(t,i,0);b=section(t,(i+1)%n,0);dx,dz=b[0]-a[0],b[1]-a[1];ll=math.hypot(dx,dz);u=np.array([dx/ll,dz/ll]);v=np.array([-u[1],u[0]]);c=np.array(centre);poly=Polygon([c+u*x*ww/2+v*y*dd/2 for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)]]);stand(poly,0,'Photo-guided event viewing stand')
 profiles=[]
 for year in [1967,1988,2004,2023]:
  profiles.append(dict(year=year,label=f'{year} car · modern-layout substitute',geometry_status='modern-layout substitute',notes='Modern circuit layout and facilities for every car; historical alignments are not reconstructed. '+('Post-2021 Yas Marina layout.'if id=='ae-2009'else'2020 banked Zandvoort layout.'if id=='nl-1948'else'Baku opened in 2016. Constant 8 m playable road is narrower than the real straights; variable surveyed widths are not available.'),kerbs=copy.deepcopy(kerbs),runoffs=copy.deepcopy(runoffs)))
 return dict(id=id,name=t['name'],inspected_photo=dict(url=URLS[id],image_date='See expansion reference manifest; dates vary'),photo=dict(url=URLS[id],year=2021 if id=='ae-2009'else 2020 if id=='nl-1948'else None,observations='Modern photo-guided corner details; no copied photo textures',redistributed=False),history_url='https://www.racingcircuits.info/',grandstands=stands,barriers=barriers,profiles=profiles)

def append_details(tracks,output,R=None):
 from pathlib import Path
 R=R or Path(__file__).resolve().parents[1]
 sources=load(R,'data/expansion-map-source.json')['tracks'];pits=load(R,'data/pit-lanes.json')['tracks'];bs=load(R,'data/buildings.json')['tracks']
 for t in tracks:
  if t['id']in IDS:output.append(detail_record(t,next(p for p in pits if p['id']==t['id']),next(b for b in bs if b['id']==t['id']),next(s for s in sources if s['id']==t['id'])))

def build(R):
 tracks=load(R,'data/tracks.json');sources=load(R,'data/expansion-map-source.json')['tracks'];pits=load(R,'data/pit-lanes.json');bs=load(R,'data/buildings.json');venues=load(R,'data/venue-osm.json');details=load(R,'data/corner-details.json');markers=load(R,'data/start-markers.json');rawpits=load(R,'data/pit-lanes-osm.json')
 for db in [pits,bs,venues,details,rawpits]:db['tracks']=[r for r in db['tracks']if r['id']not in IDS]
 for t in tracks:
  if t['id']not in IDS:continue
  src=next(r for r in sources if r['id']==t['id']);
  rawpits['tracks'].append(dict(id=t['id'],source='data/expansion-map-source.json; © OpenStreetMap contributors, ODbL',snapshot=src['osm_timestamp'],ways=[dict(id=e['id'],coordinates=[[p['lon'],p['lat']]for p in e['geometry']],tags=e.get('tags',{}))for e in src['elements']if e['id']in PIT_IDS[t['id']]]))
  banks(t);p=pit_record(t,src);b=buildings(t,src);pits['tracks'].append(p);bs['tracks'].append(b);details['tracks'].append(detail_record(t,p,b,src))
  features=[]
  for e in src['elements']:
   tags=e.get('tags',{});kind='grandstand'if tags.get('building')=='grandstand'else'barrier'if'barrier'in tags else None
   if kind:features.append(dict(type=kind,osm_id=e['id'],tags=tags,coordinates=[[q['lon'],q['lat']]for q in e.get('geometry',[])]))
  venues['tracks'].append(dict(id=t['id'],features=features,snapshot=src['osm_timestamp']));markers[t['id']]=[e for e in src['elements']if e['type']=='node'and'raceway'in e.get('tags',{})]
  print(t['name'],len(b['buildings']),'mapped buildings;',len(details['tracks'][-1]['barriers']),'walls;',len(details['tracks'][-1]['grandstands']),'stands; pit',p['length'],flush=True)
 for file,db in [('tracks',tracks),('pit-lanes',pits),('buildings',bs),('venue-osm',venues),('corner-details',details),('start-markers',markers),('pit-lanes-osm',rawpits)]:save(R,'data/'+file+'.json',db)

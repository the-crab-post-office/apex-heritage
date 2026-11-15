"""Offline photo-guided Eau Rouge/Raidillon surfacing refinement, all eras.
Only this complex is modernised for every selection. Not a historical survey.
"""
import json,math,copy
from pathlib import Path
from shapely.geometry import LineString,Polygon
from shapely.ops import unary_union,triangulate
ROOT=Path(__file__).resolve().parents[1]
def refine(tracks,records):
 t=tracks[0];v=records[0];p=t['points'];n=len(p);w=t['width']/2
 pit=json.loads((ROOT/'data/pit-lanes.json').read_text())['tracks'][0]
 buildings=json.loads((ROOT/'data/buildings.json').read_text())['tracks'][0]['buildings']
 protected=unary_union([LineString(p+[p[0]]).buffer(w+.28),LineString([(q[0],q[2])for q in pit['points']]).buffer(pit['width']/2+.7)])
 building=unary_union([Polygon(b['footprint']).buffer(.5)for b in buildings])
 def section(i,offset):
  a=p[(i-1)%n];b=p[(i+1)%n];dx=b[0]-a[0];dz=b[1]-a[1];l=math.hypot(dx,dz);return[p[i][0]+dz/l*offset,p[i][1]-dx/l*offset]
 kerbs=[]
 for name,a,b,side,width in [('Eau Rouge compression',153,170,-1,1.2),('Raidillon uphill apex',174,207,1,1.35),('Raidillon blind crest',208,231,-1,1.45),('Raidillon exit',226,249,1,1.6)]:
  kerbs.append(dict(name=name,start_index=a,end_index=b,side=side,width=width,height=.045,shape='ramp',color_a='#b52b24',color_b='#e7bd31',source='User reference image-3.png; modern photo-guided geometry for every era, dimensions estimated'))
 runoffs=[]
 for i in range(143,246):
  fade=min(1,(i-142)/14,(246-i)/14)
  for side in [-1,1]:
   bands=[(1.65,7.2,'red_paint'),(7.2,11.0,'green_paint'),(11.0,22*fade+11,'asphalt')]if side==1 else[(1.65,4.5,'green_paint'),(4.5,12*fade+4.5,'asphalt')]
   for lo,hi,kind in bands:
    if hi<=lo:continue
    poly=Polygon([section(i,side*(w+lo)),section(i+1,side*(w+lo)),section(i+1,side*(w+hi)),section(i,side*(w+hi))]).buffer(0).difference(unary_union([protected,building]))
    for piece in getattr(poly,'geoms',[poly]):
     if piece.geom_type!='Polygon' or piece.area<.02:continue
     triangles=[[[round(x,3),round(z,3)]for x,z in list(tri.exterior.coords)[:3]]for tri in triangulate(piece)if piece.covers(tri)]
     if triangles:runoffs.append(dict(name='Eau Rouge / Raidillon photo apron',index=i,kind=kind,triangles=triangles,evidence='User photo; authored approximate modern apron used in all eras'))
 zone=Polygon([section(140,-55),section(140,90),section(246,90),section(246,-55)]).buffer(10)
 # Remove overlapping old generic/mapped escape strips in this complex.
 for profile in v['profiles']:
  profile['kerbs']=[k for k in profile['kerbs']if not('Raidillon'in k['name']or'Eau Rouge'in k['name'])]+copy.deepcopy(kerbs)
  kept=[]
  for r in profile['runoffs']:
   if 'Raidillon'in r['name']:continue
   r=copy.deepcopy(r);r['triangles']=[tri for tri in r['triangles']if not Polygon(tri).intersects(zone)]
   if r['triangles']:kept.append(r)
  profile['runoffs']=kept+copy.deepcopy(runoffs)
  profile['notes']+=' Eau Rouge/Raidillon ONLY uses the same photo-guided modern climb, kerbs and paved apron for every era, as explicitly requested; not historical or surveyed.'
  profile['label']+=' · Eau Rouge photo update'
 # Break long hillside grandstands into contiguous terrain-following modules.
 # A single maximum-height foundation previously levitated the entire lower end.
 stands=[]
 for s in v['grandstands']:
  if not 75<=s['index']<=225:stands.append(s);continue
  count=math.ceil(s['width']/9);width=s['width']/count
  for j in range(count):
   q=copy.deepcopy(s);q['roof']=True if s['index']==205 else s['roof'];q['rows']=18 if s['index']==205 else s['rows'];offset=-s['width']/2+(j+.5)*width;q['x']=round(s['x']+offset*math.cos(s['yaw']),3);q['z']=round(s['z']-offset*math.sin(s['yaw']),3);q['width']=round(width,4)
   q['index']=min(range(n),key=lambda i:(p[i][0]-q['x'])**2+(p[i][1]-q['z'])**2)
   q['footprint']=[[round(q['x']+x*math.cos(q['yaw'])+z*math.sin(q['yaw']),4),round(q['z']-x*math.sin(q['yaw'])+z*math.cos(q['yaw']),4)]for x,z in[(-width/2,-s['depth']/2),(width/2,-s['depth']/2),(width/2,s['depth']/2),(-width/2,s['depth']/2)]]
   q['evidence']=q.get('evidence','Mapped OSM footprint')+'; terrain-following segment of mapped footprint'
   # Keep modules clipped to the original rectangle; no new stand area is invented.
   stands.append(q)
 # Replace fragmented old inside-runoff barriers with connected outer boundaries.
 v['barriers']=[b for b in v['barriers']if not 140<=b['index']<=250]
 for side,offset in [(1,w+38),(-1,w+22)]:
  for i in range(140,248,4):
   a=section(i,side*offset);b=section(i+4,side*offset)
   if LineString([a,b]).buffer(.5).intersects(protected):continue
   v['barriers'].append(dict(index=i,a=a,b=b,radius=.28,height=1.05,kind='armco',fence=True,osm_id=0,evidence='Photo-guided outer apron boundary, modern reference for all eras; approximate extent'))
 v['grandstands']=stands
 v['photo_update']={'reference':'User supplied image-3.png','scope':'Modern complex for all eras; roughly 40 m climb / 17% peak grade; paint/stand dimensions estimated','photo_pixels_redistributed':False}

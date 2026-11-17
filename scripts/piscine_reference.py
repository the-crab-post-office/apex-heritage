"""Deterministic modern Piscine reference refinement; saved OSM, no network.
Photos guide appearance, not survey dimensions. All four eras share this complex.
"""
import copy,json,math
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point,box
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles
ROOT=Path(__file__).resolve().parents[1]
def refine(tracks,records):
 t=tracks[1];v=records[1];p=t['points'];n=len(p);w=t['width']/2
 source=json.loads((ROOT/'data/monaco-piscine-map.json').read_text())
 origin=t['origin'];lat=origin['latitude'];lon=origin['longitude']
 def project(q):return[(q[0]-lon)*111320*math.cos(math.radians(lat)),-(q[1]-lat)*111320]
 features={f['osm_id']:[project(q)for q in f['coordinates']]for f in source['features']}
 pool=Polygon(features[167625723]).buffer(0)
 pit=json.loads((ROOT/'data/pit-lanes.json').read_text())['tracks'][1]
 protected=unary_union([LineString(p+[p[0]]).buffer(w+.2),LineString([(q[0],q[2])for q in pit['points']]).buffer(pit['width']/2+.7)])
 buildings=unary_union([Polygon(b['footprint']).buffer(.3)for b in json.loads((ROOT/'data/buildings.json').read_text())['tracks'][1]['buildings']])
 def section(i,offset):
  a=p[(i-1)%n];b=p[(i+1)%n];dx=b[0]-a[0];dz=b[1]-a[1];l=math.hypot(dx,dz)
  return[round(p[i][0]+dz/l*offset,4),round(p[i][1]-dx/l*offset,4)]
 kerbs=[]
 for name,a,b,side,width in [('entry left',501,509,-1,1.8),('entry right',508,516,1,1.8),('exit right',534,541,1,2.1),('exit left',540,549,-1,2.1),('exit outside',546,554,1,1.35)]:
  kerbs.append(dict(name='Piscine '+name,start_index=a,end_index=b,side=side,width=width,height=.055,shape='ramp',stripe_length=.85,color_a='#ce302d',color_b='#f1eee3',source='User aerial and close chicane references image-6/7; modern all eras, approximate dimensions'))
 # Paved shoulders, not a generic lawn/gravel corner; remove old generic Piscine.
 runoffs=[]
 for i in range(497,555):
  for side in [-1,1]:
   polygon=Polygon([section(i,side*w),section(i+1,side*w),section(i+1,side*(w+3.4)),section(i,side*(w+3.4))]).buffer(0).difference(unary_union([protected,buildings,pool.buffer(1)]))
   triangles=tris(polygon)
   if triangles:runoffs.append(dict(name='Piscine photo asphalt shoulder',index=i,kind='asphalt',triangles=triangles))
 for profile in v['profiles']:
  profile['kerbs']=[k for k in profile['kerbs']if 'Piscine'not in k['name']]+copy.deepcopy(kerbs)
  profile['runoffs']=[r for r in profile['runoffs']if not 497<=r['index']<=554]+copy.deepcopy(runoffs)
  profile['notes']+=' Piscine: modern mapped pool / harbour and photo-guided kerbs, close Armco and temporary stands for all eras; dimensions approximate.'
 # Keep rail collision outside the full road corridor; rails step back around kerbs.
 v['barriers']=[b for b in v['barriers']if not 497<=b['index']<=555 or LineString([b['a'],b['b']]).distance(LineString(p[497:557]))>11]
 for side in [-1,1]:
  for i in range(497,555):
   def offset(j):return w+max([k['width']+.55 for k in kerbs if k['side']==side and k['start_index']-1<=j<=k['end_index']+1]+[.95])
   a=section(i,side*offset(i));b=section(i+1,side*offset(i+1))
   if LineString([a,b]).buffer(.18).intersects(unary_union([protected,buildings])):continue
   v['barriers'].append(dict(index=i,a=a,b=b,radius=.18,height=1.05,kind='armco',fence=True,osm_id=0,evidence='Piscine photo-guided three-rail Armco and debris fence, modern all eras'))
 # Long modular open bleachers west of pool and beyond second chicane.
 v['grandstands']=[s for s in v['grandstands']if not 497<=s['index']<=555]
 occupied=[]
 for x,z,width,depth in [(-291,247,18,6),(-287,267,18,6),(-280.5,287,18,5),(-275.5,307,18,5),(-265,331,18,6)]:
  index=min(range(497,556),key=lambda i:(p[i][0]-x)**2+(p[i][1]-z)**2)
  yaw=math.atan2(p[index][0]-x,p[index][1]-z)
  # Long axis follows circuit; front (+local z) faces road.
  footprint=[[round(x+a*math.cos(yaw)+b*math.sin(yaw),4),round(z-a*math.sin(yaw)+b*math.cos(yaw),4)]for a,b in[(-width/2,-depth/2),(width/2,-depth/2),(width/2,depth/2),(-width/2,depth/2)]]
  poly=Polygon(footprint)
  if poly.intersects(unary_union([protected,buildings,pool.buffer(2)]+occupied)):continue
  occupied.append(poly)
  v['grandstands'].append(dict(osm_id=0,index=index,x=x,z=z,yaw=yaw,width=width,depth=depth,rows=10,roof=False,footprint=footprint,evidence='Piscine reference aerial: authored temporary bleacher modules; position/size photo estimates, not surveyed'))
 # A single source of scenic geometry for native + browser. No scenic facet enters physics.
 facets=[];objects=[]
 def surface(name,geom,y,color):
  for tri in tris(geom):facets.append(dict(name=name,p=[[x,y,z]for x,z in tri],color=color))
 def cube(name,x,y,z,sx,sy,sz,color,yaw=0):objects.append(dict(name=name,x=x,y=y,z=z,sx=sx,sy=sy,sz=sz,yaw=yaw,color=color))
 # OSM coastline follows all piers. Close its east-facing harbour water locally.
 coast=features[166624054];harbour=Polygon(coast+[coast[0]]).buffer(0).intersection(box(-330,100,550,650)).difference(protected)
 # The saved coastline is clockwise around water here. Validate pool remains land.
 if harbour.intersects(pool):raise ValueError('Harbour winding/closure crosses pool')
 deck=pool.buffer(2.6,join_style=2).difference(pool).difference(protected)
 surface('pool deck',deck,.19,'#d4cbbb');surface('white pool coping',pool.buffer(.48,join_style=2).difference(pool),.225,'#f4efdf')
 surface('turquoise pool water',pool,.17,'#29c7d5');surface('mapped harbour water',harbour,-.19,'#276c7d')
 # Pool enclosure and mapped harbour piers are paved, not grassy islands.
 terrace=Polygon(features[197170037]).buffer(.5).union(unary_union(occupied)).difference(unary_union([protected,buildings,pool.buffer(.5)]))
 surface('pool terrace',terrace,.10,'#c9c3b6')
 piers=box(-237,193,-140,347).difference(unary_union([harbour,protected,buildings,pool,terrace]))
 surface('harbour quay paving',piers,-.02,'#acaeaa')
 # Lane stripes on the pool floor, aligned with mapped long edge.
 coords=list(pool.exterior.coords);a,b=max(zip(coords,coords[1:]),key=lambda ab:math.dist(*ab));dx=b[0]-a[0];dz=b[1]-a[1];length=math.hypot(dx,dz);ux=dx/length;uz=dz/length;cx=pool.centroid.x;cz=pool.centroid.y
 for lane in range(-3,4):
  x=cx+uz*lane*2.45;z=cz-ux*lane*2.45
  line=LineString([(x-ux*23,z-uz*23),(x+ux*23,z+uz*23)]).buffer(.085,cap_style=2).intersection(pool)
  surface('pool lane marking',line,.178,'#168aab')
 # Model hulls as tapered planforms, stacked decks and dark glazing.
 yachts=0
 for z in [220,244,311,338,369,399]:
  for x in [-201,-185,-127,-108]:
   yaw=-.18;length=17+(yachts%3)*3;width=5.5
   def transform(a,b):return[x+a*math.cos(yaw)+b*math.sin(yaw),z-a*math.sin(yaw)+b*math.cos(yaw)]
   hull=Polygon([transform(a,b)for a,b in[(-width/2,-length/2),(width/2,-length/2),(width/2,length*.24),(0,length/2),(-width/2,length*.24)]])
   if not harbour.buffer(-1).covers(hull):continue
   surface('yacht hull',hull,.35,'#eeeae0')
   for yy,sx,sy,sz,color in[(.65,4.8,.6,length*.66,'#f5f2e8'),(1.25,4.0,.65,length*.46,'#dfe6e4'),(1.65,4.05,.3,length*.43,'#284b60'),(1.98,4.15,.25,length*.47,'#f9f5e9'),(2.25,2.6,.4,length*.25,'#ebeee5')]:cube('yacht deck',x,yy,z,sx,sy,sz,color,yaw)
   cube('yacht mast',x,3.8,z-3,.09,4.8,.09,'#c2c9c6',yaw);yachts+=1
 # Bright orange marshal stations behind the chicane barriers.
 for i,side in [(499,-1),(517,1),(551,-1)]:
  x,z=section(i,side*9)
  if protected.buffer(.8).contains(Polygon([(x-.6,z-.6),(x+.6,z-.6),(x+.6,z+.6),(x-.6,z+.6)])):continue
  cube('marshal shelter',x,1.1,z,1.2,1.8,1.2,'#eee8d7');cube('marshal orange',x,1.25,z+.65,.4,.7,.25,'#f37725')
 # Slender harbour street lamps, flared pale shades and orange marshals.
 for i,side in [(500,-1),(510,1),(518,-1),(536,-1),(542,1),(550,-1)]:
  x,z=section(i,side*9)
  footprint=Point(x,z).buffer(.9)
  if footprint.intersects(unary_union([protected,buildings])):continue
  base=t['heights'][i]
  cube('harbour lamp pole',x,base+3.25,z,.10,6.5,.10,'#d9d9cc')
  for j in range(8):
   a=j*math.tau/8;b=(j+1)*math.tau/8
   q=[[x+math.cos(a)*.60,base+6.65,z+math.sin(a)*.60],[x+math.cos(b)*.60,base+6.65,z+math.sin(b)*.60],[x+math.cos(b)*.11,base+6.1,z+math.sin(b)*.11],[x+math.cos(a)*.11,base+6.1,z+math.sin(a)*.11]]
   for indices in [(0,1,2),(0,2,3)]:facets.append(dict(name='flared lamp shade',p=[q[k]for k in indices],color='#e4e4d7'))
  for j in range(2):
   xx=x+(j-.5)*.65
   cube('orange marshal suit',xx,base+.95,z+.65,.36,.85,.28,'#f47522')
   cube('marshal white helmet',xx,base+1.55,z+.65,.25,.25,.25,'#f1eee2')
 mask=tris(harbour)+tris(pool)+tris(terrace)+tris(piers)
 data=dict(source='© OpenStreetMap contributors, ODbL-1.0; saved monaco-piscine-map.json. User photos guide authored approximate detail, no photo pixels redistributed.',scope='Modern Monaco Swimming Pool in all eras; scenic water is NOT a drivable overlay',facets=facets,objects=objects,terrain_mask=mask,pool_outline=[[round(x,4),round(z,4)]for x,z in pool.exterior.coords],yachts=yachts)
 (ROOT/'data/monaco-piscine.json').write_text(json.dumps(data,separators=(',',':')))
 print('Piscine:',len(kerbs),'kerbs,',len(occupied),'stands,',yachts,'yachts,',len(facets),'scenic facets')

def tris(geometry):
 out=[]
 for piece in getattr(geometry,'geoms',[geometry]):
  if piece.geom_type!='Polygon' or piece.area<.00001:continue
  for tri in constrained_delaunay_triangles(piece).geoms:
   if piece.covers(tri):out.append([[round(x,4),round(z,4)]for x,z in list(tri.exterior.coords)[:3]])
 return out

#!/usr/bin/env python3
"""Offline original facade artwork and conservative per-building appearance.
Photographs are reference-only: never copied into facade textures. Footprints,
mapped heights and the older Monaco landmark rules remain authoritative.
"""
import json,math
from pathlib import Path
from PIL import Image,ImageDraw
from shapely.geometry import Polygon,box,LineString
from shapely.ops import unary_union
from shapely import affinity,constrained_delaunay_triangles
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text())
# wall / masonry / glazing / stone / garage cladding / balcony hotel / roof / accent
PALETTES={
'be-1925':['#d5d5cc','#8b6353','#7c929a','#c7c6bc','#c3c8c5','#ded9c9','#666e70','#a93631'],
'mc-1929':['#e5d8c2','#b68b76','#7b9caa','#d5c6a6','#c8cdc9','#eadac5','#776f62','#bdad91'],
'it-1922':['#dedbd0','#b78c75','#718d92','#d4c8ad','#dce0da','#e5ddcc','#8b9190','#a42c29'],
'gb-1948':['#d1d2cc','#8d6557','#6f8995','#bfc3bf','#b8bfc0','#cdd0cc','#555d62','#404c54'],
'jp-1962':['#e1e0d4','#b29d89','#73919c','#d0cfc3','#d9dedb','#d9d9ca','#7e898d','#a33730'],
'br-1940':['#c9bbaa','#a36850','#6d929c','#bdb9ae','#b3bdba','#d9ceba','#9f5e45','#435d64'],
'it-1953':['#e3d3ba','#b77a58','#758f96','#cfbea2','#d0d5d1','#e3d2b6','#a86d4b','#b42f2e'],
'de-1927':['#d0cebf','#a27761','#708c96','#bbbdb6','#d1d7d6','#d8d6c9','#737e82','#b73832'],
'ca-1978':['#d7d0b9','#a58d6b','#789ba7','#cecfbf','#cbd1c9','#dfd6bc','#bd9d65','#bba06c'],
'de-1932':['#dcdcd2','#a68b76','#718b96','#d0d0c5','#d8dcd7','#d8d5c7','#768184','#718289'],
'ae-2009':['#e2decf','#c6af8b','#749ba8','#d5ccb8','#e2e4dc','#e6e0cc','#c0c8c7','#91adb5'],
'nl-1948':['#d3ccb7','#a77b5b','#6d929e','#c2c2b6','#d8dbd4','#dbd5bf','#5e6769','#af342d'],
'az-2016':['#d5c1a0','#ad8c6a','#7595a3','#caba99','#d4d5c8','#dec9a9','#7d7c71','#a08b69']}
TYPES=['stucco','brick','glass','stone','industrial','hotel']
tracks=read('data/buildings.json')['tracks'];track_meta={t['id']:t for t in read('data/tracks.json')};track_names={id:t['name']for id,t in track_meta.items()};pits={t['id']:t for t in read('data/pit-lanes.json')['tracks']};out=[];assets=[]
for tr in tracks:
 id=tr['id'];palette=PALETTES[id];looks=[]
 t=track_meta[id];pit=pits[id];mask=unary_union([LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+3.2),LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+3.2)])
 for b in tr['buildings']:
  poly=Polygon(b['footprint']);area=poly.area;rect=poly.minimum_rotated_rectangle;p=list(rect.exterior.coords);lengths=sorted([math.dist(p[i],p[i+1])for i in range(4)]);aspect=lengths[-1]/max(1,lengths[0]);name=b.get('name','').lower();h=b['height'];source=b.get('height_source','')
  default='default' in source
  # Small dune holiday houses were previously all 9m apartment blocks. Only
  # revise explicitly/default-estimated heights, never mapped height/levels.
  if default and id!='mc-1929':
   if area<140:h=3.4 if id not in ['az-2016','br-1940']else 5.8
   elif area<450:h=6.4
   else:h=min(h,9.)
  garage=(aspect>3.2 and area>450 and h<19 and id!='az-2016') or any(s in name for s in ['pitgebouw','media center','paddock'])
  facade=4 if garage else 2 if h>25 else 3 if id=='az-2016'else 0
  if id=='mc-1929':facade=5 if b.get('style')in['fairmont','belle-epoque']else 2 if b.get('style')=='tower'else 0
  if id in ['nl-1948','be-1925','gb-1948']and not garage and h<12:facade=1
  if id=='ae-2009'and not garage and area>500:facade=2
  if id=='br-1940'and h<10 and not garage:facade=1
  pitched=not garage and h<13 and area<700 and id not in ['mc-1929','ae-2009','az-2016']and poly.convex_hull.area<poly.area*1.02
  roof=1 if pitched else 0
  looks.append(dict(osm_id=b['osm_id'],height=round(h,2),facade=facade,floors=max(1,round(h/(3.5 if garage else 3.1))),roof=roof,roof_rise=round(min(2.8,math.sqrt(area)*.12),2)if roof else 0))
  safe_poly=poly
  if id!='mc-1929' and poly.intersects(mask):
   clipped=poly.difference(mask);parts=[g for g in getattr(clipped,'geoms',[clipped])if g.geom_type=='Polygon'and g.area>6 and not g.interiors]
   if b['osm_id']in[227332429,60890958]and parts:parts=[max(parts,key=lambda p:p.area)]
   looks[-1]['safe_footprints']=[[[round(x,3),round(z,3)]for x,z in list(part.exterior.coords)[:-1]]for part in parts]
   looks[-1]['roof']=0
   if parts:safe_poly=unary_union(parts)
  if id=='gb-1948'and b['osm_id']==227332429:
   # The mapped 30m is the maximum Wing roof, not a 30m vertical glass box.
   # Keep that envelope, with estimated 12m eaves and five folded roof bays.
   look=looks[-1];look.update(height=12.,facade=4,roof=2,roof_rise=18.,detail='silverstone-wing',roof_facets=[])
   a,c=p[0],p[1]
   if math.dist(a,c)<math.dist(p[1],p[2]):a,c=p[1],p[2]
   ll=math.dist(a,c);ux,uz=(c[0]-a[0])/ll,(c[1]-a[1])/ll;vx,vz=-uz,ux;cx,cz=poly.centroid.x,poly.centroid.y
   local=affinity.affine_transform(safe_poly,[ux,uz,vx,vz,-ux*cx-uz*cz,-vx*cx-vz*cz]);u0,v0,u1,v1=local.bounds
   for k in range(10):
    part=local.intersection(box(u0+(u1-u0)*k/10,v0-1,u0+(u1-u0)*(k+1)/10,v1+1))
    for shape in getattr(part,'geoms',[part]):
     if shape.geom_type!='Polygon':continue
     for tri in constrained_delaunay_triangles(shape).geoms:
      facet=[]
      for u,v in list(tri.exterior.coords)[:3]:
       phase=(u-u0)/(u1-u0)*5;wave=1-abs(2*(phase-math.floor(phase))-1);rise=18*(.18+.82*wave)*(v-v0)/(v1-v0)
       facet.append([round(cx+u*ux+v*vx,3),round(rise,3),round(cz+u*uz+v*vz,3)])
      look['roof_facets'].append(facet)
   # Close the folded roof's outer boundary down to the eaves.
   edges={}
   for tri in look['roof_facets']:
    for j in range(3):
     aa,bb=tri[j],tri[(j+1)%3];key=tuple(sorted([(aa[0],aa[2]),(bb[0],bb[2])]))
     if key in edges:edges[key]=None
     else:edges[key]=(aa,bb)
   for edge in edges.values():
    if edge:
     aa,bb=edge;aa0=[aa[0],0.,aa[2]];bb0=[bb[0],0.,bb[2]]
     look['roof_facets'].extend([[aa,bb,aa0],[aa0,bb,bb0]])
  if id=='it-1953'and b['osm_id']==60890958:
   looks[-1].update(height=18.,facade=5,roof=0,roof_rise=3.,detail='imola-tower')

 out.append(dict(id=id,name=track_names[id],palette=palette,buildings=sorted(looks,key=lambda b:b['osm_id'])))
 for kind,type in enumerate(TYPES):
  im=Image.new('RGB',(512,512),palette[kind]);d=ImageDraw.Draw(im);wall=palette[kind];accent=palette[7]
  if kind==4:
   # Two-story garage: service doors below, continuous hospitality glazing
   # above; pale structural posts, not residential punched-window wallpaper.
   for x in range(0,512,128):
    d.rectangle((x+7,275,x+119,502),fill='#515b5b');
    for y in range(281,502,12):d.line((x+9,y,x+117,y),fill='#727d7d',width=2)
    d.rectangle((x+7,65,x+119,205),fill='#3d555f')
    for xx in range(x+7,x+120,28):d.line((xx,65,xx,205),fill='#a0b0ae',width=3)
    d.rectangle((x,0,x+5,512),fill='#d9ddd4')
   for y in [38,224,253]:d.rectangle((0,y,512,y+12),fill=accent if y==224 else '#d9ddd4')
  elif kind==2:
   d.rectangle((0,0,512,512),fill='#698b97')
   for x in range(0,512,64):
    d.rectangle((x+5,0,x+59,512),fill='#577681'if x%128 else '#85a2ab')
    d.rectangle((x,0,x+3,512),fill='#bac7c4')
   for y in range(0,512,128):d.rectangle((0,y,512,y+7),fill='#ccd2c8')
  else:
   if kind in [1,3]:
    rows=16 if kind==1 else 9
    for row in range(rows):
     yy=round(row*512/rows);d.line((0,yy,512,yy),fill='#796c5c',width=1)
     for xx in range(-64 if row%2 else 0,512,128):d.line((xx,yy,xx,yy+512//rows),fill='#9d8a71',width=1)
   for row in range(4):
    for col in range(4):
     x=col*128+32;y=row*128+24;w=64;hh=78
     if kind==5:
      d.rectangle((col*128,row*128+4,col*128+127,row*128+12),fill='#f0e7d6')
     d.rectangle((x-5,y-5,x+w+5,y+hh+6),fill='#ece1ca')
     d.rectangle((x,y,x+w,y+hh),fill='#344e5a')
     d.rectangle((x+4,y+4,x+w//2-3,y+hh//2),fill='#7c9ca7')
     d.line((x+w//2,y,x+w//2,y+hh),fill='#c2c3b4',width=3)
     d.line((x,y+hh//2,x+w,y+hh//2),fill='#c2c3b4',width=3)
     d.rectangle((x-9,y+hh+5,x+w+9,y+hh+10),fill='#e8dac0')
     if kind==5:
      d.rectangle((col*128,row*128+107,col*128+127,row*128+113),fill='#bbb6a4')
      for xx in range(col*128+3,col*128+128,12):d.line((xx,row*128+90,xx,row*128+108),fill='#6a776e',width=2)
  # Roof-only UV swatch; native roofs must not inherit window wallpaper.
  d.rectangle((0,0,10,10),fill=palette[6])
  path=R/f'web/assets/facades/{id}-{type}.jpg';path.parent.mkdir(exist_ok=True,parents=True);im.save(path,quality=88,subsampling=0)
  assets.append(path.relative_to(R).as_posix())
(R/'data/building-appearance.json').write_text(json.dumps(dict(scope='Every mapped building gets venue/photo-guided materials and conservative morphology. Individual facades and unmapped heights are estimates, not photographically verified replicas.',types=TYPES,tracks=out),separators=(',',':')))
rows=[]
for tr in tracks:
 vals=','.join(f'include_bytes!("../web/assets/facades/{tr["id"]}-{type}.jpg").as_slice()'for type in TYPES)
 rows.append(f'"{tr["id"]}" | "{track_names[tr["id"]]}" => [{vals}],')
(R/'src/facade_assets.rs').write_text('// Original generated artwork. Rebuild with scripts/build-building-appearance.py.\npub fn textures(id: &str) -> [&\'static [u8];6] { match id {\n'+ '\n'.join(rows)+'\n_ => textures("be-1925"),\n}}\n')
print('Assigned appearance to',sum(len(t['buildings'])for t in out),'mapped buildings; generated',len(assets),'original facade textures')

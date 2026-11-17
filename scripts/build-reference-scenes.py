#!/usr/bin/env python3
"""Offline shared original detail for the Spa/Monaco user-reference follow-up.
No source photo pixels. Keep the Monaco overhead volume separate from ordinary
at-ground buildings: its floor is above, not inside, the driving corridor.
"""
import json, math
from pathlib import Path
from shapely.geometry import Polygon, LineString
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles
R=Path(__file__).resolve().parents[1]
tracks=json.loads((R/'data/tracks.json').read_text())
scenes=[]
def scene(track,eras):
    s=dict(track=track,eras=eras,facets=[],objects=[]);scenes.append(s);return s

def quad(s,points,color,tag):
    for a,b,c in [(0,1,2),(0,2,3)]:s['facets'].append(dict(p=[[round(v,4)for v in points[i]]for i in [a,b,c]],color=color,tag=tag))

def flat(s,poly,y,color,tag,down=False):
    for q in constrained_delaunay_triangles(poly).geoms:
        points=[[x,y,z]for x,z in list(q.exterior.coords)[:3]]
        if down:points.reverse()
        s['facets'].append(dict(p=[[round(v,4)for v in p]for p in points],color=color,tag=tag))

def section(t,i,offset,h=0):
    pts=t['points'];n=len(pts);a,b=pts[(i-1)%n],pts[(i+1)%n];dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
    return [pts[i][0]+dz/length*offset,t['heights'][i]+h,pts[i][1]-dx/length*offset]

s=scene('Monaco',[0,1,2,3,4]);t=tracks[1]
ref=json.loads((R/'data/monaco-reference.json').read_text())
hotel=next(r for r in ref['landmarks']if r['style']=='fairmont')
o=t['origin'];co=math.cos(math.radians(o['latitude']))
project=lambda p:[(p[0]-o['longitude'])*111320*co,-(p[1]-o['latitude'])*111320]
outline=Polygon([project(p)for p in hotel['coordinates']],[[project(p)for p in ring]for ring in hotel['holes']]).buffer(0)
line=LineString(t['points'][303:341]);corridor=line.buffer(t['width']/2+3.9,cap_style=2,join_style=2)
portal=LineString(t['points'][303:309]).buffer(t['width']/2+3.9,cap_style=2,join_style=2)
upper=unary_union([outline.intersection(corridor),portal]).buffer(0)
bottom=max(t['heights'][303:341])+4.65
top=t['heights'][hotel['roof_anchor_index']]+hotel['height']
flat(s,upper,bottom,'#bcbab2','hotel-overhead-floor',True)
flat(s,upper,top,'#c3c0b7','hotel-roof')
for poly in getattr(upper,'geoms',[upper]):
    poly=orient(poly,sign=1)
    for ring in [poly.exterior,*poly.interiors]:
        xy=list(ring.coords)
        for a,b in zip(xy,xy[1:]):
            # Horizontal slabs and recessed glazing make the mass read as the
            # same stacked-balcony hotel, not a freestanding concrete tube.
            levels=[bottom,bottom+1.25]+[bottom+1.25+3*i for i in range(1,30)if bottom+1.25+3*i<top]+[top]
            for lo,hi in zip(levels,levels[1:]):
                quad(s,[[a[0],lo,a[1]],[b[0],lo,b[1]],[b[0],hi,b[1]],[a[0],hi,a[1]]],'#d4d0c4','hotel-facade')
                if hi-lo>2:
                    length=math.dist(a,b);dx=(b[0]-a[0])/length;dz=(b[1]-a[1])/length
                    for j in range(max(1,int(length/3))):
                        count=max(1,int(length/3));u=(j+.13)/count;v=(j+.87)/count
                        # Offset the glazing 15 mm from the wall to avoid z fighting.
                        aa=[a[0]+(b[0]-a[0])*u+dz*.015,a[1]+(b[1]-a[1])*u-dx*.015]
                        bb=[a[0]+(b[0]-a[0])*v+dz*.015,a[1]+(b[1]-a[1])*v-dx*.015]
                        quad(s,[[aa[0],lo+.45,aa[1]],[bb[0],lo+.45,bb[1]],[bb[0],hi-.4,bb[1]],[aa[0],hi-.4,aa[1]]],'#43585c','hotel-windows')
            # A dark basement header frames the actual clear tunnel opening.
            quad(s,[[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],bottom+.3,b[1]],[a[0],bottom+.3,a[1]]],'#68665e','portal-slab')
# Hillside podium cladding beside Portier/portal: a vertical building wall,
# not a grassy embankment protruding into the tunnel entrance. Offset remains
# outside the legal road and inboard of the existing mapped hotel mass.
for i in range(294,310):
    a=section(t,i,-(t['width']/2+1.2),-.3)
    b=section(t,i+1,-(t['width']/2+1.2),-.3)
    top_y=25.
    quad(s,[a,b,[b[0],top_y,b[2]],[a[0],top_y,a[2]]],'#898e8b','retaining-wall')
    # Thin vertical ribs and horizontal structural courses.
    a2=section(t,i,-(t['width']/2+1.17),-.3)
    b2=section(t,i,-(t['width']/2+1.14),-.3)
    quad(s,[a2,b2,[b2[0],top_y,b2[2]],[a2[0],top_y,a2[2]]],'#b0b2aa','retaining-wall')
    for h in [11.2,14.5,18.,21.5]:
        if h<max(a[1],b[1])+.2:continue
        aa=section(t,i,-(t['width']/2+1.16));bb=section(t,i+1,-(t['width']/2+1.16))
        quad(s,[[aa[0],h,aa[2]],[bb[0],h,bb[2]],[bb[0],h+.12,bb[2]],[aa[0],h+.12,aa[2]]],'#c1c1b8','retaining-wall')
s['scope']='Modern Monaco for every era, as requested. Over-road Fairmont infill on the original mapped hotel footprint, plus estimated portal connection. Not a survey; image-12.png reference only.'
s['clearance']={'start_index':303,'end_index':340,'floor_y':round(bottom,4),'min_road_clearance':4.65,'roof_y':round(top,4),'hotel_osm_id':hotel['osm_id']}

s=scene('Spa-Francorchamps',[3,4]);t=tracks[0]
# Staggered grid boxes approaching the unchanged physics timing line at index 0.
# Each paint ribbon follows the actual road sections, not a flat world plane.
for row,side in enumerate([-1,1]):
    for index in range(1337+row*2,1394,4):
        center=side*3.2
        for lo,hi,a,b in [(center-1.1,center-.98,index,index+1),(center+.98,center+1.1,index,index+1),(center-1.1,center+1.1,index,index)]:
            if a==b:
                p=section(t,index,lo,.088);q=section(t,index,hi,.088);v=section(t,index+1,lo,.088);delta=[(v[k]-p[k])*.024 for k in range(3)]
                quad(s,[p,q,[q[k]+delta[k]for k in range(3)],[p[k]+delta[k]for k in range(3)]],'#e3e2d5','grid-paint')
            else:quad(s,[section(t,a,lo,.088),section(t,b,lo,.088),section(t,b,hi,.088),section(t,a,hi,.088)],'#e3e2d5','grid-paint')
s['scope']='Recent Spa and labelled 2021 substitute only. Estimated grid paint/escape hatching from user image-10..11.png; original markings, no photographic pixels.'
(R/'data/reference-scenes.json').write_text(json.dumps(dict(schema=1,scenes=scenes),separators=(',',':'))+'\n')
print('Shared reference scenes:',[(s['track'],len(s['facets']))for s in scenes])

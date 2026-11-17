"""Bounded recent Spa surfacing from the user's five-view follow-up.
Only profile 3 changes; no user photograph pixels are redistributed. Geometry
follows the existing mapped road, not camera-calibrated photogrammetry.
"""
import copy, json, math
from pathlib import Path
from shapely.geometry import Polygon, LineString
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles
ROOT = Path(__file__).resolve().parents[1]

def refine(tracks, records):
    t = tracks[0]; record = records[0]; profile = record['profiles'][3]
    points = t['points']; n = len(points); half = t['width']/2
    pit = json.loads((ROOT/'data/pit-lanes.json').read_text())['tracks'][0]
    buildings = json.loads((ROOT/'data/buildings.json').read_text())['tracks'][0]['buildings']
    protected = unary_union([LineString(points+[points[0]]).buffer(half+.12), LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+.65)] + [Polygon(b['footprint']).buffer(.35)for b in buildings])
    zones = unary_union([LineString(points[a:b]).buffer(w)for a,b,w in [(12,76,48),(418,519,44),(1284,1395,43)]])
    def triangles(poly):
        return [[[round(x,3),round(z,3)]for x,z in list(q.exterior.coords)[:3]] for q in constrained_delaunay_triangles(poly).geoms if q.area>.008]
    # Replace previous generic/copanar escape surfaces, retaining everything else.
    kept = []
    for r in profile['runoffs']:
        p = unary_union([Polygon(tri)for tri in r['triangles']]).difference(zones)
        r = copy.deepcopy(r); r['triangles'] = triangles(p)
        if r['triangles']: kept.append(r)
    profile['runoffs'] = kept
    profile['kerbs'] = [k for k in profile['kerbs'] if not any(k['name'].startswith(s)for s in ['La Source','Les Combes','Bus Stop'])]
    palette = ('#ba3930','#e2c94b')
    source = 'User follow-up references image-8..11.png; authored recent-surface estimate, not surveyed'
    def kerb(name, a, b, side, width=1.4):
        profile['kerbs'].append(dict(name=name,start_index=a,end_index=b,side=side,width=width,height=.045,shape='ramp',color_a=palette[0],color_b=palette[1],stripe_length=1.5,source=source))
    def section(i, off):
        a,b = points[(i-1)%n],points[(i+1)%n];dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
        return [points[i][0]+dz/length*off,points[i][1]-dx/length*off]
    new_areas = []
    def add(name, poly, kind):
        area = poly.buffer(0).difference(protected)
        if area.is_empty: return
        # Each new paint band replaces, rather than overlays, earlier new paving.
        for old in profile['runoffs']:
            if old.get('evidence') == source:
                old['triangles'] = triangles(unary_union([Polygon(q)for q in old['triangles']]).difference(area))
        profile['runoffs'] = [r for r in profile['runoffs']if r['triangles']]
        profile['runoffs'].append(dict(name=name,index=min(range(n),key=lambda i:math.dist(points[i],(area.centroid.x,area.centroid.y))),kind=kind,triangles=triangles(area),follow_road=True,evidence=source))
        new_areas.append(area)
    def band(name, a, b, side, lo, hi, kind, taper=False):
        pieces = []
        for i in range(a,b):
            def extent(j):
                f=max(.08,math.sin(math.pi*(j-a)/(b-a)))**.55 if taper else 1
                return lo+(hi-lo)*f
            pieces.append(Polygon([section(i,side*(half+lo)),section(i+1,side*(half+lo)),section(i+1,side*(half+extent(i+1))),section(i,side*(half+extent(i)))]).buffer(0))
        add(name,unary_union(pieces),kind)
    # T1: continuous black escape surface, paved inner island and a narrow green
    # edge. No intervening grass island between the road and the outer paving.
    kerb('La Source rounded apex',26,38,-1,1.55)
    kerb('La Source exit',39,61,1,1.65)
    band('La Source continuous paved escape',16,62,1,.13,28,'asphalt',True)
    add('La Source paved pit island',Polygon([section(i,-(half+.13))for i in range(0,85)]),'asphalt')
    band('La Source inner green margin',26,43,-1,1.65,4.2,'green_paint',True)
    # T5 right / T6 left / T7 right. The previous single long apex/exit pair
    # incorrectly painted straight sections and both changes of direction.
    kerb('Les Combes T5 right apex',430,443,-1)
    kerb('Les Combes T6 left apex',447,460,1)
    kerb('Malmedy T7 right apex',479,496,-1,1.5)
    kerb('Malmedy T7 exit',499,517,1,1.5)
    band('Les Combes T5 outside paved apron',423,449,1,.13,14,'asphalt',True)
    band('Les Combes T5 green island margin',426,448,1,1.6,9,'green_paint',True)
    band('Les Combes T6 outside gravel',447,470,-1,5.5,29,'gravel',True)
    band('Les Combes T6 paved edge',445,470,-1,.13,5.5,'asphalt',True)
    band('Les Combes T6 green inside',446,462,1,1.5,6.5,'green_paint',True)
    band('Malmedy outside gravel',474,517,1,5.5,26,'gravel',True)
    band('Malmedy paved shoulder',475,519,1,.13,5.5,'asphalt',True)
    band('Malmedy green exit border',493,519,1,1.6,5.5,'green_paint',True)
    # Modern right-left Bus Stop with two short, separate apexes. Paved escape
    # remains outside the racing corridor; the inner paddock has a green border.
    kerb('Bus Stop first right apex',1295,1303,-1,1.6)
    kerb('Bus Stop second left apex',1306,1315,1,1.6)
    kerb('Bus Stop exit',1316,1333,-1,1.5)
    band('Bus Stop outer paved escape',1287,1313,1,.13,29,'asphalt',True)
    band('Bus Stop inner paddock paving',1297,1329,-1,.13,25,'asphalt',True)
    band('Bus Stop broad green inside',1301,1317,-1,1.7,14,'green_paint',True)
    band('Bus Stop green exit',1314,1340,-1,1.6,6.5,'green_paint',True)
    for i in range(1290,1303,2):
        add('Bus Stop diagonal escape hatching', Polygon([section(i,half+2.4),section(i+1,half+14),section(i+1,half+14.24),section(i,half+2.64)]),'white_paint')
    band('Finish straight outer paving',1330,1394,-1,.13,7.5,'asphalt')
    band('Finish straight green shoulder',1330,1394,-1,1.7,5.5,'green_paint')
    # Era-specific collision furniture: remove only walls crossing the new
    # escapes, then place the La Source perimeter outside the apron, not in it.
    apron=unary_union(new_areas).buffer(.8)
    barriers=[copy.deepcopy(b)for b in record['barriers']if not LineString([b['a'],b['b']]).intersects(apron)]
    for a,b,side,off in [(17,60,1,half+31),(423,470,1,half+34),(476,518,1,half+30),(1288,1315,1,half+34)]:
        for i in range(a,b,2):
            aa,bb=section(i,side*off),section(min(i+2,b),side*off)
            if LineString([aa,bb]).buffer(.75).intersects(protected):continue
            barriers.append(dict(index=i,a=aa,b=bb,radius=.4,height=1.15,kind='spa-red'if(i//4)%2 else'spa-yellow',fence=True,osm_id=0,evidence=source))
    profile['barriers']=barriers
    profile['notes']+=' User follow-up: La Source paved island/escape; separate T5/T6/T7 apexes and green/gravel margins; right-left Bus Stop and green-edged finish straight. Authored extents, unchanged mapped road and pit alignment. Only the recent surface and its 2021 substitute use this correction.'
    profile['label']+=' · reference corner update'
    record['followup_reference']={'scope':'Recent surface only (car eras 2023 and labelled 2021 substitute); historical profiles unchanged','references':['User image-8.png: La Source','User image-9.png: turns 5, 6 and 7','User image-10.png / image-11.png: Bus Stop and finish straight'],'pixels_redistributed':False,'limitations':'Road/pit centrelines retained; visible widths, signs, runoff extents and barrier offsets are estimates, not a surveyed reconstruction.'}

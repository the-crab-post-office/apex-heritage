"""Offline modern Monaco refinement, sourced footprints and photo-estimated detail.
No downloaded image pixels or invented geographic building locations.
"""
import json, math, re
from pathlib import Path
from shapely.geometry import Polygon, LineString
from shapely.ops import unary_union, split
ROOT=Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT/p).read_text())
def building_refinement():
    t=read('data/tracks.json')[1];pit=read('data/pit-lanes.json')['tracks'][1];ref=read('data/monaco-reference.json');db=read('data/buildings.json');layer=db['tracks'][1]
    o=t['origin'];co=math.cos(math.radians(o['latitude']))
    def project(p):return [(p[0]-o['longitude'])*111320*co,-(p[1]-o['latitude'])*111320]
    protected=unary_union([LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+3.65),LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+3.65)])
    metadata={b['osm_id']:b for b in ref['building_metadata']}
    ids={b['osm_id']for b in ref['landmarks']}
    layer['buildings']=[b for b in layer['buildings']if not b.get('monaco_reference_part') and b['osm_id']not in ids]
    for b in layer['buildings']:
        m=metadata.get(b['osm_id'],{});b['style']='riviera';b['name']=m.get('name') or b.get('name','')
        if m.get('height'):
            match=re.match(r'[\d.]+',m['height'])
            if match:b['height']=min(150,max(3,float(match[0])));b['height_source']='OSM height'
        elif m.get('levels'):
            match=re.match(r'[\d.]+',m['levels'])
            if match:b['height']=min(150,max(3,float(match[0])*3));b['height_source']='estimated from OSM levels at 3 m/floor'
        if b['height']>38:b['style']='tower'
        if b['osm_id']==94399398:b.update(name='Sainte-Dévote Chapel',style='chapel',height=14.,height_source='photo-estimated nave / bell-tower massing, not surveyed')
    for record in ref['landmarks']:
        polygon=Polygon([project(p)for p in record['coordinates']],[[project(p)for p in hole]for hole in record['holes']]).buffer(0).difference(protected)
        # Cut courtyard rings into contiguous simple polygons, preserving voids
        # in both the JS extruder and native ear-clipped roof renderer.
        pending=list(getattr(polygon,'geoms',[polygon]));parts=[]
        while pending:
            poly=pending.pop(0)
            if poly.geom_type!='Polygon' or poly.area<6:continue
            if poly.interiors:
                ring=Polygon(poly.interiors[0]);x=ring.representative_point().x
                pieces=list(split(poly,LineString([(x,poly.bounds[1]-10),(x,poly.bounds[3]+10)])).geoms)
                if len(pieces)<2:raise ValueError('could not preserve courtyard')
                pending.extend(pieces)
            else:parts.append(poly)
        for part in sorted(parts,key=lambda p:(p.centroid.x,p.centroid.y)):
            footprint=[[round(x,3),round(z,3)]for x,z in list(part.exterior.coords)[:-1]]
            layer['buildings'].append({'osm_id':record['osm_id'],'osm_relation':record.get('osm_relation'),'footprint':footprint,'height':record['height'],'roof_height':round(t['heights'][record['roof_anchor_index']]+record['height'],3),'roof_anchor_index':record['roof_anchor_index'],'height_source':record['height_source'],'name':record['name'],'style':record['style'],'monaco_reference_part':True,'evidence':'Mapped outline / courtyard, clipped only at protected road and pit corridors; photo-estimated massing. Modern scene used for all eras.'})
    layer['modern_reference']='data/monaco-reference.json; all eras by user request'
    (ROOT/'data/buildings.json').write_text(json.dumps(db,separators=(',',':'),ensure_ascii=False))
    print('Monaco:',len(layer['buildings']),'building parts;',sum(bool(b.get('monaco_reference_part'))for b in layer['buildings']),'recovered landmark parts')
def refine(tracks,records):
    t=tracks[1];v=records[1];ref=read('data/monaco-reference.json');pit=read('data/pit-lanes.json')['tracks'][1];buildings=read('data/buildings.json')['tracks'][1]['buildings'];points=t['points'];n=len(points)
    protected=unary_union([LineString(points+[points[0]]).buffer(t['width']/2+.14),LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+.65)])
    occupied=unary_union([Polygon(b['footprint'])for b in buildings]);existing=unary_union([LineString([b['a'],b['b']]).buffer(.65)for b in v['barriers']])
    count=0
    for name,start,end,offset in ref['barrier_sections']:
        first=math.ceil(start*n);last=min(n-1,math.floor(end*n))
        def at(i,side):
            a=points[(i-1)%n];b=points[(i+1)%n];dx=b[0]-a[0];dz=b[1]-a[1];l=math.hypot(dx,dz);off=side*(t['width']/2+offset)
            return [round(points[i][0]+dz/l*off,3),round(points[i][1]-dx/l*off,3)]
        for side in [-1,1]:
            for i in range(first,last):
                a,b=at(i,side),at(i+1,side);line=LineString([a,b]);capsule=line.buffer(.19)
                if line.length<.3 or capsule.intersects(protected) or capsule.intersects(occupied) or line.intersects(existing):continue
                v['barriers'].append({'index':i,'a':a,'b':b,'radius':.18,'height':.95,'kind':'armco','fence':name not in ['Mirabeau / Fairmont hairpin'],'osm_id':0,'name':name,'evidence':'Photo-estimated modern race barrier, approximately ±1 m; not a survey. Protected race/pit/other-road corridors override the visual estimate.'});count+=1
    for p in v['profiles']:
        p['label']+=' · MODERN MONACO SCENERY ALL ERAS'
        p['notes']+=' User-requested modern Monaco architecture and barrier positions for every car era. Photo-estimated offsets are not surveyed. Historical road layouts are not reconstructed.'
    v['modern_reference']={'source':'data/monaco-reference.json','barriers_added':count,'scope':'Modern buildings/barriers all eras by user request'}
    print('Monaco photo-estimated barrier pieces:',count)
if __name__=='__main__':building_refinement()

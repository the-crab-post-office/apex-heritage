"""Offline, bounded photo-audited recent-surface corrections (not road surveys).
Only the latest surface profile changes. 2021 intentionally uses that profile;
older profiles are not silently repainted. Existing all-era Spa/Monaco exceptions
remain in their own modules. Images/source dates: photo-audit-references.json.
"""
import copy, json, math
from pathlib import Path
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles
ROOT = Path(__file__).resolve().parents[1]

def refine(tracks, records):
 refs = {r['id']: r for r in json.loads((ROOT/'data/photo-audit-references.json').read_text())['references']}
 ids=['spa','monaco','monza','silverstone','suzuka','interlagos','imola','nurburgring','montreal','hockenheim']
 actions={0:'La Source paved outer apron, short apex/exit kerbs; recent Spa red/yellow palette.',2:'Separate Rettifilo right/left apex kerbs and exit green paint.',3:'Separate Vale/Club apex/exit kerbs and green Vale apron.',5:'Separate Senna S left/right kerbs, green/yellow paint and green apron.',9:'Blue/white Spitzkehre kerbs and shortened hairpin apex.'}
 pits=json.loads((ROOT/'data/pit-lanes.json').read_text())['tracks'];buildings=json.loads((ROOT/'data/buildings.json').read_text())['tracks']
 for ti,(t,record) in enumerate(zip(tracks,records)):
  key=ids[ti];p=record['profiles'][3];ref=refs[key]
  record['photo_audit']={'reference_id':key,'source':ref['source_page'],'photo_date':ref['photo_date'],'action':actions.get(ti,'Reviewed; existing mapped geometry retained. This view does not justify a precise geometric rebuild.'),'scope':'Latest supported surface only; dates differ from selected car year. Approximate, not surveyed.'}
  if ti not in actions:continue
  p['notes']+=' Photo-audit refinement: '+actions[ti]+' Reference date differs from preset year; widths and placement are estimates.'
  pts=t['points'];n=len(pts);half=t['width']/2
  protected=unary_union([LineString(pts+[pts[0]]).buffer(half+.22),LineString([(q[0],q[2])for q in pits[ti]['points']]).buffer(pits[ti]['width']/2+.7)]+[Polygon(b['footprint']).buffer(.5)for b in buildings[ti]['buildings']])
  def section(i,off):
   a,b=pts[(i-1)%n],pts[(i+1)%n];dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);return [pts[i][0]+dz/length*off,pts[i][1]-dx/length*off]
  def kerb(name,a,b,side,width=1.15,colors=('#b6372d','#e9e6dc')):
   return dict(name=name,start_index=a,end_index=b,side=side,width=width,height=.045,shape='ramp',color_a=colors[0],color_b=colors[1],source='Photo-audited recent surface; '+ref['source_page']+'; dimensions/station extents estimated')
  def band(name,a,b,side,lo,hi,kind,fan=False):
   polys=[]
   for i in range(a,b):
    fade=max(.05,math.sin(math.pi*(i-a+.5)/(b-a)))**.65 if fan else 1
    poly=Polygon([section(i,side*(half+lo)),section(i+1,side*(half+lo)),section(i+1,side*(half+lo+(hi-lo)*fade)),section(i,side*(half+lo+(hi-lo)*fade))]).buffer(0).difference(protected)
    if not poly.is_empty:polys.append(poly)
   if not polys:return
   area=unary_union(polys).buffer(0)
   # Paint/paving replaces previous escape surfacing, never coplanar overlays.
   def triangles(poly):
    if poly.is_empty:return []
    return [[[round(x,3),round(z,3)]for x,z in list(tri.exterior.coords)[:3]]for tri in constrained_delaunay_triangles(poly).geoms if tri.area>.015]
   for runoff in p['runoffs']:
    if any(Polygon(tri).intersects(area) for tri in runoff['triangles']):
     runoff['triangles']=triangles(unary_union([Polygon(tri)for tri in runoff['triangles']]).difference(area))
   p['runoffs']=[r for r in p['runoffs']if r['triangles']]
   tris=triangles(area)
   if tris:p['runoffs'].append(dict(name=name,index=(a+b)//2,kind=kind,triangles=tris,evidence='Photo-audited authored extent, not surveyed; '+ref['source_page']))
  if ti==0:
   for k in p['kerbs']:
    if not any(x in k['name']for x in ['Eau Rouge','Raidillon']):k['color_b']='#e7bd31'
   p['kerbs']=[k for k in p['kerbs']if not k['name'].startswith('La Source')]+[kerb('La Source apex',25,39,-1,1.15,('#b52b24','#e7bd31')),kerb('La Source exit',40,57,1,1.35,('#b52b24','#e7bd31'))]
   band('La Source photo-audited paved escape',19,55,1,1.55,20,'asphalt',True)
  elif ti==2:
   p['kerbs']=[k for k in p['kerbs']if not k['name'].startswith('Rettifilo')]+[kerb('Rettifilo first apex',87,96,-1),kerb('Rettifilo second apex',98,106,1),kerb('Rettifilo exit',106,124,-1,1.35)]
   band('Rettifilo green exit apron',105,125,-1,1.65,4.2,'green_paint')
  elif ti==3:
   p['kerbs']=[k for k in p['kerbs']if not k['name'].startswith('Vale and Club')]+[kerb('Vale left apex',1068,1079,1),kerb('Club right apex',1084,1105,-1),kerb('Club exit',1105,1152,1,1.35)]
   band('Vale green apron',1066,1082,-1,1.5,4.5,'green_paint')
  elif ti==5:
   colors=('#d9c843','#30764e')
   p['kerbs']=[k for k in p['kerbs']if not k['name'].startswith('Senna S')]+[kerb('Senna S left apex',38,54,1,1.2,colors),kerb('Senna S right apex',60,75,-1,1.2,colors),kerb('Senna S exit',75,88,1,1.35,colors)]
   band('Senna S green escape apron',30,55,-1,1.6,7.5,'green_paint',True)
  elif ti==9:
   for k in p['kerbs']:
    if k['name'].startswith('Spitzkehre'):
     k['color_a']='#3289b6';k['color_b']='#e3e2dc';k['source']='Photo-audited blue/white palette; '+ref['source_page']
     if 'apex'in k['name']:k.update(start_index=412,end_index=426,height=.045,shape='ramp')
  record['photo_audit']['surface_features']=len(p['kerbs'])+len(p['runoffs'])

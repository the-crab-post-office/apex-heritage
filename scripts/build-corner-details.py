#!/usr/bin/env python3
"""Offline, corner-authored detail presets; no random lap-fraction grandstands.
Coordinates use the mapped road. Era surfacing is approximate; full historical
road alignments are NOT reconstructed by this importer. Explicit fallback labels
travel with every non-matching preset. See data/CORNER-DETAILS-NOTICE.md.
"""
import json,math
from pathlib import Path
from shapely.geometry import LineString,Polygon,Point
from shapely.ops import unary_union,triangulate
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
T=read('data/tracks.json');P=read('data/pit-lanes.json')['tracks'];B=read('data/buildings.json')['tracks'];O=read('data/venue-osm.json')['tracks']
# Named corner windows were authored against inspected aerial/track photographs
# and circuit diagrams, not detected from curvature or periodically repeated.
C=[
 [('La Source',.012,.04,24),('Raidillon',.115,.17,35),('Les Combes',.31,.365,35),('Bruxelles',.38,.44,24),('Pouhon',.50,.57,32),('Fagnes',.59,.65,24),('Stavelot',.665,.725,24),('Bus Stop',.90,.95,25)],
 [('Sainte Devote',.025,.055,8),('Casino',.27,.32,0),('Grand Hotel',.375,.425,0),('Nouvelle Chicane',.65,.71,7),('Tabac',.735,.775,0),('Piscine',.79,.865,0),('Rascasse',.91,.96,0)],
 [('Rettifilo',.075,.12,35),('Roggia',.275,.31,30),('Lesmo 1',.34,.38,20),('Lesmo 2',.40,.445,28),('Ascari',.565,.625,32),('Parabolica',.79,.87,38)],
 [('Abbey',.015,.065,20),('Village and Loop',.115,.20,22),('Brooklands and Luffield',.305,.39,32),('Copse',.43,.48,38),('Maggotts and Becketts',.49,.61,35),('Stowe',.79,.86,40),('Vale and Club',.9,.99,30)],
 [('First Curve',.045,.11,32),('Esses',.12,.255,26),('Dunlop',.265,.30,20),('Degner',.315,.375,26),('Hairpin',.425,.47,22),('Spoon',.585,.69,38),('130R',.80,.87,32),('Casio Triangle',.89,.96,28)],
 [('Senna S',.015,.08,25),('Curva do Sol',.10,.155,18),('Descida do Lago',.285,.35,28),('Ferradura',.37,.445,24),('Pinheirinho',.51,.56,20),('Bico de Pato',.585,.65,16),('Juncao',.71,.775,22)],
 [('Tamburello',.055,.115,30),('Villeneuve',.13,.18,25),('Tosa',.265,.315,25),('Piratella',.405,.465,25),('Acque Minerali',.50,.56,25),('Variante Alta',.66,.725,24),('Rivazza',.785,.865,30)],
 [('Mercedes Arena',.065,.205,28),('Ford',.285,.345,26),('Dunlop',.425,.485,32),('Schumacher S',.52,.585,30),('Kumho',.605,.655,25),('Bit Kurve',.675,.725,24),('NGK Chicane',.855,.925,26)],
 [('Senna S',.115,.18,20),('Turns 3 and 4',.25,.335,16),('Pont de la Concorde',.445,.505,17),('Hairpin',.62,.675,25),('Wall of Champions',.95,.995,9)],
 [('Nordkurve',.025,.075,32),('Einfahrt Parabolika',.17,.23,30),('Spitzkehre',.425,.48,45),('Mercedes',.515,.605,28),('Mobil 1',.66,.72,24),('Sachs',.805,.865,30),('Sudkurve',.93,.985,25)]
]
refs=[
 ('https://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps','Circuit de Spa-Francorchamps, April 22, 2018 SkySat (cropped).jpg',2018,'La Source/Eau Rouge viewing areas and separated gravel traps; pre-2022 photo, not proof of the new Raidillon stand.'),
 ('https://en.wikipedia.org/wiki/Circuit_de_Monaco','Circuit de Monaco, April 1, 2018 SkySat (cropped).jpg',2018,'Temporary stands are along harbour-side Tabac/Piscine and pit straight, not evenly spaced around residential streets.'),
 ('https://en.wikipedia.org/wiki/Monza_Circuit','Autodromo Nazionale Monza, April 22, 2018 SkySat (cropped).jpg',2018,'Pit/first-chicane stands; gravel at Roggia, Lesmos and Ascari; Parabolica has a mixed paved/gravel apron.'),
 ('https://www.gettyimages.co.uk/photos/silverstone-aerial','Aerial view, 20 June 2001 / 10 July 1994',2001,'Original pit straight/Woodcote spectator areas and wide external gravel beds; reference-only, not redistributed.'),
 ('https://en.wikipedia.org/wiki/Suzuka_Circuit','Suzuka International Racing Course, July 10, 2018 SkySat (cropped).jpg',2018,'Dense pit/first-corner/last-chicane stands; external gravel areas at Degner, Hairpin and Spoon.'),
 ('https://en.wikipedia.org/wiki/Brazilian_Grand_Prix','Interlagos 2006 aerial.jpg',2006,'Grandstands principally line the pit/outer-ring side; internal escape areas are selective, not a continuous gravel shoulder.'),
 ('https://en.wikipedia.org/wiki/Imola_Circuit','Autodromo aerea poster.jpg',None,'River-side track constrained; distinct gravel beds at Tamburello, Villeneuve, Tosa, Acque Minerali and Rivazza.'),
 ('https://en.wikipedia.org/wiki/N%C3%BCrburgring','Nürburgring Luftaufnahme 2004.jpg',2004,'GP pits/T1/Dunlop viewing facilities and discrete gravel areas; GP course did not exist in 1967.'),
 ('https://en.wikipedia.org/wiki/Circuit_Gilles_Villeneuve','Circuit Gilles-Villeneuve, May 29, 2018 SkySat (cropped).jpg',2018,'Island confines walls; stands cluster at Senna S and hairpin, with narrow escape strips. Circuit opened 1978.'),
 ('https://en.wikipedia.org/wiki/Hockenheimring','Hockenheimring, Hockenheim (P1100587).jpg',2023,'Motodrom stands form the stadium perimeter; current outside runoff differs from the former forest course.')]
output=[]
for ti,(t,pit,build,osm)in enumerate(zip(T,P,B,O)):
 pts=t['points'];n=len(pts);w=t['width']/2;o=t['origin'];co=math.cos(math.radians(o['latitude']))
 project=lambda p:[round((p[0]-o['longitude'])*111320*co,3),round(-(p[1]-o['latitude'])*111320,3)]
 roadline=LineString(pts+[pts[0]]);road=roadline.buffer(w+.12);pitpoly=LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+.6)
 protected=unary_union([road,pitpoly]);building=unary_union([Polygon(b['footprint'])for b in build['buildings']])
 def index(x,z):return min(range(n),key=lambda i:(pts[i][0]-x)**2+(pts[i][1]-z)**2)
 def section(i,off):
  a,b=pts[(i-1)%n],pts[(i+1)%n];dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);return [pts[i][0]+dz/length*off,pts[i][1]-dx/length*off]
 stands=[];mapped_barriers=[];gravel=[]
 for f in osm['features']:
  xy=[project(p)for p in f['coordinates']]
  if f['type']=='grandstand'and len(xy)>=4:
   poly=Polygon(xy).buffer(0)
   if poly.is_empty or poly.area<30 or poly.area>17000 or poly.intersects(road.buffer(1.4))or poly.intersects(pitpoly):continue
   rect=poly.minimum_rotated_rectangle;corners=list(rect.exterior.coords)[:-1];a,b=corners[0],corners[1];ww=math.dist(a,b);dd=math.dist(b,corners[2]);
   if ww<dd:a,b=corners[1],corners[2];ww,dd=dd,ww
   x,z=rect.centroid.x,rect.centroid.y;i=index(x,z);yaw=math.atan2(b[1]-a[1],-(b[0]-a[0]));toward=[pts[i][0]-x,pts[i][1]-z]
   if math.sin(yaw)*toward[0]+math.cos(yaw)*toward[1]<0:yaw+=math.pi
   if rect.intersects(road.buffer(1.4))or rect.intersects(pitpoly):continue
   stands.append({'index':i,'x':round(x,3),'z':round(z,3),'yaw':round(yaw,6),'width':round(ww,3),'depth':round(dd,3),'rows':max(3,min(24,round(dd/1.7))),'roof':f['tags'].get('roof:shape')not in[None,'none']or f['tags'].get('covered')=='yes','footprint':[[round(v,3)for v in q]for q in corners],'osm_id':f['osm_id'],'name':f['tags'].get('name','Mapped grandstand'),'evidence':'mapped footprint; current-photo corroboration; historical structure not established'})
  elif f['type']=='barrier':
   for a,b in zip(xy,xy[1:]):
    seg=LineString([a,b]);mid=seg.interpolate(.5,normalized=True)
    if seg.length<.3 or seg.length>140 or roadline.distance(mid)>85 or seg.buffer(.35).intersects(road.buffer(1.4))or seg.buffer(.35).intersects(pitpoly):continue
    i=index(mid.x,mid.y);tags=f['tags'];kind='armco'if tags['barrier']=='guard_rail'else 'concrete';mapped_barriers.append({'index':i,'a':a,'b':b,'radius':.27,'height':.95 if kind=='armco'else 1.25,'kind':kind,'fence':tags['barrier']=='fence','osm_id':f['osm_id']})
  elif f['type']=='runoff'and len(xy)>=4 and xy[0]==xy[-1] and not any(k in f['tags']for k in ['highway','amenity','leisure','sport'])and f['tags'].get('natural')!='beach':
   poly=Polygon(xy).buffer(0)
   if poly.is_empty or poly.area<50 or poly.area>60000 or poly.distance(roadline)>45:continue
   gravel.append((poly,f['osm_id']))
 # Monaco temporary harbour stands are absent from OSM. Their known viewing
 # areas are explicitly anchored, not six automatic boxes around the streets.
 if ti==1:
  for name,fraction,side,width,depth in [('Tribune K / Tabac viewing area',.72,1,36,10),('Piscine viewing area',.84,1,30,10),('Pit-straight viewing area',.98,-1,30,10)]:
   i=int(fraction*n);cx,cz=section(i,side*(w+depth/2+10));a,b=pts[(i-1)%n],pts[(i+1)%n];yaw=math.atan2(b[0]-a[0],b[1]-a[1])-side*math.pi/2
   footprint=[[cx+xx*math.cos(yaw)+zz*math.sin(yaw),cz-xx*math.sin(yaw)+zz*math.cos(yaw)]for xx,zz in[(-width/2,-depth/2),(width/2,-depth/2),(width/2,depth/2),(-width/2,depth/2)]];poly=Polygon(footprint)
   if poly.intersects(protected.buffer(.3))or poly.intersects(building):continue
   stands.append({'index':i,'x':round(cx,3),'z':round(cz,3),'yaw':round(yaw,6),'width':width,'depth':depth,'rows':max(4,round(depth/1.7)),'roof':False,'footprint':footprint,'osm_id':0,'name':name,'evidence':'photo-referenced viewing area; dimensions/temporary stand extent estimated'})
 # Tyre rows are now tied to named escape-area ends, not 18 arbitrary bends.
 for ci,(name,start,end,depth)in enumerate(C[ti]):
  if depth<15:continue
  mid=round((start+end)*n/2);aa,bb,cc=pts[(mid-5)%n],pts[mid],pts[(mid+5)%n];cross=(bb[0]-aa[0])*(cc[1]-bb[1])-(bb[1]-aa[1])*(cc[0]-bb[0]);side=1 if cross>0 else -1
  a,b=section(mid-2,side*(w+depth+2)),section(mid+2,side*(w+depth+2));capsule=LineString([a,b]).buffer(.8)
  if capsule.intersects(unary_union([protected.buffer(1.4),building.buffer(.5)])):continue
  mapped_barriers.append({'index':mid,'a':a,'b':b,'radius':.52,'height':1.18,'kind':'tyres','fence':False,'osm_id':0,'evidence':'photo-referenced escape-area end; row extent/offset estimated'})
 profiles=[]
 for era,year in enumerate([1967,1988,2004,2023]):
  kerbs=[];runoffs=[]
  for ci,(name,start,end,depth)in enumerate(C[ti]):
   first,last=round(start*n),min(n-1,round(end*n));mid=(first+last)//2;a=pts[(mid-5)%n];b=pts[mid];c=pts[(mid+5)%n];cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);outside=1 if cross>0 else -1
   # Explicit corner-by-corner widths, not a uniform 0.8 m box at every point.
   width=[.42,.7,1.0,1.25][era]+[0,.18,.35,-.1][ci%4];height=[.06,.09,.065,.055][era];shape='ramp'
   high=era>0 and ci%3==0 and ti!=1
   if high:height=[.06,.13,.15,.17][era];shape='raised'
   kerbs.append({'name':name+' apex','start_index':first,'end_index':last,'side':-outside,'width':round(width,3),'height':height,'shape':shape,'color_a':'#b3392d','color_b':'#e5c33c'if ti==0 else '#eee9da','source':'corner photos/maps; cross-section dimensions estimated'})
   if era>0:kerbs.append({'name':name+' exit','start_index':mid,'end_index':min(n-1,last+max(2,(last-first)//3)),'side':outside,'width':round(width*1.25,3),'height':.035 if era==3 else .055,'shape':'ramp','color_a':'#b3392d','color_b':'#eee9da','source':'corner photos/maps; cross-section dimensions estimated'})
   if not depth:continue
   outer=[];inner=[];span=max(1,last-first)
   for i in range(first,last+1,2):
    fade=max(0,math.sin(math.pi*(i-first)/span))**.65;inner.append(section(i,outside*(w+width+.6)));outer.append(section(i,outside*(w+width+.6+depth*fade)))
   if len(inner)<2:continue
   poly=Polygon(inner+outer[::-1]).buffer(0).difference(unary_union([protected.buffer(.2),building.buffer(.5)]))
   if era==3 and gravel:poly=poly.difference(unary_union([g for g,_ in gravel]))
   kind='grass'if era==0 else 'gravel'
   if ti==1:kind='asphalt'
   elif era==3 and (ti in[3,5,7]or(ti==2 and name=='Parabolica')or(ti==0 and name=='Bus Stop')):kind='asphalt'
   for part in getattr(poly,'geoms',[poly]):
    if part.geom_type!='Polygon'or part.area<12:continue
    triangles=[[[round(x,3),round(z,3)]for x,z in list(tri.exterior.coords)[:3]]for tri in triangulate(part)if part.covers(tri)]
    if triangles:runoffs.append({'name':name+' escape area','index':mid,'kind':kind,'triangles':triangles,'evidence':'photo-referenced corner zone; authored approximate extent, not surveyed'})
  # Actual mapped gravel trap polygons replace overlapping authored strips in
  # the latest scene. Earlier presets never silently inherit 2026 gravel works.
  if era==3:
   for poly,way in gravel:
    poly=poly.difference(unary_union([protected.buffer(.2),building.buffer(.5)]));centre=poly.centroid;i=index(centre.x,centre.y)
    for part in getattr(poly,'geoms',[poly]):
     if part.geom_type!='Polygon':continue
     triangles=[[[round(x,3),round(z,3)]for x,z in list(tri.exterior.coords)[:3]]for tri in triangulate(part)if part.covers(tri)]
     if triangles:runoffs.append({'name':'Mapped gravel trap','index':i,'kind':'gravel','triangles':triangles,'osm_id':way,'evidence':'OSM gravel polygon, 2026 snapshot; latest-scene substitution for 2023'})
  # Never assert current OSM grandstand footprints existed in a historical year.
  # Unsupported historical alignments/facility extents remain labelled substitutes.
  label=f'{year} surface preset · '+('recent mapped alignment'if era==3 else 'recent-layout substitute')
  notes='Historical road routing and stand/building extents are not reconstructed. This is an era-inspired corner-surface preset on the earliest supported mapped road alignment.'if era<3 else 'Reference dates differ by circuit (2004–2026); positions are map/photo-referenced approximations, not surveys.'
  if ti==8 and era==0:notes='Montréal circuit opened in 1978. Labelled recent-layout substitute for the 1967 car. '+notes
  if ti==7 and era==0:notes='Nürburgring GP-Strecke opened in 1984; this is not the 1967 Nordschleife. '+notes
  profiles.append({'year':year,'label':label,'geometry_status':'recent-layout substitute'if era<3 else 'mapped recent layout','notes':notes,'kerbs':kerbs,'runoffs':runoffs})
 inspected=['Spa-Francorchamps.jpg','Monaco-1.jpg','Monza.jpg','Silverstone.jpg','Suzuka.jpg','Brazil.jpg','Imola-1.jpg',None,'Canada-1.jpg',None][ti]
 if inspected:photo_evidence={'url':'https://oversteer48.com/f1-circuits-from-space/','image_url':'https://oversteer48.com/wp-content/uploads/2024/02/'+inspected,'page_updated':'2024-02-07','image_date':'not established; do not equate page date with image date'}
 elif ti==7:photo_evidence={'url':'https://www.kuladig.de/Objektansicht/O-84193-20140128-3','image_date':'2016; corroborates start/T1 stand and limited Mercedes Arena escapes','additional_reference':'https://inlandstourismus.de/der-nuerburgring'}
 else:photo_evidence={'url':'https://fly-foto.de/luftbild/album/hockenheim/','additional_reference':'https://fly-foto.de/luftbild/haupttribuene-des-hockenheimring-baden-wuerttemberg-2017-08-24-img-102548-jpg/','image_date':'2017-08-24 for linked main-stand view; other album image dates not established'}
 output.append({'inspected_photo':photo_evidence,'id':t['id'],'name':t['name'],'photo':{'url':refs[ti][0],'file':refs[ti][1],'year':refs[ti][2],'observations':refs[ti][3],'redistributed':False},'history_url':'https://www.racingcircuits.info/','grandstands':stands,'barriers':mapped_barriers,'profiles':profiles})
 print(t['name'],len(stands),'mapped/photo stands',len(mapped_barriers),'mapped barrier pieces',[(p['year'],len(p['kerbs']),len(p['runoffs']))for p in profiles])
from spa_reference import refine
refine(T,output)
from monaco_reference import refine as refine_monaco
refine_monaco(T,output)
from piscine_reference import refine as refine_piscine
refine_piscine(T,output)
from photo_track_refine import refine as refine_photo_audit
refine_photo_audit(T,output)
(ROOT/'data/corner-details.json').write_text(json.dumps({'source':'Map/photo-referenced corner details. Historical SURFACING presets, not full historical road alignments. Every recent-layout substitution is labelled in-game. Geometry/kerb heights are approximate. OSM data © OpenStreetMap contributors, ODbL-1.0; Original scenery references are not redistributed; separately credited audit photos retain their individual licenses.','tracks':output},separators=(',',':')))

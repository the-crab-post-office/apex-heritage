#!/usr/bin/env python3
"""Original photo-guided meshes for the 1967 and 2023 silhouettes.
No photo pixels or third-party meshes. Shared by web and native renderers.
Units metres; +Z forward. Wheels remain separate, driven by contact geometry.
"""
import json, math
from pathlib import Path
R=Path(__file__).resolve().parents[1]
TAU=math.tau
LAYOUTS={'0':dict(half=.82,front=1.12,rear=-1.1,front_width=.22,rear_width=.34,radius=.34),'3':dict(half=.90,front=1.65,rear=-1.75,front_width=.34,rear_width=.44,radius=.38)}
class Model:
 def __init__(self):self.parts=[]
 def mesh(self,name,mat,p,tri,uv=None,wheel=None):
  self.parts.append(dict(name=name,material=mat,positions=[[round(v,5) for v in q] for q in p],indices=tri,uvs=uv or [[0,0]for _ in p],wheel=wheel))
 def loft(self,name,mat,sections,steps=32,opening=False):
  p=[];uv=[];idx=[]
  for z,w,y,h,*extra in sections:
   cx=extra[0]if extra else 0
   for j in range(steps+1):
    a=TAU*j/steps;p.append([cx+math.sin(a)*w,y+math.cos(a)*h,z]);uv.append([round((.5 if mat=='pods'else 0)+j/steps*.5,5),round((2.6-z)/10.4,5)])
  for i in range(len(sections)-1):
   for j in range(steps):
    if opening and (j<steps*.15 or j>=steps*.85):continue
    k=i*(steps+1)+j;idx.extend([k,k+steps+1,k+1,k+1,k+steps+1,k+steps+2])
  self.mesh(name,mat,p,idx,uv)
 def tube(self,name,mat,points,r=.018,steps=8):
  p=[];idx=[]
  for i,c in enumerate(points):
   a=points[max(0,i-1)];b=points[min(len(points)-1,i+1)];v=[b[k]-a[k]for k in range(3)];l=math.sqrt(sum(q*q for q in v));v=[q/l for q in v];ref=[0,1,0]if abs(v[1])<.9 else[1,0,0]
   u=[v[1]*ref[2]-v[2]*ref[1],v[2]*ref[0]-v[0]*ref[2],v[0]*ref[1]-v[1]*ref[0]];l=math.sqrt(sum(q*q for q in u));u=[q/l for q in u];w=[v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0]]
   for j in range(steps+1):p.append([c[k]+r*(math.cos(j/steps*TAU)*u[k]+math.sin(j/steps*TAU)*w[k])for k in range(3)])
  for i in range(len(points)-1):
   for j in range(steps):k=i*(steps+1)+j;idx.extend([k,k+1,k+steps+1,k+1,k+steps+2,k+steps+1])
  self.mesh(name,mat,p,idx)
 def ellipsoid(self,name,mat,c,s):
  p=[];idx=[]
  for i in range(13):
   a=math.pi*i/12
   for j in range(25):
    b=TAU*j/24;p.append([c[0]+s[0]*math.sin(a)*math.cos(b),c[1]+s[1]*math.cos(a),c[2]+s[2]*math.sin(a)*math.sin(b)])
  for i in range(12):
   for j in range(24):k=i*25+j;idx.extend([k,k+25,k+1,k+1,k+25,k+26])
  self.mesh(name,mat,p,idx)
 def box(self,name,mat,c,s):
  x,y,z=c;w,h,d=[v/2 for v in s];p=[[x+a*w,y+b*h,z+e*d]for a,b,e in[(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]];self.mesh(name,mat,p,[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5])
 def wing(self,name,z,half,y,chord,mat='wing',rear=False):
  # Closed cambered airfoil with continuous curved tips, not stacked boxes.
  p=[];uv=[];idx=[];nx=40;nc=16
  for j in range(nx+1):
   x=-half+2*half*j/nx;t=abs(x/half);dihedral=(.11*t**5 if rear else .15*t**3);sweep=(.13*t*t if rear else -.26*t*t)
   for k in range(nc+1):
    a=TAU*k/nc;f=(1-math.cos(a))/2;zz=z+sweep+(f-.5)*chord;yy=y+dihedral+(.10 if rear else .055)*math.sin(math.pi*f)+(.12*f if rear else 0)+.014*math.sin(a)
    p.append([x,yy,zz]);uv.append([round(.5+j/nx*.25 if mat=='front_wing'else j/nx*.5,5),round(.5+f*.25,5)])
  for j in range(nx):
   for k in range(nc):q=j*(nc+1)+k;idx.extend([q,q+1,q+nc+1,q+1,q+nc+2,q+nc+1])
  self.mesh(name,mat,p,idx,uv)
 def ring(self,name,mat,z,y,rx,ry,tube=.025):
  self.tube(name,mat,[[math.cos(i/48*TAU)*rx,y+math.sin(i/48*TAU)*ry,z]for i in range(49)],tube,10)
 def wheels(self,classic):
  # Rounded tyre shoulders, dished rims and sidewall compound stripe.
  for typ in ['front','rear']:
   layout=LAYOUTS['0'if classic else'3'];radius=layout['radius'];width=layout[typ+'_width']
   p=[];uv=[];idx=[]
   profile=[(-.5,.60),(-.53,.74),(-.5,.89),(-.40,.98),(-.25,1),(0,1),(.25,1),(.40,.98),(.5,.89),(.53,.74),(.5,.60)]
   for i,(x,r)in enumerate(profile):
    for j in range(65):a=j/64*TAU;p.append([x*width,math.cos(a)*radius*r,math.sin(a)*radius*r]);uv.append([j/64,(r-.6)/.4])
   for i in range(len(profile)-1):
    for j in range(64):q=i*65+j;idx.extend([q,q+1,q+65,q+1,q+66,q+65])
   self.mesh(typ+' rounded tyre','rubber',p,idx,uv,typ)
   for side in [-1,1]:
    p=[];uv=[];idx=[]
    for rr in [.70,.94]:
     for j in range(65):
      a=j/64*TAU;p.append([side*width*.54,math.cos(a)*radius*rr,math.sin(a)*radius*rr]);uv.append([j/64,round(.75+(rr-.61)/.38*.25,5)])
    for j in range(64):idx.extend([j,j+1,j+65,j+1,j+66,j+65])
    self.mesh(typ+' sidewall lettering','tyre',p,idx,uv,typ)
    # Rim lip ring and inset dark wheel barrel.
    for rr,mat,r in[(.61,'rim',.015),(.88,'compound',.008 if not classic else .003)]:
     pts=[[side*width*.508,math.cos(i/64*TAU)*radius*rr,math.sin(i/64*TAU)*radius*rr]for i in range(65)];start=len(self.parts);self.tube(typ+' rim lip'if mat=='rim'else typ+' sidewall ring',mat,pts,r)
     self.parts[-1]['wheel']=typ
    p=[[side*width*.46,0,0]]+[[side*width*.48,math.cos(i/48*TAU)*radius*.61,math.sin(i/48*TAU)*radius*.61]for i in range(49)];idx=[]
    for j in range(48):idx.extend([0,j+1,j+2])
    self.mesh(typ+' wheel dish','rim'if classic else'carbon',p,idx,wheel=typ)
    for j in range(8 if classic else 12):
     a=j/(8 if classic else 12)*TAU;self.tube(typ+' wheel spoke','rim',[[side*width*.5,math.cos(a)*radius*.12,math.sin(a)*radius*.12],[side*width*.49,math.cos(a)*radius*.56,math.sin(a)*radius*.56]],.012,5);self.parts[-1]['wheel']=typ
 def driver(self,classic):
  y=.93 if classic else .87
  self.ellipsoid('recessed seat','rubber',[0,y-.18,-.02],[.22,.18,.32]);self.ellipsoid('driver helmet','helmet',[0,y,.12],[.145,.18,.17]);self.ellipsoid('dark visor','rubber',[0,y+.02,.262],[.135,.063,.045])
  self.ring('steering wheel','carbon',.43,y-.14,.15,.11,.018)
 def build(self,classic):
  if classic:
   # Cigar monocoque with a genuinely open oval radiator and cockpit.
   self.loft('rounded cigar nose','body',[[2.02,.245,.36,.13],[1.87,.29,.37,.19],[1.4,.31,.39,.22],[.88,.33,.42,.24],[.48,.335,.45,.25]])
   self.loft('open cockpit monocoque','body',[[.48,.335,.45,.25],[.1,.355,.46,.25],[-.42,.35,.45,.24],[-.72,.30,.43,.22]],opening=True)
   self.loft('tail fuel cell','body',[[-.72,.3,.43,.22],[-1.,.23,.4,.19],[-1.6,.13,.36,.12],[-1.86,.08,.35,.07]])
   self.ring('yellow oval radiator surround','accent',2.025,.36,.247,.132,.024)
   # Black recessed opening is behind the lip, not an opaque painted pointed nose.
   self.ellipsoid('radiator cavity','rubber',[0,.36,1.996],[.23,.118,.015])
   for side in [-1,1]:
    self.tube('cockpit rolled edge','rim',[[side*.27,.65,.43],[side*.31,.66,.12],[side*.31,.65,-.35],[side*.24,.61,-.7]],.014)
    self.box('exposed cam cover','engine',[side*.18,.66,-1.06],[.18,.15,.88])
    for j in range(9):self.box('cam cover cooling rib','rim',[side*.18,.741,-.69-j*.09],[.17,.013,.025])
    for j in range(4):
     z=-.74-j*.19;self.tube('inlet trumpet','rim',[[side*.12,.74,z],[side*.15,.85,z]],.04,10)
     self.tube('exposed exhaust header','exhaust',[[side*.28,.65,z],[side*.42,.48,z-.12],[side*.40,.32,-1.7],[side*.39,.32,-2.08]],.023,8)
    self.tube('rear radius arm','rim',[[side*.28,.38,-.52],[side*.81,.37,-1.1]],.016)
   self.tube('chrome roll hoop','rim',[[-.21,.61,-.48],[-.18,.96,-.48],[-.10,1.08,-.48],[.10,1.08,-.48],[.18,.96,-.48],[.21,.61,-.48]],.022,10)
  else:
   self.loft('slender raised nose','body',[[2.66,.065,.30,.055],[2.42,.105,.35,.075],[1.9,.15,.43,.09],[1.2,.20,.49,.12],[.65,.28,.5,.18],[.32,.34,.49,.22]])
   self.loft('cockpit survival cell','body',[[.32,.34,.49,.22],[-.12,.365,.48,.23],[-.64,.35,.47,.25],[-.9,.31,.46,.25]],opening=True)
   self.loft('tapered engine cover','body',[[-.72,.27,.58,.28],[-.92,.29,.72,.40],[-1.16,.24,.65,.36],[-1.6,.17,.46,.24],[-2.17,.08,.29,.12]])
   for side in [-1,1]:
    self.loft('undercut sidepod','pods',[[-1.95,.09,.27,.10,side*.32],[-1.5,.19,.32,.14,side*.48],[-.9,.25,.41,.20,side*.62],[-.32,.28,.49,.20,side*.64],[.26,.29,.56,.14,side*.61],[.54,.27,.60,.085,side*.58]])
    self.ellipsoid('high sidepod inlet','rubber',[side*.59,.602,.555],[.23,.045,.018])
    self.loft('floor venturi edge','carbon',[[-2.05,.09,.15,.035,side*.78],[-1.25,.15,.14,.035,side*.82],[.5,.14,.14,.035,side*.81],[.8,.05,.15,.035,side*.75]])
    self.tube('floor raised lip','carbon',[[side*.94,.18,.6],[side*.98,.16,-.2],[side*.98,.16,-1.2],[side*.87,.2,-1.85]],.018)
    # Mirror stalks and streamlined housings.
    self.tube('mirror stalk','carbon',[[side*.32,.65,.28],[side*.65,.72,.47]],.015)
    self.ellipsoid('mirror housing','carbon',[side*.67,.73,.49],[.12,.055,.075])
    self.tube('front nose pylon','carbon',[[side*.09,.33,2.25],[side*.15,.16,2.31]],.025)
   self.box('venturi floor centre','carbon',[0,.14,-.5],[1.65,.055,3.15])
   self.wing('spoon front mainplane',2.39,1.13,.14,.40,'carbon')
   for i in range(3):self.wing('curved front flap '+str(i),2.24-i*.105,1.09-i*.025,.19+i*.045,.17,'front_wing'if i==0 else'carbon')
   for side in [-1,1]:
    self.tube('rolled front tip','carbon',[[side*1.13,.27,2.45],[side*1.12,.39,2.32],[side*1.07,.43,2.02]],.032)
    self.tube('rear swan neck support','carbon',[[side*.19,.29,-1.8],[side*.19,.94,-2.02],[side*.19,1.02,-2.26]],.027)
   self.wing('continuous curved rear mainplane',-2.26,.88,1.05,.44,'wing',True)
   self.wing('rear DRS flap',-2.39,.87,1.19,.25,'wing',True)
   self.wing('rear beam wing',-2.12,.72,.5,.24,'carbon',True)
   for side in [-1,1]:
    self.tube('rounded rear wing endplate','carbon',[[side*.88,.64,-2.04],[side*.92,.97,-2.1],[side*.88,1.17,-2.23],[side*.87,1.28,-2.45]],.036,10)
    for i in range(3):self.box('diffuser fence','carbon',[side*(.25+i*.19),.23,-1.93],[.018,.16,.48])
   self.tube('halo surround','carbon',[[.35,.68,-.42],[.36,1.02,-.23],[.31,1.06,.27],[.16,1.07,.48],[0,1.07,.55],[-.16,1.07,.48],[-.31,1.06,.27],[-.36,1.02,-.23],[-.35,.68,-.42]],.042,10)
   self.tube('halo centre pillar','carbon',[[0,.57,.65],[0,1.07,.55]],.037,10)
   self.loft('airbox fairing','body',[[-.96,.14,.96,.23],[-.72,.16,1.04,.25],[-.55,.13,1.04,.19]])
   self.ellipsoid('airbox dark opening','rubber',[0,1.07,-.53],[.107,.13,.017])
   self.ring('airbox intake lip','accent',-.512,1.07,.11,.133,.015)
   self.tube('titanium exhaust','exhaust',[[0,.44,-1.8],[0,.42,-2.25]],.043,12)
  for side in [-1,1]:
   for front in [True,False]:
    layout=LAYOUTS['0'if classic else'3'];z=layout['front'if front else'rear'];track=layout['half']
    for y in [.25,.49 if classic else .57]:
     for dz in [-.32,.32]:self.tube('wishbone','rim'if classic else'carbon',[[side*(.26 if classic else .29),y,z+dz],[side*(track-.06),.34 if classic else .38,z]],.012 if classic else .015,6)
    if classic:
     self.tube('exposed coilover','engine',[[side*.35,.56,z-.12],[side*.63,.30,z]],.031,10)
  self.driver(classic);self.wheels(classic)
  return self.parts
models={str(e):Model().build(e==0) for e in [0,3]}
# Consolidate meshes by material and wheel. Names survive as semantic component list.
for era,parts in models.items():
 batches={}
 for part in parts:
  key=(part['material'],part['wheel']);b=batches.setdefault(key,dict(material=part['material'],wheel=part['wheel'],positions=[],indices=[],uvs=[],components=[]));offset=len(b['positions']);b['components'].append(part['name']);b['positions']+=part['positions'];b['uvs']+=part['uvs'];b['indices'] += [v+offset for v in part['indices']]
 models[era]=list(batches.values())
(R/'data/car-layouts.json').write_text(json.dumps(LAYOUTS,separators=(',',':'))+'\n')
path=R/'data/car-shapes.json';path.write_text(json.dumps(dict(schema=1,source='Original procedural reconstruction guided by user-supplied 2023 frontal and 1967 three-quarter photographs; not scans or licensed chassis.',models=models,layouts=LAYOUTS),separators=(',',':'))+'\n')
print('Shared car geometry:',path.stat().st_size,'bytes;',[(e,sum(len(b['positions'])for b in m))for e,m in models.items()])

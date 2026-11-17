#!/usr/bin/env python3
"""Original detailed meshes for all five era silhouettes.
No photo pixels or third-party meshes. Shared by web and native renderers.
Units metres; +Z forward. Wheels remain separate, driven by contact geometry.
"""
import json, math
from pathlib import Path
R=Path(__file__).resolve().parents[1]
TAU=math.tau
LAYOUTS={'1':dict(half=.85,front=1.43,rear=-1.44,front_width=.30,rear_width=.44,radius=.33),'2':dict(half=.72,front=1.52,rear=-1.53,front_width=.305,rear_width=.365,radius=.33),'0':dict(half=.82,front=1.12,rear=-1.1,front_width=.22,rear_width=.34,radius=.33,front_radius=.29,rear_radius=.33),'3':dict(half=.80,front=1.75,rear=-1.85,front_width=.305,rear_width=.405,radius=.36),'4':dict(half=.80,front=1.74,rear=-1.86,front_width=.305,rear_width=.405,radius=.335)}
class Model:
 def __init__(self,era=3):self.parts=[];self.era=era
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
  # End bulkheads are explicit, with separate normals (not open loft holes).
  for end,sign in [(0,-1),(len(sections)-1,1)]:
   if name=='rounded cigar nose' and end==0:continue # intentional radiator opening
   ring=p[end*(steps+1):(end+1)*(steps+1)];center=[sum(q[k]for q in ring[:-1])/steps for k in range(3)];offset=len(p);p.append(center);uv.append([.25,(2.6-center[2])/10.4])
   p.extend(ring);uv.extend([[.25,(2.6-center[2])/10.4]for _ in ring])
   for j in range(steps):idx.extend([offset,offset+j+1,offset+j+2]if sign>0 else[offset,offset+j+2,offset+j+1])
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
  x,y,z=c;w,h,d=[v/2 for v in s];corners=[[x+a*w,y+b*h,z+e*d]for a,b,e in[(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]];p=[];idx=[]
  for face in [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]:
   k=len(p);p.extend([corners[i]for i in face]);idx.extend([k,k+1,k+2,k,k+2,k+3])
  self.mesh(name,mat,p,idx)
 def panel(self,name,mat,x,outline,thickness=.025):
  # Closed side plate; outline is a convex polygon in (z,y), not a wire rod.
  p=[];idx=[];n=len(outline)
  for side in [-1,1]:
   offset=len(p);p.extend([[x+side*thickness/2,y,z]for z,y in outline])
   for j in range(1,n-1):idx.extend([offset,offset+j,offset+j+1]if side>0 else[offset,offset+j+1,offset+j])
  for j in range(n):
   k=len(p);q=(j+1)%n;p.extend([[x-thickness/2,outline[j][1],outline[j][0]],[x+thickness/2,outline[j][1],outline[j][0]],[x+thickness/2,outline[q][1],outline[q][0]],[x-thickness/2,outline[q][1],outline[q][0]]]);idx.extend([k,k+1,k+2,k,k+2,k+3])
  self.mesh(name,mat,p,idx)
 def wing(self,name,z,half,y,chord,mat='wing',rear=False):
  # Closed cambered airfoil with continuous curved tips, not stacked boxes.
  p=[];uv=[];idx=[];nx=40;nc=16
  for j in range(nx+1):
   x=-half+2*half*j/nx;t=abs(x/half);dihedral=(.11*t**5 if rear else .15*t**3)if self.era==3 else(0 if rear or self.era==1 else .035*t*t);sweep=(.13*t*t if rear else -.26*t*t)if self.era==3 else(0 if self.era==1 else -.07*t*t)
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
   layout=LAYOUTS[str(self.era)];radius=layout.get(typ+'_radius',layout['radius']);width=layout[typ+'_width'];rimratio=.635 if self.era==3 else .493 if self.era==4 else .50
   p=[];uv=[];idx=[]
   profile=[(-.5,rimratio),(-.53,.74),(-.5,.89),(-.40,.98),(-.25,1),(0,1),(.25,1),(.40,.98),(.5,.89),(.53,.74),(.5,rimratio)]
   for i,(x,r)in enumerate(profile):
    for j in range(65):a=j/64*TAU;p.append([x*width,math.cos(a)*radius*r,math.sin(a)*radius*r]);uv.append([j/64,(r-.6)/.4])
   for i in range(len(profile)-1):
    for j in range(64):q=i*65+j;idx.extend([q,q+1,q+65,q+1,q+66,q+65])
   self.mesh(typ+' rounded tyre','rubber',p,idx,uv,typ)
   for side in [-1,1]:
    p=[];uv=[];idx=[]
    for rr in [.70,.94]:
     for j in range(65):
      a=j/64*TAU;p.append([side*width*.54,math.cos(a)*radius*rr,math.sin(a)*radius*rr]);uv.append([j/64,round(.75+(rr-.70)/.24*.15,5)])
    for j in range(64):idx.extend([j,j+1,j+65,j+1,j+66,j+65])
    self.mesh(typ+' sidewall lettering','tyre',p,idx,uv,typ)
    # Rim lip ring and inset dark wheel barrel.
    for rr,mat,r in[(rimratio,'rim',.015),(.88,'compound',.008 if not classic else .003)]:
     pts=[[side*width*.508,math.cos(i/64*TAU)*radius*rr,math.sin(i/64*TAU)*radius*rr]for i in range(65)];start=len(self.parts);self.tube(typ+' rim lip'if mat=='rim'else typ+' sidewall ring',mat,pts,r)
     self.parts[-1]['wheel']=typ
    p=[[side*width*.46,0,0]]+[[side*width*.48,math.cos(i/48*TAU)*radius*rimratio,math.sin(i/48*TAU)*radius*rimratio]for i in range(49)];idx=[]
    for j in range(48):idx.extend([0,j+1,j+2])
    self.mesh(typ+' wheel dish','rim'if classic else'carbon',p,idx,wheel=typ)
    if self.era==3:
     p=[[side*width*.522,0,0]]+[[side*width*.520,math.cos(i/64*TAU)*radius*.59,math.sin(i/64*TAU)*radius*.59]for i in range(65)];idx=[]
     for j in range(64):idx.extend([0,j+1,j+2])
     self.mesh(typ+' aerodynamic wheel cover','carbon',p,idx,wheel=typ)
    for j in range(0 if self.era==3 else(8 if classic else 12)):
     a=j/(8 if classic else 12)*TAU;self.tube(typ+' wheel spoke','rim',[[side*width*.5,math.cos(a)*radius*.12,math.sin(a)*radius*.12],[side*width*.49,math.cos(a)*radius*(rimratio-.05),math.sin(a)*radius*(rimratio-.05)]],.012,5);self.parts[-1]['wheel']=typ
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
   self.wing('spoon front mainplane',2.39,1.0,.14,.40,'carbon')
   for i in range(3):self.wing('curved front flap '+str(i),2.24-i*.105,.975-i*.025,.19+i*.045,.17,'front_wing'if i==0 else'carbon')
   for side in [-1,1]:
    self.tube('rolled front tip','carbon',[[side*1.0,.27,2.45],[side*.99,.39,2.32],[side*.96,.43,2.02]],.032)
    self.tube('rear swan neck support','carbon',[[side*.19,.29,-1.8],[side*.19,.94,-2.02],[side*.19,1.02,-2.26]],.027)
   self.wing('continuous curved rear mainplane',-2.26,.88,1.05,.44,'wing',True)
   self.wing('rear DRS flap',-2.39,.87,1.19,.25,'wing',True)
   self.wing('rear beam wing',-2.12,.72,.5,.24,'carbon',True)
   for side in [-1,1]:
    self.tube('rounded rear wing endplate','carbon',[[side*.88,.64,-2.04],[side*.92,.97,-2.1],[side*.88,1.17,-2.23],[side*.87,1.28,-2.45]],.036,10)
    for i in range(3):self.box('diffuser fence','carbon',[side*(.25+i*.19),.23,-1.93],[.018,.16,.48])
   self.tube('halo surround','carbon',[[.35,.68,-.42],[.36,1.02,-.23],[.31,1.06,.27],[.16,1.07,.48],[0,1.07,.55],[-.16,1.07,.48],[-.31,1.06,.27],[-.36,1.02,-.23],[-.35,.68,-.42]],.042,10)
   self.tube('halo centre pillar','carbon',[[0,.57,.65],[0,1.07,.55]],.037,10)
   self.loft('airbox fairing','body',[[-.96,.14,.88,.17],[-.72,.16,.95,.19],[-.55,.13,.97,.15]])
   self.ellipsoid('airbox dark opening','rubber',[0,.98,-.53],[.107,.105,.017])
   self.ring('airbox intake lip','accent',-.512,.98,.11,.109,.015)
   self.tube('titanium exhaust','exhaust',[[0,.44,-1.8],[0,.42,-2.25]],.043,12)
  for side in [-1,1]:
   for front in [True,False]:
    layout=LAYOUTS[str(self.era)];z=layout['front'if front else'rear'];track=layout['half']
    for y in [.25,.49 if classic else .57]:
     for dz in [-.32,.32]:self.tube('wishbone','rim'if classic else'carbon',[[side*(.26 if classic else .29),y,z+dz],[side*(track-.06),.34 if classic else .38,z]],.012 if classic else .015,6)
    if classic:
     self.tube('exposed coilover','engine',[[side*.35,.56,z-.12],[side*.63,.30,z]],.031,10)
  self.driver(classic);self.wheels(classic)
  return self.parts
PERIOD_PODS={1:[[-1.6,.09,.28,.11,.35],[-1.15,.21,.33,.15,.51],[-.4,.25,.36,.16,.54],[.5,.23,.38,.14,.54]],2:[[-1.6,.07,.29,.11,.33],[-1.15,.18,.35,.16,.47],[-.4,.24,.43,.19,.55],[.5,.22,.48,.16,.55]]}
def period_car(m,era):
 turbo=era==1
 m.loft('1988 low turbo monocoque'if turbo else'2004 high-nose monocoque','body',[[2.18,.07,.26 if turbo else .48,.07],[1.75,.12,.30 if turbo else .53,.10],[.85,.25,.43 if turbo else .57,.18],[.40,.33,.48,.22]])
 m.loft('open period cockpit','body',[[.40,.33,.48,.22],[.10,.37,.49,.25],[-.50,.35,.47,.24],[-.83,.30,.46,.23]],opening=True)
 m.loft('low turbo engine cowl'if turbo else'V10 engine cover','body',[[-.66,.29,.56,.28],[-.95,.27,.76 if not turbo else .60,.41 if not turbo else .24],[-1.5,.18,.49,.22],[-1.95,.09,.33,.12]])
 m.box('flat carbon floor','carbon',[0,.16,-.15],[1.65,.055,3.25])
 for side in [-1,1]:
  m.loft('1988 slab sidepod'if turbo else'2004 coke-bottle sidepod','pods',[[z,w,cy,h,side*cx]for z,w,cy,h,cx in PERIOD_PODS[era]])
  m.ellipsoid('recessed radiator mouth','rubber',[side*(.54 if turbo else .55),.40 if turbo else .49,.515],[.20,.085,.015])
  m.tube('period mirror stalk','carbon',[[side*.32,.61,.35],[side*.60,.70,.43]],.016)
  m.ellipsoid('period mirror shell','body',[side*.62,.72,.44],[.095,.055,.10])
  m.panel('front wing closed endplate','front_wing',side*.99,[(1.80,.12),(2.42,.12),(2.42,.40),(1.86,.40)])
  m.panel('rear wing closed endplate','wing',side*.88,[(-2.25,.64),(-1.65,.64),(-1.65,1.29),(-2.25,1.29)])
  m.tube('rear wing pylon','carbon',[[side*.3,.30,-1.67],[side*.3,1.04,-1.94]],.025)
  if turbo:
   for j in range(5):m.box('turbo cooling outlet','rubber',[side*.67,.695,-.70-j*.12],[.26,.012,.04])
   m.tube('turbo exhaust outlet','exhaust',[[side*.28,.35,-1.4],[side*.36,.31,-2.0]],.035)
  else:
   m.panel('2004 bargeboard','carbon',side*.56,[(.65,.16),(.92,.20),(.84,.65),(.54,.65)])
   m.loft('2004 sidepod shoulder','pods',[[-.9,.22,.65,.10,side*.60],[-.1,.29,.70,.10,side*.63],[.4,.25,.64,.10,side*.61]])
   m.tube('V10 exhaust chimney','exhaust',[[side*.37,.47,-1.13],[side*.37,.76,-1.40]],.038)
  for z in [LAYOUTS[str(era)]['front'],LAYOUTS[str(era)]['rear']]:
   for y in [.24,.54]:
    for dz in [-.28,.28]:m.tube('period double wishbone','carbon',[[side*.28,y,z+dz],[side*(LAYOUTS[str(era)]['half']-.045),LAYOUTS[str(era)]['radius'],z]],.016)
 m.wing('period front mainplane',2.13,1.0,.14,.45,'front_wing')
 m.wing('period front flap',1.96,.95,.24,.24,'wing')
 m.wing('period rear mainplane',-1.95,.87,.94,.50,'wing',True)
 m.wing('period rear flap',-2.08,.87,1.14,.28,'wing',True)
 m.tube('period rollover hoop','carbon',[[-.19,.65,-.45],[-.16,1.15,-.5],[.16,1.15,-.5],[.19,.65,-.45]],.035,10)
 if not turbo:
  m.loft('V10 airbox','body',[[-1.0,.12,.99,.20],[-.63,.14,1.07,.19],[-.52,.11,1.04,.15]])
  m.ellipsoid('V10 air intake','rubber',[0,1.07,-.50],[.10,.13,.018])
 m.driver(False);m.wheels(False)

def finish(m,era):
 classic=era==0;layout=LAYOUTS[str(era)]
 # Continuous cockpit tub and coaming hide the former hollow-looking body.
 m.box('cockpit floor pan','rubber',[0,.35,-.05],[.44,.055,.77])
 m.ellipsoid('padded headrest','rubber',[0,.68,-.31],[.25,.13,.09])
 m.box('instrument binnacle','carbon',[0,.63,.43],[.36,.15,.06])
 if classic:
  for x in [-.11,0,.11]:m.ellipsoid('analogue dashboard dial','rim',[x,.65,.468],[.042,.043,.008]);m.ellipsoid('black instrument face','rubber',[x,.65,.477],[.033,.034,.003])
 else:
  m.box('steering telemetry screen','screen',[0,.69,.468],[.15,.075,.008])
  for x in [-.115,.115]:
   for y in [.65,.70]:m.ellipsoid('steering wheel control','accent',[x,y,.478],[.018,.018,.008])
 for side in [-1,1]:
  m.tube('driver sleeve','suit',[[side*.11,.79,.03],[side*.19,.69,.22],[side*.13,.67,.42]],.045,10)
  m.ellipsoid('driver glove','rubber',[side*.13,.67,.44],[.055,.045,.04])
  m.tube('shoulder harness','belt',[[side*.13,.83,-.10],[side*.09,.64,.09]],.022,6)
  m.tube('harness lap strap','belt',[[side*.19,.54,-.05],[side*.03,.53,.11]],.018,6)
  for front in [True,False]:
   z=layout['front'if front else'rear'];half=layout['half'];r=layout.get(('front'if front else'rear')+'_radius',layout['radius'])
   m.box('stationary brake caliper','engine',[side*(half-.10),r,z-.16],[.065,.15,.10])
   m.tube('upright steering link','engine',[[side*(half-.10),r-.10,z],[side*(half-.10),r+.13,z]],.03,10)
   # Brake rotor and centre-lock hardware are local to the spinning wheel.
   m.ellipsoid('ventilated brake rotor','brake',[side*layout['front_width'if front else'rear_width']*.44,0,0],[.012,r*.48,r*.48]);m.parts[-1]['wheel']='front'if front else'rear'
   m.ellipsoid('centre-lock wheel nut','accent',[side*layout['front_width'if front else'rear_width']*.55,0,0],[.055,.055,.055]);m.parts[-1]['wheel']='front'if front else'rear'
  if era==3:
   m.panel('solid curved rear endplate','endplate',side*.89,[(-2.52,.68),(-2.02,.68),(-1.98,.96),(-2.11,1.31),(-2.46,1.38),(-2.56,1.20)])
   m.panel('front endplate surface','front_endplate',side*.985,[(1.98,.18),(2.56,.18),(2.55,.31),(2.11,.43),(1.98,.37)])
   for i in range(6):m.box('sidepod cooling gill','rubber',[side*(.69+i*.015),.674,-.30-i*.115],[.18,.012,.032])
  if classic:
   m.tube('rear anti-roll linkage','rim',[[side*.28,.42,-1.45],[side*.64,.39,-1.26],[side*.74,.32,-1.1]],.014)
 # Four independent circumferential grooves on the 2004 dry tyre surface.
 if era==2:
  for typ in ['front','rear']:
   for off in [-.30,-.10,.10,.30]:
    m.tube('four circumferential grooves','groove',[[layout[typ+'_width']*off,math.cos(i/64*TAU)*(layout['radius']+.001),math.sin(i/64*TAU)*(layout['radius']+.001)]for i in range(65)],.004,5);m.parts[-1]['wheel']=typ

def period_decals(m,era):
 sections=PERIOD_PODS[era]
 for side in [-1,1]:
  points=[];uv=[];indices=[]
  for j in range(25):
   z=-1.05+j/24*1.18;a,b=next((a,b)for a,b in zip(sections,sections[1:])if a[0]<=z<=b[0]);f=(z-a[0])/(b[0]-a[0]);w,cy,h,cx=[a[k]+f*(b[k]-a[k])for k in[1,2,3,4]]
   for row in range(5):
    dy=(row/4-.5)*h*1.12;y=cy+dy;x=side*(cx+w*math.sqrt(1-(dy/h)**2)+.006)
    points.append([x,y,z]);uv.append([(j/24 if side<0 else 1-j/24)*.499,(1008-row/4*64)/1024])
  for j in range(24):
   for row in range(4):k=j*5+row;indices.extend([k,k+1,k+5,k+1,k+6,k+5])
  m.mesh('period conformal sidepod sponsor','decals',points,indices,uv)

models={}
from car_2021 import build as build_2021,decals
for era in range(5):
 model=Model(era)
 if era==4:build_2021(model)
 elif era in [0,3]:model.build(era==0)
 else:period_car(model,era)
 finish(model,era);decals(model,era)
 # Reference-photo proportion correction; estimates, not constructor CAD.
 if era>0:
  rear=[p for p in model.parts if ('rear'in p['name']and any(n in p['name']for n in ['wing','mainplane','flap','endplate','swan neck']))or 'DRS'in p['name']]
  top=max(v[1]for part in rear for v in part['positions'])
  target=1.00 if era in[1,2]else .95
  xscale=.64 if era in[1,2]else .70 if era==3 else 1.
  for part in rear:
   for p in part['positions']:p[0]=round(p[0]*xscale,5);p[1]=round(.18+(p[1]-.18)*(target-.18)/(top-.18),5)
 if era in[1,2]:
  for part in model.parts:
   if any(n in part['name']for n in ['front mainplane','front flap','front wing closed endplate']):
    for p in part['positions']:p[0]=round(p[0]*(.90 if era==1 else .70),5)
   if era==1 and part['name']in['driver helmet','dark visor','period rollover hoop']:
    for p in part['positions']:p[1]=round(p[1]-.10,5)
  period_decals(model,era)

 models[str(era)]=model.parts
# Bound every batch for both renderers; names remain available to regression tests.
for era,parts in models.items():
 batches=[];current={}
 for part in parts:
  head=part['name']in['driver helmet','dark visor'];ghost=part['name']in['halo surround','halo centre pillar'];key=(part['material'],part['wheel'],head,ghost);b=current.get(key)
  if b is None or len(b['positions'])+len(part['positions'])>=9500 or len(b['indices'])+len(part['indices'])>30000:
   b=dict(material=part['material'],wheel=part['wheel'],head=head,cockpit_ghost=ghost,positions=[],indices=[],uvs=[],components=[]);current[key]=b;batches.append(b)
  offset=len(b['positions']);b['components'].append(part['name']);b['positions']+=part['positions'];b['uvs']+=part['uvs'];b['indices'] += [v+offset for v in part['indices']]
 models[era]=batches
(R/'data/car-layouts.json').write_text(json.dumps(LAYOUTS,separators=(',',':'))+'\n')
path=R/'data/car-shapes.json';path.write_text(json.dumps(dict(schema=2,source='Original five-era reconstructions, including a distinct photo-guided 2021 flat-floor/13-inch design and 2023 ground-effect design. Team proportion variants are estimated, not exact replicas or scans.',models=models,layouts=LAYOUTS),separators=(',',':'))+'\n')
print('Shared car geometry:',path.stat().st_size,'bytes;',[(e,sum(len(b['positions'])for b in m))for e,m in models.items()])

"""Original 2021 high-rake/flat-floor silhouette, not a 2023 repaint or scan."""
import math
from car_surface import pod,intake,finishing,pod_outer,smooth_sections

def build(m):
 m.loft('2021 narrow thumb nose','body',[[2.70,.055,.29,.045],[2.57,.11,.31,.06],[2.32,.14,.36,.065],[1.77,.17,.45,.085],[1.05,.22,.50,.12],[.48,.30,.51,.19]])
 m.loft('2021 cockpit survival cell','body',[[.48,.30,.51,.19],[.16,.34,.50,.22],[-.40,.33,.48,.23],[-.79,.29,.50,.24]],opening=True)
 m.loft('2021 pinched engine cover','body',[[-.65,.24,.68,.30],[-.91,.25,.65,.30],[-1.20,.21,.59,.27],[-1.58,.13,.43,.20],[-2.18,.065,.27,.10]])
 m.box('2021 flat stepped reference floor','carbon',[0,.13,-.62],[1.46,.035,3.05])
 m.panel('2021 shark fin spine','body',0,[(-1.90,.39),(-.83,.79),(-.79,1.02),(-1.48,.79),(-1.90,.56)],.016)
 for side in [-1,1]:
  pod(m,'2021 undercut radiator sidepod',[[-1.90,.07,.27,.08,.33],[-1.35,.15,.34,.12,.49],[-.92,.21,.42,.16,.60],[-.35,.235,.46,.17,.65],[.30,.205,.49,.16,.65],[.51,.175,.52,.105,.64]],side)
  intake(m,'2021 rectangular radiator inlet',side,.64,.55,.529,.165,.073)
  m.tube('2021 sidepod inlet upper lip','pods',[[side*.46,.61,.52],[side*.63,.63,.52],[side*.81,.60,.52]],.018)
  # Multiple vertical turning vanes distinguish 2021 from the 2022+ venturi era.
  for j in range(5):
   m.panel('2021 bargeboard cascade','carbon',side*(.49+j*.065),[(.10-j*.065,.15),(.78-j*.04,.15),(.70-j*.045,.48-j*.035),(.28-j*.065,.40)],.012)
  for j in range(3):m.tube('2021 sidepod boomerang vane','carbon',[[side*.39,.42+j*.055,.48],[side*.66,.40+j*.045,.63],[side*.86,.28+j*.06,.20]],.012)
  m.tube('2021 diagonal floor cut','carbon',[[side*.88,.15,.16],[side*.85,.15,-.62],[side*.68,.18,-1.55]],.013)
  m.tube('2021 mirror stalk','carbon',[[side*.30,.67,.29],[side*.62,.76,.39]],.014)
  m.ellipsoid('2021 painted mirror housing','body',[side*.65,.76,.42],[.105,.045,.075])
  m.tube('2021 nose support pillar','carbon',[[side*.12,.31,2.32],[side*.17,.15,2.39]],.019)
 m.wing('2021 full-span front mainplane',2.43,1.0,.12,.44,'carbon')
 for j in range(4):m.wing('2021 five-element front flap',2.28-j*.10,.97-j*.035,.17+j*.040,.15,'front_wing'if j==3 else'carbon')
 for side in [-1,1]:
  m.panel('2021 squared front endplate','front_endplate',side*.99,[(1.94,.12),(2.64,.12),(2.64,.31),(2.36,.35),(1.94,.35)],.018)
  m.panel('2021 slotted rear endplate','endplate',side*.535,[(-2.62,.47),(-2.12,.47),(-2.05,1.23),(-2.20,1.30),(-2.62,1.30)],.018)
  for j in range(4):m.box('2021 rear endplate louvre','carbon',[side*.547,1.04+j*.045,-2.19-j*.025],[.012,.014,.21])
  m.tube('2021 twin rear-wing pylon','carbon',[[side*.12,.34,-1.92],[side*.12,1.04,-2.24]],.022)
  for j in range(3):m.box('2021 rear diffuser strake','carbon',[side*(.17+j*.16),.23,-2.06],[.012,.20,.41])
 m.wing('2021 narrow rear mainplane',-2.36,.525,1.08,.44,'wing',True)
 m.wing('2021 DRS flap',-2.47,.52,1.24,.23,'wing',True)
 m.box('2021 DRS actuator','carbon',[0,1.21,-2.29],[.045,.07,.30])
 m.loft('2021 airbox fairing','body',[[-1.04,.13,.88,.16],[-.70,.15,.93,.19],[-.53,.12,.96,.15]])
 m.ellipsoid('2021 airbox dark opening','rubber',[0,.97,-.51],[.10,.105,.016])
 m.ring('2021 airbox intake rim','accent',-.498,.97,.106,.109,.012)
 m.tube('halo surround','carbon',[[.34,.68,-.42],[.35,1.01,-.23],[.30,1.05,.27],[.15,1.06,.47],[0,1.06,.54],[-.15,1.06,.47],[-.30,1.05,.27],[-.35,1.01,-.23],[-.34,.68,-.42]],.035,12)
 m.tube('halo centre pillar','carbon',[[0,.58,.64],[0,1.06,.54]],.032,10)
 m.tube('2021 central exhaust outlet','exhaust',[[0,.42,-1.9],[0,.40,-2.28]],.038,12)
 for side in [-1,1]:
  for front in [True,False]:
   z=1.74 if front else-1.86
   for y in [.22,.53]:
    for dz in [-.34,.34]:m.tube('2021 carbon wishbone','carbon',[[side*.25,y,z+dz],[side*.75,.335,z]],.011,8)
   m.tube('2021 diagonal pushrod','carbon',[[side*.22,.62,z-.18],[side*.73,.33,z]],.013,8)
 for part in m.parts:
  if any(n in part['name']for n in ['rear endplate','rear mainplane','DRS','rear-wing pylon']):
   for p in part['positions']:p[1]=round(.18+(p[1]-.18)*.77,5)
 finishing(m);m.driver(False);m.wheels(False)

def decals(m,era):
 # Conforming sponsor patches on the actual outside of each modern pod.
 # UV artwork is shared with the native renderer; letters are not mirrored.
 if era not in [3,4]:return
 sections=([[-1.35,.15,.34,.12,.49],[-.92,.21,.42,.16,.60],[-.35,.235,.46,.17,.65],[.30,.205,.49,.16,.65]]if era==4 else[[-1.5,.19,.32,.14,.48],[-.9,.25,.41,.20,.62],[-.32,.28,.49,.20,.64],[.26,.29,.56,.14,.61]])
 sections=smooth_sections(sections,4)
 def profile(z):
  for a,b in zip(sections,sections[1:]):
   if a[0]<=z<=b[0]:
    t=(z-a[0])/(b[0]-a[0]);return[a[k]+t*(b[k]-a[k])for k in range(1,5)]
  return sections[1][1:]
 for side in [-1,1]:
  p=[];uv=[];idx=[]
  for j in range(25):
   z=-1.02+j/24*1.20;w,cy,h,cx=profile(z)
   for row in range(5):
    y=cy+(row/4-.5)*h*1.12;x=side*(pod_outer(w,cy,h,cx,y)+.005)
    p.append([x,y,z]);u=(j/24 if side<0 else 1-j/24)*.499;v=(1008-row/4*64)/1024;uv.append([u,v])
  for j in range(24):
   for row in range(4):
    k=j*5+row;idx.extend([k,k+1,k+5,k+1,k+6,k+5])
  m.mesh('readable conformal sidepod sponsor','decals',p,idx,uv)
 # Conformal engine-cover race number and power-unit/technical partner.
 engine=([[-2.18,.065,.27,.10],[-1.58,.13,.43,.20],[-1.20,.21,.59,.27],[-.91,.25,.65,.30],[-.65,.24,.68,.30]]if era==4 else[[-2.17,.08,.29,.12],[-1.6,.17,.46,.24],[-1.16,.24,.65,.36],[-.92,.29,.72,.40],[-.72,.27,.58,.28]])
 for side in [-1,1]:
  for start,end,ulo,uhi,name in [(-1.48,-1.20,1060/2048,1210/2048,'engine cover race number'),(-1.15,-.74,1250/2048,2035/2048,'engine cover technical partner')]:
   p=[];uv=[];idx=[]
   for j in range(17):
    z=start+(end-start)*j/16
    a,b=next((a,b)for a,b in zip(engine,engine[1:])if a[0]<=z<=b[0]);t=(z-a[0])/(b[0]-a[0]);w,cy,h=[a[k]+t*(b[k]-a[k])for k in[1,2,3]]
    for row in range(4):
     y=cy+(row/3-.20)*h*.70;x=side*(w*max(0,1-abs((y-cy)/h)**(2/.78))**(.78/2)+.006)
     p.append([x,y,z]);f=j/16 if side<0 else 1-j/16;uv.append([ulo+(uhi-ulo)*f,(1008-row/3*64)/1024])
   for j in range(16):
    for row in range(3):k=j*4+row;idx.extend([k,k+1,k+4,k+1,k+5,k+4])
   m.mesh(name,'engine_decals',p,idx,uv)

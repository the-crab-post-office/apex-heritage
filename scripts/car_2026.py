"""Original photo-guided 2026 silhouette. Estimates, not constructor CAD.
Compact 3.4 m wheelbase / 1.9 m envelope; passive wing geometry only.
"""
from car_surface import pod,intake,finishing,pod_outer

def build(m):
 m.loft('2026 low tapered nose','body',[[2.43,.055,.25,.045],[2.21,.10,.29,.06],[1.74,.15,.38,.08],[1.05,.21,.46,.12],[.40,.30,.49,.19]])
 m.loft('2026 compact survival cell','body',[[.40,.30,.49,.19],[.08,.34,.48,.22],[-.43,.33,.47,.23],[-.76,.28,.48,.22]],opening=True)
 m.loft('2026 tightly packaged engine cover','body',[[-.65,.23,.66,.28],[-.94,.23,.65,.29],[-1.24,.17,.53,.23],[-1.67,.10,.37,.16],[-2.05,.055,.26,.09]])
 m.panel('2026 engine-cover dorsal fin','body',0,[(-1.86,.40),(-.77,.79),(-.75,.98),(-1.40,.73),(-1.86,.52)],.012)
 m.box('2026 reduced-width reference floor','carbon',[0,.13,-.55],[1.50,.034,2.98])
 for side in [-1,1]:
  pod(m,'2026 sculpted undercut sidepod',[[-1.77,.06,.26,.07,.29],[-1.31,.12,.31,.10,.40],[-.83,.18,.40,.14,.51],[-.24,.205,.46,.15,.58],[.30,.19,.51,.11,.59],[.48,.16,.53,.075,.58]],side)
  intake(m,'2026 recessed radiator mouth',side,.58,.54,.505,.15,.052)
  m.tube('2026 sidepod overbite lip','pods',[[side*.41,.58,.49],[side*.57,.61,.50],[side*.75,.58,.49]],.016)
  for j in range(7):m.box('2026 cooling louvre','rubber',[side*(.52-j*.012),.612-j*.014,-.49-j*.115],[.13,.009,.028])
  m.tube('2026 mirror stalk','carbon',[[side*.29,.65,.29],[side*.60,.71,.39]],.012)
  m.ellipsoid('2026 streamlined mirror','body',[side*.63,.72,.42],[.10,.038,.068])
  m.panel('2026 front wing endplate','front_endplate',side*.937,[(1.88,.12),(2.44,.12),(2.44,.27),(2.18,.36),(1.88,.30)],.014)
  m.panel('2026 compact rear endplate','endplate',side*.57,[(-2.38,.68),(-1.97,.68),(-1.96,1.03),(-2.10,1.10),(-2.38,1.08)],.014)
  m.tube('2026 rear wing support','carbon',[[side*.12,.30,-1.76],[side*.12,.92,-2.08]],.020)
  for j in range(3):m.box('2026 diffuser strake','carbon',[side*(.16+j*.16),.21,-1.94],[.012,.16,.39])
 m.wing('2026 front mainplane',2.24,.94,.13,.40,'carbon')
 for j in range(2):m.wing('2026 movable front flap static display',2.13-j*.13,.91-j*.03,.19+j*.055,.19,'front_wing')
 m.wing('2026 rear mainplane',-2.16,.565,.94,.35,'wing',True)
 m.wing('2026 movable rear flap static display',-2.26,.56,1.055,.22,'wing',True)
 m.loft('2026 roll-hoop airbox','body',[[-.96,.12,.85,.15],[-.67,.14,.92,.18],[-.50,.115,.95,.14]])
 m.ellipsoid('2026 airbox opening','rubber',[0,.97,-.483],[.095,.092,.012])
 m.ring('2026 airbox intake rim','accent',-.470,.97,.10,.098,.012)
 m.tube('halo surround','carbon',[[.33,.68,-.42],[.34,1.00,-.22],[.29,1.04,.27],[.15,1.05,.47],[0,1.05,.53],[-.15,1.05,.47],[-.29,1.04,.27],[-.34,1.00,-.22],[-.33,.68,-.42]],.033,12)
 m.tube('halo centre pillar','carbon',[[0,.57,.63],[0,1.05,.53]],.029,10)
 m.tube('2026 central exhaust','exhaust',[[0,.40,-1.77],[0,.37,-2.11]],.032,12)
 for side in [-1,1]:
  for front in [True,False]:
   z=1.65 if front else -1.75
   for y in [.23,.52]:
    for dz in [-.30,.30]:m.tube('2026 aero-section wishbone','carbon',[[side*.25,y,z+dz],[side*.73,.35,z]],.011,8)
   m.tube('2026 suspension diagonal','carbon',[[side*.23,.60,z-.16],[side*.72,.34,z]],.012,8)
 finishing(m);m.driver(False);m.wheels(False)
 # Project authored sponsor strip onto the same interpolated shouldered pod.
 from car_surface import smooth_sections
 sections=smooth_sections([[-1.77,.06,.26,.07,.29],[-1.31,.12,.31,.10,.40],[-.83,.18,.40,.14,.51],[-.24,.205,.46,.15,.58],[.30,.19,.51,.11,.59],[.48,.16,.53,.075,.58]],4)
 for side in [-1,1]:
  p=[];uv=[];tri=[]
  for j in range(21):
   z=-1.03+j/20*1.26;a,b=next((a,b)for a,b in zip(sections,sections[1:])if a[0]<=z<=b[0]);t=(z-a[0])/(b[0]-a[0]);w,cy,h,cx=[a[k]+t*(b[k]-a[k])for k in [1,2,3,4]]
   for row in range(4):
    y=cy+(row/3-.5)*h*1.12;p.append([side*(pod_outer(w,cy,h,cx,y)+.004),y,z]);uv.append([(j/20 if side<0 else 1-j/20)*.499,(1008-row/3*64)/1024])
  for j in range(20):
   for row in range(3):k=j*4+row;tri.extend([k,k+1,k+4,k+1,k+5,k+4])
  m.mesh('2026 sidepod sponsor strip','decals',p,tri,uv)

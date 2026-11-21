"""2023 ground-effect body: rolled shoulders, low downwash flank and spoon wings.
User images 4,5,6,8 inform silhouettes; exact team CAD is not implied.
"""
from car_surface import pod,intake,finishing
PODS=[[-1.95,.065,.27,.075,.30],[-1.5,.19,.32,.14,.48],[-.9,.25,.41,.20,.62],[-.32,.28,.49,.20,.64],[.26,.29,.56,.14,.61],[.54,.27,.60,.085,.58]]
def build(m):
 m.loft('slender raised nose','body',[[2.61,.070,.28,.045],[2.39,.105,.32,.060],[1.90,.155,.415,.08],[1.20,.205,.48,.12],[.65,.28,.50,.18],[.32,.34,.49,.22]])
 m.loft('cockpit survival cell','body',[[.32,.34,.49,.22],[-.12,.355,.48,.23],[-.64,.34,.47,.25],[-.9,.30,.46,.25]],opening=True)
 m.loft('tapered engine cover','body',[[-.72,.26,.58,.28],[-.92,.27,.70,.38],[-1.16,.22,.63,.33],[-1.6,.145,.44,.22],[-2.17,.065,.28,.11]])
 m.panel('2023 sculpted dorsal spine','body',0,[(-1.96,.42),(-.79,.93),(-.72,1.03),(-1.26,.80),(-1.96,.54)],.012)
 m.box('venturi floor centre','carbon',[0,.13,-.50],[1.65,.035,3.15])
 for side in [-1,1]:
  pod(m,'undercut sidepod',PODS,side)
  intake(m,'high sidepod inlet',side,.58,.601,.55,.224,.052)
  m.loft('floor venturi edge','carbon',[[-2.05,.07,.14,.030,side*.77],[-1.25,.14,.13,.027,side*.82],[.5,.13,.14,.026,side*.81],[.8,.035,.15,.022,side*.75]])
  m.tube('floor raised lip','carbon',[[side*.93,.17,.6],[side*.97,.15,-.2],[side*.96,.15,-1.2],[side*.85,.19,-1.85]],.009,6)
  for j in range(3):m.panel('2023 venturi inlet fence','carbon',side*(.50+j*.13),[(.38,.13),(.87,.15),(.75,.32),(.46,.27)],.008)
  m.tube('mirror stalk','carbon',[[side*.32,.65,.28],[side*.65,.72,.47]],.011,6)
  m.ellipsoid('mirror housing','body',[side*.67,.73,.49],[.125,.032,.058])
  m.tube('front nose pylon','carbon',[[side*.09,.31,2.25],[side*.15,.15,2.31]],.015,6)
 m.wing('spoon front mainplane',2.39,1,.115,.40,'carbon')
 for i in range(3):m.wing('curved front flap '+str(i),2.24-i*.105,.975-i*.025,.16+i*.038,.17,'front_wing'if i==0 else'carbon')
 for side in [-1,1]:
  m.tube('rolled front tip','carbon',[[side*1,.25,2.45],[side*.99,.34,2.32],[side*.96,.38,2.02]],.017,8)
  m.tube('rear swan neck support','carbon',[[side*.14,.29,-1.8],[side*.14,.76,-2.02],[side*.14,.82,-2.26]],.018,8)
 m.wing('continuous curved rear mainplane',-2.26,.59,.69,.43,'wing',True)
 m.wing('rear DRS flap',-2.39,.585,.815,.24,'wing',True)
 m.wing('rear beam wing',-2.12,.50,.40,.22,'carbon',True)
 m.box('2023 DRS actuator','carbon',[0,.85,-2.25],[.035,.045,.21])
 for side in [-1,1]:
  m.tube('rounded rear wing endplate','carbon',[[side*.59,.53,-2.04],[side*.615,.68,-2.1],[side*.59,.86,-2.23],[side*.585,.94,-2.45]],.015,8)
  for i in range(3):m.panel('diffuser fence','carbon',side*(.25+i*.19),[(-1.7,.14),(-2.22,.14),(-2.22,.30),(-1.7,.22)],.010)
 m.tube('halo surround','carbon',[[.35,.68,-.42],[.36,1.02,-.23],[.31,1.06,.27],[.16,1.07,.48],[0,1.07,.55],[-.16,1.07,.48],[-.31,1.06,.27],[-.36,1.02,-.23],[-.35,.68,-.42]],.031,12)
 m.tube('halo centre pillar','carbon',[[0,.57,.65],[0,1.07,.55]],.027,10)
 m.loft('airbox fairing','body',[[-.96,.13,.88,.16],[-.72,.145,.95,.18],[-.55,.12,.97,.14]])
 intake(m,'airbox dark opening',1,0,.98,-.52,.103,.102)
 m.tube('titanium exhaust','exhaust',[[0,.38,-1.8],[0,.36,-2.25]],.033,10)
 for side in [-1,1]:
  for z in [1.75,-1.85]:
   for y in [.24,.53]:
    for dz in [-.32,.32]:m.tube('wishbone','carbon',[[side*.28,y,z+dz],[side*.74,.36,z]],.010,6)
 finishing(m);m.driver(False);m.wheels(False)

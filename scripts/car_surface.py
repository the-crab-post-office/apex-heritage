"""Photo-guided surface construction, in metres. No photo pixels or licensed meshes."""
import math

def smooth_sections(rows, subdivisions=3):
    # Cubic Hermite with componentwise monotone slopes: no pinching/overshoot.
    out=[]
    for i,(a,b) in enumerate(zip(rows,rows[1:])):
        for j in range(subdivisions):
            t=j/subdivisions; values=[]
            for k in range(len(a)):
                delta=b[k]-a[k]
                prev=a[k]-rows[max(0,i-1)][k]
                nex=rows[min(len(rows)-1,i+2)][k]-b[k]
                def slope(x,y):return 0 if x*y<=0 else 2*x*y/(x+y)
                ma=delta if i==0 else slope(prev,delta)
                mb=delta if i+2==len(rows) else slope(delta,nex)
                values.append((2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*ma+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*mb)
            out.append(values)
    return out+[rows[-1]]

def pod_outer(w,cy,h,cx,y):
    # Outer flank of a shouldered superellipse. Lower surface undercut feeds floor.
    c=max(-1,min(1,(y-cy)/h));co=math.copysign(abs(c)**(1/.7),c)
    return cx+w*math.sqrt(max(0,1-co*co))*(.76+.24*max(co,0))-.045*max(-co,0)

def pod(m,name,sections,side):
    rows=smooth_sections(sections,4);p=[];uv=[];tri=[];steps=24
    for z,w,cy,h,cx in rows:
        for j in range(steps+1):
            a=math.tau*j/steps;co=math.cos(a);sn=math.sin(a)
            y=cy+h*math.copysign(abs(co)**.7,co)
            x=cx+w*sn*(.76+.24*max(co,0))-.045*max(-co,0)
            p.append([side*x,y,z]);uv.append([.5+j/steps*.5,(2.6-z)/10.4])
    for i in range(len(rows)-1):
        for j in range(steps):
            k=i*(steps+1)+j;tri.extend([k,k+steps+1,k+1,k+1,k+steps+1,k+steps+2])
    if side<0:
        for i in range(0,len(tri),3):tri[i+1],tri[i+2]=tri[i+2],tri[i+1]
    # End rings deliberately open only at the inlet; radiator tunnel supplies its interior.
    m.mesh(name,'pods',p,tri,uv)

def intake(m,name,side,x,y,z,w,h):
    # A genuine recessed duct: painted perimeter, carbon internal throat and
    # a black radiator core 6 cm behind the opening, rather than an ellipsoid sticker.
    pts=[];tri=[];n=24
    for zz,scale in [(z,1),(z-.075,.81)]:
        for j in range(n):
            a=math.tau*j/n;pts.append([side*(x+w*math.cos(a)),y+h*scale*math.sin(a),zz])
    for j in range(n):k=(j+1)%n;tri.extend([j,k,n+j,k,n+k,n+j])
    m.mesh(name+' recessed duct walls','pod_carbon'if abs(x)>.3 else'carbon',pts,tri)
    ring=[[side*(x+w*math.cos(j/32*math.tau)),y+h*math.sin(j/32*math.tau),z+.003]for j in range(33)]
    m.tube(name+' rolled lip','pods',ring,.009,6)
    m.ellipsoid(name,'pod_shadow'if abs(x)>.3 else'rubber',[side*x,y,z-.078],[w*.96,h*.82,.004])
    for j in range(5):
        xx=x+(j-2)*w*.29
        m.tube(name+' core fin','pod_metal'if abs(x)>.3 else'engine',[[side*xx,y-h*.60,z-.069],[side*xx,y+h*.60,z-.069]],.0025,4)

def cockpit(m):
    for side in [-1,1]:
        m.tube('sculpted cockpit coaming','body',[[side*.29,.68,.43],[side*.32,.72,.18],[side*.32,.72,-.20],[side*.26,.69,-.53]],.022,8)
        m.tube('halo fairing seam','body',[[side*.34,.69,-.42],[side*.35,.98,-.22],[side*.30,1.04,.26],[side*.15,1.055,.47],[0,1.055,.53]],.025,10)
    m.tube('halo central faired support','body',[[0,.60,.63],[0,1.055,.53]],.026,10)
    m.loft('camera T bar aerofoil','carbon',[[-.75,.17,1.22,.026],[-.66,.19,1.225,.026],[-.60,.16,1.22,.022]],steps=12)
    m.tube('camera pedestal','carbon',[[0,1.07,-.66],[0,1.22,-.66]],.026,8)

def finishing(m):
    # Surface details use opaque geometry, not a new texture per small item.
    for side in [-1,1]:
        for z in [1.25,1.00]:m.ellipsoid('flush nose fastener','rim',[side*.14,.565,z],[.006,.002,.006])
        m.tube('front brake cooling duct','carbon',[[side*.65,.36,1.80],[side*.68,.40,1.65]],.034,8)
        for front in [True,False]:
            z=(1.65 if m.era==5 else 1.75)if front else(-1.75 if m.era==5 else-1.85)
            m.tube('flattened suspension pushrod','carbon',[[side*.22,.61,z-.18],[side*.72,.35,z]],.010,6)
    cockpit(m)

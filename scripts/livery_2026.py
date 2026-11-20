"""Original simplified 2026 paint artwork, no photo pixels or official vectors."""
import math

def draw(d,t,pods):
 base=t['color'];s=t['secondary'];a=t['accent'];style=t['style'];motif=t.get('motif','')
 d.rectangle((0,0,1023,511),fill=base)
 if style=='ferrari':
  if not pods and motif!='seven-stars':d.rectangle((170,220,850,470),fill=s)
 elif style=='mclaren':
  d.rectangle((335,0,690,511),fill=s)
  if pods:d.polygon([(0,330),(1024,230),(1024,511),(0,511)],fill=s)
 elif style=='mercedes':
  d.polygon([(0,0),(1024,0),(1024,130),(0,390)],fill=s)
  for x in [240,750]:d.line((x,0,x-45,512),fill=a,width=16)
 elif style=='bull':
  for x in [256,768]:
   d.ellipse((x-90,245,x+90,413),fill=a)
   d.polygon([(x-110,345),(x-55,295),(x-10,330),(x+45,293),(x+112,345),(x+50,368),(x,350),(x-67,377)],fill=s)
 elif style=='audi':
  d.polygon([(0,370),(1024,260),(1024,512),(0,512)],fill=s)
  for x in [256,768]:d.polygon([(x-170,0),(x-40,0),(x+175,512),(x+40,512)],fill=a)
 elif style=='cadillac':
  # Distinct asymmetric black/white sides, rather than a grey generic repaint.
  d.rectangle((0,0,511,511),fill=s)
 elif style=='racingbulls':
  for x in [256,768]:d.polygon([(x-130,240),(x-45,145),(x+130,410),(x+30,430)],fill=s)
 elif style=='williams':
  d.polygon([(0,0),(240,0),(630,512),(0,512)],fill=s)
  for x in [220,735]:d.line((x,0,x+170,512),fill='#50a9e5',width=10)
 elif style=='aston':
  for x in [300,700]:d.line((x,0,x-35,512),fill=a,width=8)
 elif style=='haas':
  d.polygon([(0,360),(1024,250),(1024,511),(0,511)],fill=s)
  for x in [256,768]:d.polygon([(x-135,170),(x-60,150),(x+145,390),(x+50,420)],fill=a)
 elif style=='alpine':
  d.polygon([(0,320),(1024,210),(1024,511),(0,511)],fill=s)
  d.line((0,320,1024,210),fill='#f4f0ee',width=5)
 if motif=='mercado':
  if not pods:d.rectangle((130,270,895,511),fill='#f4dc26')
 elif motif=='cognizant':
  d.rectangle((350,0,675,210),fill='#427da5')
  for y in range(20,270,22):
   for x in range(335,690,26):d.polygon([(x,y-11),(x+13,y),(x,y+11),(x-13,y)],outline='#7ca8b7',width=1)
 elif motif=='okx':
  if pods:
   d.rectangle((0,225,1023,480),fill='#151a1e')
   for row in range(4):
    for col in range(24):
     if (row*7+col*3)%5<3:d.rectangle((col*43,260+row*34,col*43+24,281+row*34),fill='#eeeae2')
 elif motif=='paulista':
  for y in range(0,512,58):
   for x in range(0,1024,58):
    d.polygon([(x,y+13),(x+16,y+13),(x+16,y),(x+43,y),(x+43,y+29),(x+29,y+44),(x+13,y+44)],fill='#256047' if (x+y)%116 else '#b7a46b')
 elif motif=='brush':
  for j in range(18):
   x=(j*193)%1024;d.line((x,-40,x-80,250,x+35,520),fill=s,width=5+j%5*3)
 elif motif=='citrus':
  for y in range(25,512,70):
   for x in range(30,1024,90):d.arc((x,y,x+58,y+58),0,300,fill='#b4c52a',width=4)
 elif motif=='football':
  for y in range(240,512,50):d.line((0,y,1023,y-190),fill='#24b69d',width=7)
  for x in [256,768]:d.polygon([(x-155,220),(x+115,120),(x+20,450)],fill='#1b3ca2')
 elif motif=='milestone':
  for y in range(160,480,50):d.line((0,y,1023,y-85),fill='#aa651e',width=2)
 elif motif=='copper':
  for y in range(512):
   q=min(1,y/350);col=tuple(round(v*(1-q)+w*q) for v,w in zip((188,118,73),(0,83,67)))
   d.line((0,y,1023,y),fill=col)
 elif motif=='union':
  for x in [256,768]:
   d.line((x-110,90,x+110,290),fill='#f4f1ed',width=24);d.line((x+110,90,x-110,290),fill='#f4f1ed',width=24)
   d.line((x,90,x,290),fill='#db253d',width=20)
 elif motif in ['stars-mono','stars-usa']:
  ink='#e9ece8';stripe='#22282b' if motif=='stars-mono' else '#c62e3c'
  for y in range(0,512,64):d.rectangle((0,y,1023,y+25),fill=stripe)
  d.rectangle((0,0,511,255),fill='#14191c' if motif=='stars-mono' else '#163669')
  for row in range(5):
   for col in range(10):star(d,24+col*49,22+row*47,10,ink)
 elif motif=='seven-stars':
  for j in range(7):star(d,360+j*50,130,15,'#f4f0e5')
 elif motif=='peranakan':
  for y in range(220,512,45):
   for x in range(15,1024,45):d.rectangle((x-20,y-20,x+20,y+20),fill='#77729d');d.ellipse((x-13,y-13,x+13,y+13),outline='#ded9e7',width=2)
 elif motif=='blueprint':
  for x in range(0,1024,34):d.line((x,210,x,512),fill='#aac2c8',width=1)
  for y in range(210,512,34):d.line((0,y,1024,y),fill='#aac2c8',width=1)
  for x in range(40,1024,165):d.ellipse((x,270,x+115,400),outline='#f2ece4',width=3);d.line((x,420,x+115,260),fill='#f2ece4',width=2)
 elif motif=='manufaktur':
  for x in [256,768]:d.polygon([(x-130,0),(x+60,0),(x+120,510),(x-50,510)],fill='#528cd2')
 elif motif in ['monster','monster-blue']:
  ink='#8ac8de' if motif=='monster-blue' else '#23272a'
  for x in [256,768]:
   d.polygon([(x-110,440),(x-55,360),(x-30,260),(x-8,300),(x+7,232),(x+26,280),(x+43,236),(x+58,292),(x+78,310),(x+92,362),(x+34,345),(x+52,430)],fill=ink)
   for j in range(4):d.line((x-65+j*16,405,x-110+j*15,472),fill=ink,width=5)
 elif motif=='western':
  for x in range(70,1024,145):
   d.arc((x,240,x+100,420),40,320,fill='#858b8a',width=3)
   d.arc((x+18,275,x+85,387),20,300,fill='#858b8a',width=2)
  for y in [205,450]:
   for x in range(0,1024,17):d.line((x,y,x+9,y),fill='#bac0bb',width=2)

def star(d,x,y,r,ink):
 p=[]
 for j in range(10):
  a=-math.pi/2+j*math.pi/5;rr=r if j%2==0 else r*.42;p.append((x+math.cos(a)*rr,y+math.sin(a)*rr))
 d.polygon(p,fill=ink)


def wing(d,t):
 motif=t.get('motif','')
 if motif=='wolf':
  # Front-wing atlas region only; base scheme remains unchanged.
  for x in [1155,1410]:
   d.polygon([(x-100,533),(x-65,561),(x-34,548),(x,585),(x+35,548),(x+68,561),(x+95,534),(x+68,666),(x,744),(x-68,666)],fill='#7f8588')
   d.polygon([(x-60,618),(x-15,630),(x-45,641)],fill='#11171b');d.polygon([(x+60,618),(x+15,630),(x+45,641)],fill='#11171b')
 elif motif in ['stars-mono','stars-usa']:
  d.rectangle((1024,512,1535,767),fill='#151a1e' if motif=='stars-mono' else '#193c73')
  for row in range(5):
   for col in range(10):star(d,1048+col*49,540+row*44,10,'#eef0eb')
 elif motif=='peranakan':
  for y in range(517,766,38):
   for x in range(16,1024,38):
    d.rectangle((x-16,y-16,x+16,y+16),outline='#e0dce8',width=1);d.ellipse((x-11,y-11,x+11,y+11),outline='#e0dce8',width=1)

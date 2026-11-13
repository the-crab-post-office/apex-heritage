#!/usr/bin/env python3
"""Original reference-guided texture atlases, shared by web/native. Offline; no photo pixels."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageColor, ImageOps
ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'data/roster.json').read_text())
FONT=ROOT/'scripts/fonts/DejaVuSans-Bold.ttf'
OUT=ROOT/'web/assets/liveries';OUT.mkdir(exist_ok=True)
def text_layer(text,w,h,color):
 im=Image.new('RGBA',(4096,220));d=ImageDraw.Draw(im);font=ImageFont.truetype(str(FONT),170);box=d.textbbox((0,0),text,font=font);d.text((-box[0],-box[1]),text,font=font,fill=color)
 return im.crop((0,0,max(1,box[2]-box[0]),max(1,box[3]-box[1]))).resize((int(w),int(h)),Image.Resampling.LANCZOS)
def contrast(color):
 r,g,b=ImageColor.getrgb(color)if isinstance(color,str)else color;return '#18202a'if r*.3+g*.59+b*.11>150 else '#f3f0e4'
def panel(t,pods=False):
 im=Image.new('RGB',(1024,512),t['color']);d=ImageDraw.Draw(im);s=t['secondary'];a=t['accent'];style=t['style'];base=t['color']
 # Circumference U seam is the centre of the upper surface; V is global car Z.
 if style in ['stripe','noseband']:
  width=88 if not pods else 22
  if style=='stripe':d.rectangle((0,0,width,512),fill=s);d.rectangle((1024-width,0,1023,512),fill=s)
  else:d.rectangle((0,38,1023,95),fill=s)
 elif style=='roundel':pass
 elif style=='sun':
  for x in [0,1024]:d.ellipse((x-85,105,x+85,144),fill=s)
 elif style=='chevron':
  for x in [0,1024]:d.polygon([(x-300,240),(x,80),(x+300,240),(x+300,512),(x-300,512)],fill=s)
  if pods:d.rectangle((0,340,1024,512),fill=s)
 elif style in ['williams','arrows']:
  for x in [256,768]:d.polygon([(x-175,0),(x+150,0),(x+110,512),(x-110,512)],fill=s)
  d.rectangle((0,180,1024,199),fill=a)
 elif style=='benetton':
  d.polygon([(0,170),(550,140),(640,512),(0,512)],fill=s);d.polygon([(530,120),(1024,250),(1024,512),(610,512)],fill=a);d.rectangle((0,330,260,410),fill='#c62629')
 elif style=='renault':
  for x in [256,768]:d.polygon([(x-180,0),(x+160,0),(x+135,512),(x-160,512)],fill=s)
  if pods:d.rectangle((0,0,1024,512),fill=s);d.rectangle((0,0,1024,90),fill=base)
 elif style=='silver':
  for x in [256,768]:d.rectangle((x-155,0,x+155,512),fill=s);d.line((x-155,50,x+155,100),fill=a,width=16)
 elif style in ['circle','sauber','toyota','jaguar']:
  if style=='sauber':d.rectangle((0,260,1024,420),fill=a);d.rectangle((0,0,1024,85),fill=s)
  if style=='jaguar':d.rectangle((0,280,1024,360),fill=s);d.line((0,275,1024,275),fill='#e1c538',width=6)
  if style=='toyota':
   for x in [0,1024]:d.polygon([(x-250,512),(x+200,512),(x+55,0),(x-45,0)],fill=s)
  if style=='circle':
   for x in [256,768]:d.ellipse((x-120,245,x+120,370),fill=s);d.ellipse((x-95,260,x+95,353),fill=base)
 elif style=='minardi':
  d.rectangle((0,280,1024,460),fill=s);d.rectangle((0,240,1024,280),fill=a)
 elif style=='bull':
  for x in [256,768]:d.ellipse((x-155,240,x+155,403),fill=a);d.polygon([(x-150,330),(x-80,280),(x-15,320),(x+30,285),(x+135,335),(x+50,357),(x-35,345),(x-120,370)],fill=s)
  for x in [0,1024]:d.polygon([(x-170,0),(x+170,0),(x+70,175),(x-70,175)],fill=a)
 elif style in ['mercedes','aston']:
  for x in [256,768]:d.polygon([(x-160,0),(x-80,0),(x+115,512),(x+45,512)],fill=s)
  d.rectangle((0,416,1024,432),fill=s)
 elif style in ['mclaren','alpine','alphatauri','alfa','haas','ferrari']:
  for x in [256,768]:d.polygon([(x-160,150),(x+190,60),(x+150,512),(x-200,512)],fill=s)
  d.rectangle((0,190,1024,205),fill=a)
  if style=='mclaren':d.rectangle((0,430,1024,465),fill=a)
 else:
  d.rectangle((0,410,1024,512),fill=s)
  if pods:d.rectangle((0,0,1024,52),fill=s)
 # Fine pinstripes, fastener rows and panel shut-lines, deliberately not fake random sponsor rows.
 for yy in [225,440]:d.line((0,yy,1024,yy),fill=a,width=2)
 for x in [188,324,700,836]:
  for yy in [216,438]:d.ellipse((x-2,yy-2,x+2,yy+2),fill='#a4a7a5')
 # Real sponsor names, with original simplified letterforms (not redistributed corporate vectors).
 for x,angle in [(256,-90),(768,90)]:
  word=t['sponsor'] if pods else t['minor'];ink=contrast(im.getpixel((x,300)));label=text_layer(word,145 if pods else 116,74 if pods else 58,ink).rotate(angle,expand=True).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  im.paste(label,(int(x-label.width/2),int(300-label.height/2)),label)
  small=text_layer(t['minor']if pods else t['name'].upper(),70,29,contrast(im.getpixel((x,160)))).rotate(angle,expand=True).transpose(Image.Transpose.FLIP_LEFT_RIGHT);im.paste(small,(int(x-small.width/2),int(165-small.height/2)),small)
 # Nose number/roundel wraps seamlessly across top-U boundary.
 n=Image.new('RGBA',(190,48));nd=ImageDraw.Draw(n)
 if int(t['id'][:4])==1967:nd.ellipse((0,0,189,47),fill='#f3f1e5');ink='#171b20'
 else:ink=contrast(base)
 label=text_layer(str(t['number']),115,36,ink);n.paste(label,(37,6),label)
 for xx in [-95,929]:im.paste(n,(xx,110),n)
 return im
manifest=[];rust=[]
for era in D['eras']:
 for t in era['teams']:
  atlas=Image.new('RGB',(2048,1024),t['color']);atlas.paste(panel(t),(0,0));atlas.paste(panel(t,True),(1024,0));d=ImageDraw.Draw(atlas)
  d.rectangle((0,512,1023,767),fill=t['secondary']);word=text_layer(t['wing'],880,140,contrast(t['secondary']));atlas.paste(word,(72,567),word)
  d.rectangle((1024,512,1535,767),fill=t['secondary']);end=text_layer(t['minor'],440,100,contrast(t['secondary']));atlas.paste(end,(1060,589),end)
  # Sidewall band, repeated around the circumference by each wheel's UVs.
  d.rectangle((0,768,2047,1023),fill='#141719');tyre=t['tyre'].upper();ink='#e9d12f'if tyre=='PIRELLI'else'#eeeee4'
  for x in [40,1064]:
   word=text_layer(tyre,800,90,ink);atlas.paste(word,(x,840),word)
  atlas.quantize(colors=128,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(OUT/(t['id']+'.png'),optimize=True)
  manifest.append({'id':t['id'],'file':t['id']+'.png','width':2048,'height':1024,'number':t['number'],'style':t['style'],'source':t['reference']})
  rust.append(f'        "{t["id"]}" => include_bytes!("../web/assets/liveries/{t["id"]}.png"),')
(OUT/'manifest.json').write_text(json.dumps({'original_artwork':True,'photo_pixels':False,'teams':manifest},indent=2)+'\n')
(ROOT/'src/livery_assets.rs').write_text('// Generated by scripts/build-liveries.py. Original texture atlases; no reference-photo pixels.\npub fn png(id:&str)->&\'static[u8]{match id{\n'+'\n'.join(rust)+'\n        _ => include_bytes!("../web/assets/liveries/2004-ferrari.png"),\n    }\n}\n')
print(f'Generated {len(manifest)} shared web/native atlases; {sum(p.stat().st_size for p in OUT.glob("*.png"))/1024:.0f} KiB total.')

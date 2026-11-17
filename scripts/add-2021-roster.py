#!/usr/bin/env python3
"""Idempotent full 2021 constructor grid; preserve existing era indices/preferences."""
import json,copy
from pathlib import Path
R=Path(__file__).resolve().parents[1];path=R/'data/roster.json';d=json.loads(path.read_text())
rows=[
 ('mercedes','Mercedes','W12',44,'#171c21','#10cbb5','#9c1c32','mercedes','PETRONAS','INEOS','PETRONAS','Mercedes',1000,100,100, .72,.94),
 ('red-bull','Red Bull','RB16B',33,'#15233d','#dc2639','#f5d331','bull','Red Bull','HONDA','HONDA','Honda',997,100.6,99.8, .80,1.02),
 ('ferrari','Ferrari','SF21',16,'#bd202c','#7b1a25','#f4d13a','ferrari','Ray-Ban','Shell','FERRARI','Ferrari',975,98.8,99.1, 1.13,1.02),
 ('aston-martin','Aston Martin','AMR21',5,'#166c60','#d9509c','#e7e7dc','aston','Cognizant','BWT','Cognizant','Mercedes',989,97.0,97.8, .84,1.0),
 ('mclaren','McLaren','MCL35M',3,'#f58a24','#218fd1','#131b24','mclaren','DARKTRACE','VELO','McLAREN','Mercedes',994,99.0,99.0, .94,1.01),
 ('alpine','Alpine','A521',14,'#2989ce','#e54143','#f1eee7','alpine','ALPINE','Castrol','ALPINE','Renault',962,97.9,98.6, 1.04,.98),
 ('williams','Williams','FW43B',63,'#183c7d','#f2f1e9','#32a8e1','williams','WILLIAMS','Acronis','WILLIAMS','Mercedes',983,94.9,96.0, 1.14,.97),
 ('alphatauri','AlphaTauri','AT02',10,'#eef0e9','#1a263b','#bf2439','alphatauri','ALPHATAURI','HONDA','ALPHATAURI','Honda',987,98.3,98.5, 1.09,1.03),
 ('alfa-romeo','Alfa Romeo','C41',7,'#f1f0eb','#a71e30','#1c663f','alfa','ORLEN','Alfa Romeo','Alfa Romeo','Ferrari',969,95.5,97.0, 1.04,.98),
 ('haas','Haas','VF-21',47,'#f4f2ec','#d1293b','#244c9b','haas','HAAS','URALKALI','HAAS','Ferrari',958,92.8,94.7, 1.15,1.04),
]
teams=[];variants={}
for slug,name,car,num,color,secondary,accent,style,sponsor,minor,wing,engine,power,grip,brake,nose,pods in rows:
 id='2021-'+slug
 teams.append(dict(id=id,name=name,car=car,number=num,color=color,secondary=secondary,accent=accent,style=style,sponsor=sponsor,minor=minor,wing=wing,engine=engine+' · 1.6 V6 turbo hybrid',turbo=True,power=power,grip=grip,brake=brake,tyre='Pirelli',reference='https://en.wikipedia.org/wiki/'+{'mercedes':'Mercedes_F1_W12_E_Performance','red-bull':'Red_Bull_Racing_RB16B','ferrari':'Ferrari_SF21','aston-martin':'Aston_Martin_AMR21','mclaren':'McLaren_MCL35M','alpine':'Alpine_A521','williams':'Williams_FW43B','alphatauri':'AlphaTauri_AT02','alfa-romeo':'Alfa_Romeo_Racing_C41','haas':'Haas_VF-21'}[slug],rim_color='#2d3032',livery_note='2021 Austrian GP photo-guided original reconstruction; driver/number matches comparison photo. Shared authored 2021 chassis with estimated team nose/pod/engine-cover differences, not a scan. Simplified sponsor type and some placement remain approximate.',paint_roughness=.55 if slug in ['red-bull','ferrari']else .30,paint_metalness=.38 if slug in['mercedes','aston-martin']else .12))
 teams[-1].update(wing_color=('#771f2c'if slug=='ferrari'else '#154f48'if slug=='aston-martin'else '#151c29'),endplate_color=('#771f2c'if slug=='ferrari'else '#154f48'if slug=='aston-martin'else '#162032'),front_endplate_color=('#228fcf'if slug=='mclaren'else color),helmet_color={'mercedes':'#7d47aa','red-bull':'#eee9ca','ferrari':'#b72d33','aston-martin':'#eee9cf','mclaren':'#d7d03a','alpine':'#e8c929','williams':'#e3e6e9','alphatauri':'#c52e3b','alfa-romeo':'#d02f35','haas':'#f2d139'}[slug])
 variants[id]=dict(nose_scale=nose,pod_scale=pods,engine_scale=.94 if slug=='mercedes'else 1.,notes='Estimated proportions from credited Austrian GP side photographs; not constructor CAD or photogrammetry.')
e=dict(year='2021',name='HIGH-RAKE HYBRIDS',short='V6 / 13 IN',engine='1.6L V6 turbo hybrid',power=1000,trait='Bargeboards · 13-inch wheels',description='Pre-ground-effect hybrid cars: 13-inch rims, tall tyre sidewalls, intricate bargeboards and a flat stepped floor. Lighter than the 2023 cars, with strong aero and progressive combined-slip tyre limits.',teams=teams)
d['eras']=[x for x in d['eras']if x['year']!='2021']+[e];d['sources'].append('https://api.fia.com/sites/default/files/2021_formula_1_technical_regulations_-_iss_8_-_2021-02-19.pdf')if 'https://api.fia.com/sites/default/files/2021_formula_1_technical_regulations_-_iss_8_-_2021-02-19.pdf'not in d['sources']else None
for era in d['eras']:
 if era['year']=='2023':
  for t in era['teams']:
   slug=t['id'][5:];variants[t['id']]=dict(nose_scale={'ferrari':1.10,'mercedes':.9}.get(slug,1.),pod_scale={'mercedes':.83,'red-bull':1.,'ferrari':1.07,'aston-martin':1.04}.get(slug,1.),engine_scale=1.,notes='Authored visual differentiation, not race-specific CAD; 2023 remains a representative season approximation.')
path.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n');(R/'data/car-variants.json').write_text(json.dumps(variants,indent=2)+'\n')
statuspath=R/'data/car-asset-status.json';status=json.loads(statuspath.read_text());status['cars']=[x for x in status['cars']if not x['id'].startswith('2021-')]
for t in teams:
 item=copy.deepcopy(status['cars'][0]);item.update(id=t['id'],constructor=t['name'],year=2021,car=t['car'],rendered_geometry='Original 2021 chassis with estimated team proportion variants',research_status='Licensed reference photograph available; no verified exact-chassis scan integrated');status['cars'].append(item)
status['requested_scope']='57 season constructor entries across five eras, including the complete 2021 grid; 0 verified scans.'
statuspath.write_text(json.dumps(status,indent=2)+'\n')
print('Roster:',[len(e['teams'])for e in d['eras']],'teams; 2021 index 4 preserves existing saved era IDs')

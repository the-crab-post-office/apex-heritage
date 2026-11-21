#!/usr/bin/env python3
"""Aggregate completed, genuine production probes; refuse missing/failed samples."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text())
sha=lambda p:hashlib.sha256((R/p).read_bytes()).hexdigest()
first=read('artifacts/023-road/results-0.json');assert len(first['cars'])==11 and first['specials']==22 and first['errors']==[]
tracks=read('data/tracks.json');base=read('data/graphics-2026-baseline.json');rows=[]
for i,t in enumerate(tracks):
 r=read(f'artifacts/023-road/probe-{i}.json');assert r['name']==t['name']
 assert all(r['road'][k]==0 for k in ['missingRoad','terrainIntrusions','overlayIntrusions','centerErrors'])
 assert r['pit']['intrusions']==0
 assert r['pit']['missing']==next((b['pit']['missing']for b in base['tracks']if b['track']==r['name']),0)
 assert r['loaded'] and r['spec']['mass']==770 and r['speed']>0
 assert r['finish']['bankConforming'] and not r['finish']['collisionChanges'] and r['finish']['drawCalls']<=4
 r.pop('image',None);rows.append(r)
old=read('data/graphics-2026-validation.json');inputs=list(old['inputs'])
d=dict(version=read('package.json')['version'],scope='Actual released-WASM era-5 construction/driving, all eleven cars and twenty-two special atlases, and all thirteen production race worlds. Not complete driven laps or exhaustive hardware certification.',wasm_sha256=sha('web/wasm/apex_bg.wasm'),cars=11,specials=22,tracks=rows,notes=[n for n in old['notes']if not n.startswith('0.18 re-verification:')]+['0.18 re-verification: independent browsers in small batches after a concurrent software-GPU renderer crash. Every retained row is a completed actual probe; no failed assertion is removed.'],inputs={p:sha(p)for p in inputs})
(R/'data/graphics-2026-validation.json').write_text(json.dumps(d,indent=2)+'\n')
print('Verified and aggregated thirteen genuine 0.18 race-world probes and eleven cars / twenty-two specials')

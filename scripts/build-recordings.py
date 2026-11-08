#!/usr/bin/env python3
"""Reproducibly derive six seamless mono PCM loops from licensed real recordings.
Requires ffmpeg + numpy. Downloads go outside the source tree; raw originals are
not bundled. Derived PCM is CC BY-SA 3.0, NOT the code's MIT license.
"""
import json,subprocess,tempfile,urllib.request,wave
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
BANKS=[
 ('classic','Lotus-BRM 24 (1962)','d/d8/Lotus-BRM_24_%281962%29.ogg',[(1.4,.72,4000),(5.25,.65,8000)]),
 ('turbo','Toleman-Hart TG183B (1983)','b/b2/Toleman-Hart_TG183B_%281983%29.ogg',[(5.7,.65,5000),(8.05,.62,10000)]),
 ('v10','Williams-Renault FW18 (1996)','c/cd/Williams-Renault_FW18_%281996%29.ogg',[(2.65,.62,6500),(4.5,.62,12500)]),
]
SR=24000;out=ROOT/'web/assets/audio';out.mkdir(exist_ok=True,parents=True);banks=[]
with tempfile.TemporaryDirectory()as temp:
 for name,title,path,clips in BANKS:
  url='https://upload.wikimedia.org/wikipedia/commons/'+path
  source=Path(temp)/(name+'.ogg')
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ApexHeritage/0.3 (credited CC BY-SA reuse)'}),timeout=60)as r:source.write_bytes(r.read())
  wav=Path(temp)/(name+'.wav');subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af','highpass=f=85','-ar',str(SR),'-ac','1',str(wav)],check=True)
  with wave.open(str(wav))as w:data=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float64)/32768
  layers=[]
  for label,(start,length,rpm)in zip(['low','high'],clips):
   x=data[int(start*SR):int((start+length)*SR)].copy();x-=x.mean();fade=int(.08*SR);theta=np.linspace(0,np.pi/2,fade,endpoint=False)
   # Sequential middle followed by a tail/head overlap: no hard loop boundary.
   x=np.concatenate([x[fade:-fade],x[-fade:]*np.cos(theta)**2+x[:fade]*np.sin(theta)**2]);x-=x.mean()
   gain=min(.22/np.sqrt(np.mean(x*x)),.85/np.max(np.abs(x)));x*=gain
   file=f'{name}-{label}.pcm';pcm=(x*32767).astype('<i2');(out/file).write_bytes(pcm.tobytes())
   layers.append({'file':file,'reference_rpm':rpm,'source_start_seconds':start,'source_duration_seconds':length,'frames':len(pcm)})
  banks.append({'era':len(banks),'name':name,'recorded_car':title,'author':'Edvvc (Ed Pond)','source':url,'page':'https://commons.wikimedia.org/wiki/File:'+path.split('/')[-1],'license':'https://creativecommons.org/licenses/by-sa/3.0/','layers':layers})
manifest={'sample_rate':SR,'format':'signed 16-bit little-endian mono PCM','changes':'Trimmed, 85 Hz high-pass, mono/downsampled, DC removed, normalized and 80 ms tail/head crossfade. Two RPM-transposed loops per era; reference RPM is an authored playback anchor, NOT measured recording telemetry.','limitations':'Trackside Goodwood 2010 recordings, not isolated in-car recordings or exact roster cars. Turbo sample is a Hart four-cylinder, not the 1988 V6. 1962/1983/1996 sources approximate 1967/1988/2004 eras. The 2023 preset retains procedural synthesis; no verified modern V6 recording was bundled.','banks':banks}
(out/'recordings.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Six real-recording loops written:',sum(p.stat().st_size for p in out.glob('*.pcm')),'bytes')

#!/usr/bin/env python3
"""Author smooth, periodic gameplay profiles. NOT survey/DEM elevation data.
Keys are fractions along the processed geographic map. Heights are relative metres.
Run after editing profiles; writes identical native/WASM and browser datasets.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROFILES = {
    'be-1925': [(0,35),(.025,39),(.075,0),(.095,12),(.13,48),(.275,104),(.34,89),(.42,62),(.51,35),(.61,20),(.69,7),(.77,14),(.86,34),(.94,37),(1,35)],
    'mc-1929': [(0,8),(.08,14),(.18,43),(.26,36),(.36,15),(.45,5),(.59,0),(.76,1),(.90,4),(1,8)],
    'it-1922': [(0,3),(.17,6),(.29,9),(.42,5),(.57,1),(.70,0),(.86,4),(1,3)],
    'gb-1948': [(0,7),(.10,12),(.23,18),(.37,14),(.52,4),(.65,0),(.78,7),(.90,11),(1,7)],
    'jp-1962': [(0,8),(.10,19),(.22,40),(.31,30),(.38,16),(.40,16),(.46,25),(.56,33),(.68,23),(.76,16),(.82,16),(.91,4),(.97,0),(1,8)],
    'br-1940': [(0,39),(.06,31),(.14,5),(.24,0),(.37,9),(.48,20),(.57,14),(.67,7),(.77,12),(.89,32),(.96,43),(1,39)],
    'it-1953': [(0,4),(.13,1),(.24,8),(.35,21),(.44,31),(.55,18),(.66,8),(.77,0),(.89,3),(1,4)],
    'de-1927': [(0,46),(.12,51),(.25,39),(.42,16),(.54,0),(.66,12),(.80,31),(.92,44),(1,46)],
    'ca-1978': [(0,2),(.16,4),(.32,1),(.47,0),(.66,3),(.81,5),(.93,3),(1,2)],
    'de-1932': [(0,2),(.16,4),(.34,7),(.48,3),(.64,0),(.80,2),(.91,4),(1,2)],
}

def profile(keys, u):
    """Periodic, monotonic cubic Hermite interpolation: C1 and no overshoot."""
    count = len(keys)-1
    def sec(i):
        a,b = keys[i],keys[i+1]
        return (b[1]-a[1])/(b[0]-a[0])
    def slope(i):
        left,right=sec((i-1)%count),sec(i%count)
        return 2*left*right/(left+right) if left*right>0 else 0.
    i=next((i for i in range(count) if u < keys[i+1][0]),count-1)
    a,b=keys[i],keys[i+1];w=b[0]-a[0];t=(u-a[0])/w
    return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*w*slope(i)+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*w*slope((i+1)%count)

tracks=json.loads((ROOT/'data/tracks.json').read_text())
for track in tracks:
    n=len(track['points'])
    ground=[round(profile(PROFILES[track['id']],i/n),4) for i in range(n)]
    lift=[round(8*math.exp(-((i/n-.7956)/.019)**4),4) if track['code']=='JP' else 0 for i in range(n)]
    heights=[round(g+l,4) for g,l in zip(ground,lift)]
    track['heights']=heights
    track['ground_heights']=ground
    track['elevation']=round(max(heights)-min(heights),1)
    track['elevation_source']='Authored approximation; relative metres, not survey or DEM data'
    track['elevation_keys']=PROFILES[track['id']]
    grade=max(abs(heights[(i+1)%n]-heights[i])/math.dist(track['points'][i],track['points'][(i+1)%n]) for i in range(n))
    print(f"{track['name']}: {track['elevation']:.1f} m range; maximum grade {grade*100:.1f}%")
text=json.dumps(tracks,separators=(',',':'))
for p in ['data/tracks.json','web/assets/tracks.json']:(ROOT/p).write_text(text)

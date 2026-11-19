#!/usr/bin/env python3
"""Offline OSM pit-way projection/registration. No invented parallel circuits.
Input: data/pit-lanes-osm.json (bounded OSM API snapshots, ODbL).
Output is shared by Rust native and WASM. Current layouts, not historic lanes.
"""
import json, math
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter1d
from shapely.geometry import LineString, Point
ROOT=Path(__file__).resolve().parents[1]
tracks=json.loads((ROOT/'data/tracks.json').read_text())
raw=json.loads((ROOT/'data/pit-lanes-osm.json').read_text())
selected={'be-1925':[323851541],'mc-1929':[850261588,1388331347],
'it-1922':[38168747],'gb-1948':[227902927],'jp-1962':[120917578],
'br-1940':[33779109],'it-1953':[196368195],'de-1927':[30815119],
'ca-1978':[413000959],'de-1932':[15446020]}
output=[]
for t,source in zip(tracks,raw['tracks']):
    assert t['id']==source['id']
    if t['id'] in ['ae-2009','nl-1948','az-2016']:
        from expansion_context import pit_record
        context=next(s for s in json.loads((ROOT/'data/expansion-map-source.json').read_text())['tracks']if s['id']==t['id'])
        output.append(pit_record(t,context));continue
    ways=[next(w for w in source['ways'] if w['id']==i) for i in selected[t['id']]]
    coords=list(ways[0]['coordinates'])
    if len(ways)>1:
        coords+=source['connector']['coordinates'][1:]+ways[1]['coordinates'][1:]
    o=t['origin'];cos=math.cos(math.radians(o['latitude']))
    projected=np.array([[(lon-o['longitude'])*111320*cos,-(lat-o['latitude'])*111320]for lon,lat in coords])
    main=np.array(t['points']);n=len(main)
    near=lambda p:int(np.argmin(np.sum((main-p)**2,axis=1)))
    entry,exit=near(projected[0]),near(projected[-1]);span=(exit-entry)%n
    assert 0<span<n*.5,(t['id'],'pit direction disagrees with circuit')
    # OSM maps Monaco's middle pit-exit street as the shared public street
    # centreline, not the race-day separated strip. Register its eastern strip
    # (up to 9 m) using the two mapped raceway endpoints. This is explicit authored
    # lane-width refinement, not a claim of surveyed pit-exit paint.
    registered=0
    if t['id']=='mc-1929':
        for j,p in enumerate(projected):
            if j<2 or j>len(projected)-4:continue
            i=near(p);a=main[(i-1)%n];b=main[(i+1)%n];v=b-a;v=v/np.linalg.norm(v)
            right=np.array([-v[1],v[0]])
            offset=float(np.dot(p-main[i],right))
            if -1<offset<9 and i<35:
                projected[j]+=right*(9-offset);registered+=1
    projected[0]=main[entry];projected[-1]=main[exit]
    line=LineString(projected)
    ds=np.linspace(0,line.length,max(3,math.ceil(line.length/5)+1))
    points=np.array([line.interpolate(float(d)).coords[0]for d in ds])
    # Local height is still approximate; avoid DSM buildings creating pit humps.
    indices=[];last=0
    for p in points:
        candidates=(entry+np.arange(last,span+1))%n
        k=int(np.argmin(np.sum((main[candidates]-p)**2,axis=1)))+last
        indices.append(int((entry+k)%n));last=k
    heights=gaussian_filter1d(np.array(t['heights'])[indices],3,mode='nearest')
    # Smooth portal joins exactly back onto the shared race-road bed.
    start_delta=t["heights"][entry]-heights[0]
    for i in range(len(heights)):
        f=min(1,ds[i]/35);heights[i]+=start_delta*(1-f)
    end_delta=t['heights'][exit]-heights[-1]
    heights+=end_delta*np.maximum(0,1-(ds[-1]-ds)/35)
    heights[0]=t['heights'][entry];heights[-1]=t['heights'][exit]
    for k,p in enumerate(points):
        i=indices[k];best=(float('inf'),0.)
        for a,b in [((i-1)%n,i),(i,(i+1)%n)]:
            v=main[b]-main[a];f=float(np.clip(np.dot(p-main[a],v)/np.dot(v,v),0,1))
            d=float(np.linalg.norm(p-main[a]-f*v));h=t['heights'][a]*(1-f)+t['heights'][b]*f
            if d<best[0]:best=(d,h)
        mix=float(np.clip((t['width']/2+3-best[0])/3,0,1));mix=mix*mix*(3-2*mix)
        heights[k]=heights[k]*(1-mix)+best[1]*mix
    road=LineString(list(main)+[main[0]])
    candidates=[]
    for i in range(3,len(points)-3):
        f=ds[i]/ds[-1]
        if not .2<f<.65:continue
        a=points[i]-points[i-2];b=points[i+2]-points[i]
        turn=abs(math.atan2(a[0]*b[1]-a[1]*b[0],float(np.dot(a,b))))
        clearance=road.distance(Point(points[i]))
        score=abs(f-.42)+turn*8+max(0,t['width']/2+5-clearance)*10
        candidates.append((score,i))
    box=min(candidates)[1]
    output.append({'id':t['id'],'name':t['name'],'points':[[round(float(p[0]),3),round(float(h),3),round(float(p[1]),3)]for p,h in zip(points,heights)],'track_indices':indices,'entry_index':entry,'exit_index':exit,'box_distance':round(float(ds[box]),3),'length':round(float(ds[-1]),3),'width':6.,'limit':(60. if t['id']=='mc-1929' else 80.)/3.6,'osm_way_ids':selected[t['id']]+source.get('connector',{}).get('way_ids',[]),'source':'OSM mapped current pit-lane ways; metre projection/resampling; endpoint registration; estimated width/heights/service box'+('; Monaco public-street separated-strip refinement'if registered else ''),'registered_points':registered})
    print(t['name'],round(line.length),'m',entry,'→',exit,'box',round(ds[box]),'m; OSM',selected[t['id']])
(ROOT/'data/pit-lanes.json').write_text(json.dumps({'attribution':'© OpenStreetMap contributors, ODbL 1.0','tracks':output},separators=(',',':'),ensure_ascii=False))

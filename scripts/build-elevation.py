#!/usr/bin/env python3
"""Rebuild coordinate-anchored elevation OFFLINE from the checked-in GLO-30 DSM.
Requires numpy + scipy. This is filtered surface data, not surveyed road heights.
No fractional-lap elevation keyframes. Start-index rotation must not move hills.
"""
import json,math
from pathlib import Path
import numpy as np
from scipy.interpolate import PchipInterpolator
from scipy.ndimage import median_filter,gaussian_filter,gaussian_filter1d
ROOT=Path(__file__).resolve().parent.parent

def sample(grid,x,z):
 u=np.clip((x-grid['x0'])/grid['dx'],0,grid['nx']-1.000001);v=np.clip((z-grid['z0'])/grid['dz'],0,grid['nz']-1.000001)
 i=np.floor(u).astype(int);j=np.floor(v).astype(int);u=u-i;v=v-j;a=grid['array']
 return (1-v)*((1-u)*a[j,i]+u*a[j,i+1])+v*((1-u)*a[j+1,i]+u*a[j+1,i+1])
def project(t,lon,lat):
 o=t['origin'];return np.array([(lon-o['longitude'])*111320*math.cos(math.radians(o['latitude'])),-(lat-o['latitude'])*111320])
def nearest(t,point):return int(np.argmin(np.linalg.norm(np.array(t['points'])-point,axis=1)))
def arc_distance(dist,center,length):return (dist-center+length/2)%length-length/2

def build(track,source,structures):
 grid={k:source[k]for k in ['x0','z0','dx','dz','nx','nz']}
 # Suppress isolated building/tree pixels without inventing a lap-progress shape.
 grid['array']=gaussian_filter(median_filter(np.array(source['altitudes']).reshape(source['nz'],source['nx']),size=3),.65)
 p=np.array(track['points']);segment=np.linalg.norm(np.roll(p,-1,axis=0)-p,axis=1);dist=np.r_[0,np.cumsum(segment[:-1])];length=float(segment.sum());step=length/len(p)
 h=sample(grid,p[:,0],p[:,1]);corrections=[]
 if track['code']=='MC':
  way=structures['monaco_tunnel'][0];ends=[way['geometry'][k]for k in [0,-1]];indices=[nearest(track,project(track,e['lon'],e['lat']))for e in ends]
  start,end=indices
  if (dist[end]-dist[start])%length>length/2:start,end=end,start
  span=(dist[end]-dist[start])%length;mid=(dist[start]+span/2)%length;delta=np.abs(arc_distance(dist,mid,length))-span/2
  blend=np.clip(1-np.maximum(0,delta)/130,0,1);blend=blend*blend*(3-2*blend)
  # DSM sees the hotel/cliff ABOVE Boulevard Louis II. The mapped road's
  # approximate 6 m sea-level height is explicit authored road correction.
  h=h*(1-blend)+6.*blend
  corrections.append({'type':'tunnel','osm_way':way['id'],'start_index':start,'end_index':end,'absolute_road_height':6,'height_source':'authored approximate portal/road level; not surveyed','portal_coordinates':ends})
 sigma=45 if track['code']=='MC' else 55 if track['code']=='IT' and track['name']=='Monza' else 30
 ground=gaussian_filter1d(h,sigma/step,mode='wrap');lift=np.zeros(len(p))
 if track['code']=='JP':
  ref=structures['suzuka_bridge'];center=project(track,ref['longitude'],ref['latitude']);candidate=sorted(range(len(p)),key=lambda i:np.linalg.norm(p[i]-center));legs=[]
  for i in candidate:
   if all(min((i-j)%len(p),(j-i)%len(p))>50 for j in legs):legs.append(i)
   if len(legs)==2:break
  heading=np.array([ref['upper_heading_east'],ref['upper_heading_south']]);upper=max(legs,key=lambda i:abs(np.dot((p[(i+1)%len(p)]-p[i])/segment[i],heading)))
  common=float(sample(grid,*center))
  for i in legs:
   delta=arc_distance(dist,dist[i],length);ground+=(common-ground[i])*np.exp(-(delta/110)**4)
  delta=arc_distance(dist,dist[upper],length);lift=ref['clearance_metres']*np.exp(-(delta/160)**4)
  corrections.append({'type':'bridge','longitude':ref['longitude'],'latitude':ref['latitude'],'upper_index':upper,'lower_index':next(i for i in legs if i!=upper),'clearance':ref['clearance_metres'],'height_source':'authored clearance at geographic crossover; not surveyed'})
 if track['code']=='BE':
  ref=json.loads((ROOT/'data/spa-reference.json').read_text())
  ids=[nearest(track,project(track,a[0],a[1]))for a in ref['anchors']]
  foot=ids[3];datum_foot=float(ground[foot]);begin=dist[ids[0]]
  xs=np.array([(dist[i]-begin)%length for i in ids]);ys=np.array([float(ground[i])if a[2]is None else datum_foot+a[2]for i,a in zip(ids,ref['anchors'])])
  curve=PchipInterpolator(xs,ys);progress=(dist-begin)%length;mask=progress<=xs[-1]
  ground[mask]=curve(progress[mask])
  corrections.append({'type':'photo-guided-climb','name':'Eau Rouge / Raidillon','start_index':ids[0],'compression_index':foot,'crest_index':ids[9],'end_index':ids[-1],'rise_metres':40.,'scope':'modern photo-guided complex for all eras, not a survey','source':'data/spa-reference.json'})
 heights=ground+lift;datum=float(ground.min())
 terrain={k:v for k,v in grid.items()if k!='array'};terrain['heights']=[round(float(v)-datum,3)for v in grid['array'].ravel()]
 track.update(heights=[round(float(v)-datum,4)for v in heights],ground_heights=[round(float(v)-datum,4)for v in ground],terrain=terrain,elevation=round(float(heights.max()-heights.min()),1),elevation_datum=round(datum,4),sea_level=round(-datum,4),water_level=round((float(np.percentile(source['altitudes'],5)) if track['code']in ['CA','AZ'] else 0)-datum,4),elevation_source=f'Georeferenced Copernicus GLO-{source.get("resolution_m",30)} DSM; filtered/road-corrected approximation, not surveyed road heights',road_corrections=corrections)
 for key in ['profile_offset','elevation_keys']:track.pop(key,None)
 grade=float(np.max(np.abs(np.roll(heights,-1)-heights)/segment))
 if grade>.25:raise ValueError(f'{track["name"]}: implausible grade {grade}')
 return grade

def main():
 tracks=json.loads((ROOT/'data/tracks.json').read_text());sources=json.loads((ROOT/'data/elevation-dem.json').read_text());structures=json.loads((ROOT/'data/road-structures.json').read_text())
 for track in tracks:
  source=next(s for s in sources['tracks']if s['id']==track['id']);grade=build(track,source,structures)
  print(f'{track["name"]}: {track["elevation"]} m; max grade {grade*100:.1f}%')
 text=json.dumps(tracks,separators=(',',':'))
 for file in ['data/tracks.json']:(ROOT/file).write_text(text)
if __name__=='__main__':main()

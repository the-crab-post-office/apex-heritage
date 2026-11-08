"""Exact whole-footprint exclusions, independently recomputed from source routes."""
import json, math, subprocess, sys, unittest
from pathlib import Path
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads((ROOT/path).read_text())
class VenueTests(unittest.TestCase):
 def test_all_ten_have_tyres_walls_and_six_stands(self):
  venue=read('data/venue.json')['tracks'];self.assertEqual(len(venue),10)
  for t,v in zip(read('data/tracks.json'),venue):
   self.assertEqual(t['id'],v['id']);self.assertEqual(len(v['grandstands']),6);self.assertGreater(len(v['barriers']),150)
   self.assertEqual(sum(b['kind']=='tyres'for b in v['barriers']),18)
   self.assertTrue(any(b['fence']for b in v['barriers']))
 def test_entire_capsules_and_roof_footprints_clear_roads_pits_buildings(self):
  for t,p,b,v in zip(read('data/tracks.json'),read('data/pit-lanes.json')['tracks'],read('data/buildings.json')['tracks'],read('data/venue.json')['tracks']):
   protected=unary_union([LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+3.49),LineString([(q[0],q[2])for q in p['points']]).buffer(p['width']/2+3.49),unary_union([Polygon(q['footprint']).buffer(.99)for q in b['buildings']])])
   capsules=[]
   for wall in v['barriers']:
    shape=LineString([wall['a'],wall['b']]).buffer(wall['radius']+.1);self.assertFalse(shape.intersects(protected),t['name']);capsules.append(shape)
   furniture=unary_union(capsules)
   for stand in v['grandstands']:
    poly=Polygon(stand['footprint']);self.assertFalse(poly.intersects(protected),t['name']);self.assertFalse(poly.intersects(furniture),t['name'])
 def test_stands_face_the_circuit_and_footprints_include_roof_overhang(self):
  for t,v in zip(read('data/tracks.json'),read('data/venue.json')['tracks']):
   for s in v['grandstands']:
    expected=(s['width']+2)*(s['depth']+3)if s['roof']else s['width']*s['depth']
    self.assertAlmostEqual(Polygon(s['footprint']).area,expected,delta=.07)
    target=t['points'][s['index']];dx=target[0]-s['x'];dz=target[1]-s['z'];dot=(dx*math.sin(s['yaw'])+dz*math.cos(s['yaw']))/math.hypot(dx,dz)
    self.assertGreater(dot,.99)
 def test_generator_is_offline_and_byte_deterministic(self):
  path=ROOT/'data/venue.json';before=path.read_bytes();subprocess.run([sys.executable,str(ROOT/'scripts/build-venue.py')],cwd=ROOT,check=True,capture_output=True);self.assertEqual(before,path.read_bytes())
if __name__=='__main__':unittest.main()

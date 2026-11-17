"""Modern Piscine: shared geometry, mapped water and road/pit protection."""
import json,unittest
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
class PiscineTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.s=read('data/monaco-piscine.json');cls.t=read('data/tracks.json')[1];cls.v=read('data/corner-details.json')['tracks'][1]
  pit=read('data/pit-lanes.json')['tracks'][1]
  cls.protected=unary_union([LineString(cls.t['points']+[cls.t['points'][0]]).buffer(cls.t['width']/2+.12),LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+.6)])
 def test_mapped_pool_is_long_turquoise_and_lane_marked(self):
  pool=Polygon(self.s['pool_outline']);self.assertGreater(pool.area,850);self.assertLess(pool.area,1050);self.assertTrue(pool.contains(Point(-264,285)))
  self.assertEqual(len([f for f in self.s['facets']if f['name']=='turquoise pool water']),3)
  self.assertGreater(len([f for f in self.s['facets']if f['name']=='pool lane marking']),10)
 def test_all_eras_use_same_modern_short_striped_kerbs(self):
  kerbs=[[k for k in p['kerbs']if k['name'].startswith('Piscine')]for p in self.v['profiles']]
  self.assertEqual(len(kerbs[0]),5)
  for k in kerbs:self.assertEqual(k,kerbs[0])
  for k in kerbs[0]:self.assertLess(k['stripe_length'],1);self.assertGreaterEqual(k['width'],1.35)
 def test_scenic_water_and_masks_never_cover_race_or_pit(self):
  for tri in self.s['terrain_mask']:self.assertLess(Polygon(tri).intersection(self.protected).area,.001)
  for f in self.s['facets']:
   poly=Polygon([(p[0],p[2])for p in f['p']]);self.assertLess(poly.intersection(self.protected).area,.001,f['name'])
 def test_boats_are_on_harbour_and_stands_are_dense_modular(self):
  water=unary_union([Polygon([(p[0],p[2])for p in f['p']])for f in self.s['facets']if f['name']=='mapped harbour water'])
  self.assertEqual(self.s['yachts'],20)
  for o in self.s['objects']:
   if o['name'].startswith('yacht'):self.assertTrue(water.buffer(.002).contains(Point(o['x'],o['z'])))
  stands=[s for s in self.v['grandstands']if s.get('evidence','').startswith('Piscine reference')]
  self.assertEqual(len(stands),5);self.assertGreater(sum(s['width']for s in stands),80)
if __name__=='__main__':unittest.main()

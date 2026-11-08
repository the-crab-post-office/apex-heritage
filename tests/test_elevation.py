"""Geographic regression tests: python3 -m unittest discover -s tests -p 'test_*.py'."""
import copy,importlib.util,json,math,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('builder',ROOT/'scripts/build-elevation.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
TRACKS=json.loads((ROOT/'data/tracks.json').read_text());DEM=json.loads((ROOT/'data/elevation-dem.json').read_text());STRUCTURES=json.loads((ROOT/'data/road-structures.json').read_text())
def index(track,lon,lat):return builder.nearest(track,builder.project(track,lon,lat))
class GeographicElevationTests(unittest.TestCase):
 def test_every_circuit_is_sourced_and_regenerates_offline(self):
  self.assertEqual(len(DEM['tracks']),10)
  for t in TRACKS:
   with self.subTest(track=t['name']):
    self.assertIn('Copernicus',t['elevation_source']);self.assertNotIn('profile_offset',t);self.assertNotIn('elevation_keys',t)
    source=next(s for s in DEM['tracks']if s['id']==t['id']);rebuilt=copy.deepcopy(t);builder.build(rebuilt,source,STRUCTURES)
    self.assertEqual(rebuilt,t);self.assertEqual(len(t['terrain']['heights']),t['terrain']['nx']*t['terrain']['nz'])
 def test_start_rotation_cannot_move_hills_on_any_circuit(self):
  for t in TRACKS:
   with self.subTest(track=t['name']):
    n=len(t['points']);k=n//3+17;rotated=copy.deepcopy(t);rotated['points']=t['points'][k:]+t['points'][:k]
    builder.build(rotated,next(s for s in DEM['tracks']if s['id']==t['id']),STRUCTURES)
    for field in ['heights','ground_heights']:
     expected=t[field][k:]+t[field][:k]
     self.assertLess(max(abs(a-b)for a,b in zip(expected,rotated[field])),.002)
    self.assertEqual(t['terrain'],rotated['terrain'])
 def test_spa_hills_are_at_geographic_locations_not_old_fraction_keys(self):
  t=TRACKS[0];eau=index(t,5.970294,50.442634);combes=index(t,5.977029,50.429650);stavelot=index(t,5.959806,50.429713)
  self.assertGreater(t['heights'][combes]-t['heights'][eau],60)
  self.assertGreater(t['heights'][combes]-t['heights'][stavelot],85)
  # Original hand-authored maximum was elsewhere; no alignment with sample zero is assumed.
  self.assertLess(abs(t['heights'][combes]-max(t['heights'])),3)
 def test_monaco_casino_above_albert_ier_but_tunnel_stays_below_surface(self):
  t=TRACKS[1];casino=index(t,7.427191,43.739404);albert=index(t,7.4212652,43.7350269);tunnel=index(t,7.430157,43.739610)
  self.assertGreater(t['heights'][casino]-t['heights'][albert],30)
  self.assertAlmostEqual(t['heights'][tunnel]+t['elevation_datum'],6,delta=1)
  terrain=t['terrain'];grid={**terrain,'array':builder.np.array(terrain['heights']).reshape(terrain['nz'],terrain['nx'])};x,z=t['points'][tunnel]
  self.assertGreater(float(builder.sample(grid,x,z))-t['heights'][tunnel],8)
 def test_metadata_uses_geographic_bridge_and_smooth_tunnel_portals(self):
  jp=TRACKS[4];bridge=jp['road_corrections'][0];a=bridge['lower_index'];b=bridge['upper_index']
  self.assertLess(math.dist(jp['points'][a],jp['points'][b]),6)
  self.assertGreater(jp['heights'][b]-jp['heights'][a],7.5)
  self.assertLess(abs(jp['ground_heights'][b]-jp['ground_heights'][a]),.1)
  mc=TRACKS[1];h=mc['heights'];p=mc['points']
  for i in range(len(h)):
   j=(i+1)%len(h);self.assertLess(abs(h[j]-h[i])/math.dist(p[i],p[j]),.18)
if __name__=='__main__':unittest.main()

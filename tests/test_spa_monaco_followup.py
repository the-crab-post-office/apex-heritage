"""Independent projection, clearance, historical-scope and generation checks."""
import hashlib,json,math,subprocess,sys,unittest
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
class FollowupTests(unittest.TestCase):
 def test_historical_spa_profiles_and_all_other_profiles_remain_unchanged(self):
  hashes=read('data/spa-monaco-reference.json')['unchanged_profile_sha256'];after=read('data/corner-details.json')['tracks']
  for t in after:
   for profile in t['profiles']:
    expected=hashes.get(t['id'],{}).get(str(profile['year']))
    if expected:self.assertEqual(hashlib.sha256(json.dumps(profile,sort_keys=True,separators=(',',':')).encode()).hexdigest(),expected,(t['id'],profile['year']))
  self.assertIn('barriers',after[0]['profiles'][3]);self.assertNotIn('barriers',after[0]['profiles'][2])
  # A harmless latest-profile retessellation must not alter the user-selected
  # all-era Eau Rouge/Raidillon kerbs or the projected reference aprons.
  profiles=after[0]['profiles'];reference=profiles[0]
  er=lambda p:[k for k in p['kerbs']if 'Eau Rouge' in k['name']or'Raidillon' in k['name']]
  apron=lambda p:unary_union([Polygon(tri)for r in p['runoffs']if 'Eau Rouge' in r['name']for tri in r['triangles']])
  for profile in profiles[1:]:
   self.assertEqual(er(reference),er(profile));self.assertLess(apron(reference).symmetric_difference(apron(profile)).area,.0001)

 def test_individual_apexes_replace_long_generic_kerb_groups(self):
  p=read('data/corner-details.json')['tracks'][0]['profiles'][3]
  expected=[('T5 right',-1),('T6 left',1),('T7 right',-1),('first right',-1),('second left',1)]
  for name,side in expected:
   k=next(k for k in p['kerbs']if name in k['name']);self.assertEqual(k['side'],side);self.assertLessEqual(k['end_index']-k['start_index'],18)
  self.assertFalse(any(k['name']in ['Les Combes apex','Les Combes exit','Bus Stop apex']for k in p['kerbs']))
 def test_new_surface_polygons_do_not_cover_race_pit_or_buildings(self):
  t=read('data/tracks.json')[0];pit=read('data/pit-lanes.json')['tracks'][0];buildings=read('data/buildings.json')['tracks'][0]['buildings']
  protected=unary_union([LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+.08),LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+.6)]+[Polygon(b['footprint']).buffer(.25)for b in buildings])
  runoffs=read('data/corner-details.json')['tracks'][0]['profiles'][3]['runoffs'];areas=[]
  for r in runoffs:
   if not r.get('follow_road'):continue
   area=unary_union([Polygon(tri)for tri in r['triangles']]);self.assertLess(area.intersection(protected).area,.02,r['name']);areas.append((r['name'],area))
  # Adjacent paint replaces paving, it must not be a coplanar overlay.
  for i,(name,a)in enumerate(areas):
   for other,b in areas[i+1:]:self.assertLess(a.intersection(b).area,.03,(name,other))
  asphalt=unary_union([p for name,p in areas if name.startswith('La Source')])
  points=t['points'];half=t['width']/2
  for i in range(24,39,2):
   a,b=points[i-1],points[i+1];dx,dz=b[0]-a[0],b[1]-a[1];l=math.hypot(dx,dz)
   self.assertTrue(asphalt.buffer(.01).covers(Point(points[i][0]+dz/l*(half+2),points[i][1]-dx/l*(half+2))),i)
 def test_monaco_floor_bridges_the_mapped_hotel_gap_and_keeps_clearance(self):
  scenes=read('data/reference-scenes.json')['scenes'];s=scenes[0];self.assertEqual(s['eras'],list(range(6)))
  floor=unary_union([Polygon([(p[0],p[2])for p in f['p']])for f in s['facets']if f['tag']=='hotel-overhead-floor'])
  hotel=unary_union([Polygon(b['footprint'])for b in read('data/buildings.json')['tracks'][1]['buildings']if b.get('style')=='fairmont'])
  self.assertGreater(floor.intersection(hotel).area,1.,'overhead infill must connect to the mapped hotel, not float in the gap')
  self.assertGreaterEqual(min(p[1]for f in s['facets']if f['tag']!='retaining-wall'for p in f['p']),11.)
  t=read('data/tracks.json')[1]
  self.assertGreaterEqual(sum(floor.buffer(.02).covers(Point(t['points'][i]))for i in range(303,340)),25)
  self.assertEqual(scenes[1]['eras'],[3,4,5])
 def test_reference_scene_generator_is_offline_and_deterministic(self):
  p=R/'data/reference-scenes.json';before=p.read_bytes();subprocess.run([sys.executable,'scripts/build-reference-scenes.py'],cwd=R,check=True,capture_output=True);self.assertEqual(p.read_bytes(),before)

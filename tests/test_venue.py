"""Independent geometric checks of mapped/photo-referenced facilities and runoff."""
import json, math, subprocess, sys, unittest
from pathlib import Path
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads((ROOT/path).read_text())
class VenueTests(unittest.TestCase):
 def test_all_ten_have_individually_mapped_facilities_and_labelled_era_presets(self):
  venue=read('data/corner-details.json')['tracks'];self.assertEqual(len(venue),10);counts=[]
  for t,v in zip(read('data/tracks.json'),venue):
   self.assertEqual(t['id'],v['id']);self.assertGreaterEqual(len(v['grandstands']),2);self.assertGreater(len(v['barriers']),50);counts.append(len(v['grandstands']))
   self.assertTrue(v['inspected_photo']['url'].startswith('https://'))
   self.assertEqual([p['year']for p in v['profiles']],[1967,1988,2004,2023])
   for p in v['profiles']:
    if p['year']!=2023:self.assertIn('substitute',p['label']);self.assertIn('not reconstructed',p['notes'])
    self.assertGreater(len(p['kerbs']),3);self.assertGreater(len({k['width']for k in p['kerbs']}),2);self.assertTrue(all(k['height']>0 for k in p['kerbs']))
  self.assertGreater(len(set(counts)),4)
 def test_entire_collision_capsules_and_stand_footprints_clear_race_and_pit_roads(self):
  for t,p,v in zip(read('data/tracks.json'),read('data/pit-lanes.json')['tracks'],read('data/corner-details.json')['tracks']):
   race=LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+.12)
   pit=LineString([(q[0],q[2])for q in p['points']]).buffer(p['width']/2+.6)
   protected=unary_union([race,pit])
   for wall in v['barriers']:
    self.assertFalse(LineString([wall['a'],wall['b']]).buffer(wall['radius']).intersects(protected),t['name'])
   for stand in v['grandstands']:
    self.assertFalse(Polygon(stand['footprint']).intersects(protected),t['name']);self.assertTrue(stand['osm_id']or v['name']=='Monaco')
 def test_stands_face_toward_track_and_use_the_mapped_rectangle_instead_of_equal_lap_spacing(self):
  for t,v in zip(read('data/tracks.json'),read('data/corner-details.json')['tracks']):
   for s in v['grandstands']:
    self.assertAlmostEqual(Polygon(s['footprint']).area,s['width']*s['depth'],delta=.5)
    target=t['points'][s['index']];dx=target[0]-s['x'];dz=target[1]-s['z'];dot=(dx*math.sin(s['yaw'])+dz*math.cos(s['yaw']))/math.hypot(dx,dz)
    self.assertGreater(dot,0,t['name'])
 def test_latest_mapped_gravel_does_not_overlap_authored_paved_runoff(self):
  for v in read('data/corner-details.json')['tracks']:
   r=v['profiles'][3]['runoffs'];gravel=unary_union([Polygon(tri)for a in r if a.get('osm_id')for tri in a['triangles']]);other=unary_union([Polygon(tri)for a in r if not a.get('osm_id')for tri in a['triangles']])
   self.assertLess(gravel.intersection(other).area,.15,v['name'])
 def test_mapped_gravel_is_an_area_not_a_service_road_parking_or_volleyball_court(self):
  for o,v in zip(read('data/venue-osm.json')['tracks'],read('data/corner-details.json')['tracks']):
   source={f['osm_id']:f for f in o['features']}
   for r in v['profiles'][3]['runoffs']:
    if not r.get('osm_id'):continue
    f=source[r['osm_id']];self.assertEqual(f['coordinates'][0],f['coordinates'][-1],v['name'])
    self.assertFalse(any(k in f['tags']for k in ['highway','amenity','leisure','sport']),v['name']);self.assertNotEqual(f['tags'].get('natural'),'beach')
 def test_generator_is_offline_and_byte_deterministic(self):
  path=ROOT/'data/corner-details.json';before=path.read_bytes();subprocess.run([sys.executable,str(ROOT/'scripts/build-corner-details.py')],cwd=ROOT,check=True,capture_output=True);self.assertEqual(before,path.read_bytes())
if __name__=='__main__':unittest.main()

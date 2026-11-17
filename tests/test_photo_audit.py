"""Independent bounded geometry/license checks for the broad reference audit."""
import unittest,json,hashlib
from pathlib import Path
from shapely.geometry import LineString,Polygon
from shapely.ops import unary_union
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
class PhotoAuditTests(unittest.TestCase):
 def test_ten_tracks_and_five_era_photos_are_licensed_local_and_hashed(self):
  refs=read('data/photo-audit-references.json')['references'];self.assertEqual(len(refs),15)
  self.assertEqual(sum(r['category']=='track'for r in refs),10)
  for r in refs:
   self.assertTrue(r['source_page'].startswith('https://commons.wikimedia.org/'))
   self.assertTrue(r['license_url'].startswith('https://creativecommons.org/'))
   self.assertEqual(hashlib.sha256((R/r['file']).read_bytes()).hexdigest(),r['sha256'])
   self.assertTrue(r['observation'] and r['implemented'] and r['limits'])
 def test_older_surface_profiles_are_not_repainted_by_newer_photos(self):
  hashes=read('data/photo-audit-references.json')['unchanged_historical_surface_hashes']
  for t in read('data/corner-details.json')['tracks']:
   self.assertIn('photo_audit',t)
   for p in t['profiles'][:3]:self.assertEqual(hashlib.sha256(json.dumps(p,sort_keys=True,separators=(',',':')).encode()).hexdigest(),hashes[t['id']][str(p['year'])],t['name'])
 def test_new_paint_and_paving_clear_both_roads_and_building_footprints(self):
  for t,pit,v,build in zip(read('data/tracks.json'),read('data/pit-lanes.json')['tracks'],read('data/corner-details.json')['tracks'],read('data/buildings.json')['tracks']):
   protected=unary_union([LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+.12),LineString([(q[0],q[2])for q in pit['points']]).buffer(pit['width']/2+.6)]+[Polygon(b['footprint'])for b in build['buildings']])
   for r in v['profiles'][3]['runoffs']:
    if not r.get('evidence','').startswith('Photo-audited'):continue
    for tri in r['triangles']:self.assertLess(Polygon(tri).intersection(protected).area,.002,t['name'])
 def test_named_chicanes_have_opposite_apices_and_photographed_palettes(self):
  v=read('data/corner-details.json')['tracks']
  for ti,prefix in [(2,'Rettifilo'),(5,'Senna S')]:
   k=[k for k in v[ti]['profiles'][3]['kerbs']if k['name'].startswith(prefix)and'apex'in k['name']]
   self.assertEqual(len(k),2);self.assertEqual(k[0]['side'],-k[1]['side']);self.assertLess(k[0]['end_index'],k[1]['start_index'])
  for k in v[5]['profiles'][3]['kerbs']:
   if k['name'].startswith('Senna S'):self.assertEqual((k['color_a'],k['color_b']),('#d9c843','#30764e'))
  for k in v[9]['profiles'][3]['kerbs']:
   if k['name'].startswith('Spitzkehre'):self.assertEqual(k['color_a'],'#3289b6')

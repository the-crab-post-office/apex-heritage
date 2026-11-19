"""Independent source, corridor and deterministic modern-circuit contracts."""
import hashlib,json,math,subprocess,sys,unittest
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
class ExpansionTests(unittest.TestCase):
 def test_existing_ten_circuit_records_are_unchanged(self):
  baseline=read('data/expansion-references.json')['preserved_records_sha256']
  for file,hashes in baseline.items():
   records=read(file);records=records if isinstance(records,list)else records['tracks']
   for t in records:
    if t['id']in hashes:self.assertEqual(hashlib.sha256(json.dumps(t,sort_keys=True,separators=(',',':')).encode()).hexdigest(),hashes[t['id']],(file,t['id']))
 def test_three_real_geographic_layouts_and_sources_are_complete(self):
  tracks=read('data/tracks.json');self.assertEqual(len(tracks),13)
  for t in tracks[-3:]:
   self.assertGreater(len(t['points']),800);self.assertEqual(len(t['points']),len(t['heights']));self.assertEqual(len(t['points']),len(t['banking']))
   length=sum(math.dist(a,b)for a,b in zip(t['points'],t['points'][1:]+[t['points'][0]]));self.assertAlmostEqual(length,t['length'],delta=t['length']*.015)
   self.assertGreater(t['elevation'],5);self.assertIn('not reconstructed',t['layout_status'])
   self.assertTrue(any(t['id']==a['id']for a in read('data/imagery.json')['tracks']))
   self.assertTrue(any(t['id']==a['id']for a in read('data/expansion-map-source.json')['tracks']))
  source=next(t for t in read('data/elevation-dem.json')['tracks']if t['id']=='az-2016');self.assertEqual(source['resolution_m'],90);self.assertIn('90m',source['source_url'])
  self.assertEqual(tracks[11]['start_reference']['status'],'snapped to mapped marker')
 def test_new_kerbs_and_paint_are_disjoint_from_driving_roads_and_buildings(self):
  for t,pit,v,bs in zip(read('data/tracks.json')[-3:],read('data/pit-lanes.json')['tracks'][-3:],read('data/corner-details.json')['tracks'][-3:],read('data/buildings.json')['tracks'][-3:]):
   mask=unary_union([LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+.12),LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+.6)]+[Polygon(b['footprint'])for b in bs['buildings']])
   seen=Polygon()
   for runoff in v['profiles'][3]['runoffs']:
    shape=unary_union([Polygon(q)for q in runoff['triangles']]);self.assertLess(shape.intersection(mask).area,.1,(t['name'],runoff['name']));self.assertLess(shape.intersection(seen).area,.1,(t['name'],runoff['name']));seen=unary_union([seen,shape])
   for p in v['profiles']:
    self.assertIn('modern-layout substitute',p['label']);self.assertEqual(p['kerbs'],v['profiles'][3]['kerbs'])
 def test_banking_is_explicit_and_preserves_old_flat_cross_sections(self):
  ts=read('data/tracks.json');t=ts[11];self.assertLess(t['banking'][166],-.17);self.assertGreater(t['banking'][766],.32);self.assertEqual(t['banking'][0],0)
  self.assertLess(max(abs(a-b)for a,b in zip(t['banking'],t['banking'][1:]+[t['banking'][0]])),.05)
  self.assertTrue(all(not t.get('banking')for t in ts[:10]));self.assertLess(ts[10]['banking'][720],-.049)
 def test_reference_rights_and_landmark_scenes_are_explicit(self):
  refs=read('data/expansion-references.json');self.assertEqual(len(refs['photos']),4);self.assertTrue(all(not p['redistributed']for p in refs['photos']))
  scenes=read('data/reference-scenes.json')['scenes']
  for name in ['Yas Marina','Zandvoort','Baku']:
   s=next(s for s in scenes if s['track']==name);self.assertEqual(s['eras'],[0,1,2,3,4]);self.assertGreater(len(s['facets']),0)
  yas=next(s for s in scenes if s['track']=='Yas Marina');self.assertGreater(sum(f['tag']=='yas-hotel-lattice'for f in yas['facets']),1000)
  baku=next(s for s in scenes if s['track']=='Baku');self.assertTrue(any(f['tag']=='castle-wall'for f in baku['facets']));self.assertTrue(any(f['tag']=='water'for f in baku['facets']))
  self.assertEqual(next(o for o in baku['objects']if o['name']=='Old City wall / castle corridor')['osm_way'],1502989778)
  t=read('data/tracks.json')[12];walls=[Polygon([(p[0],p[2])for p in f['p']])for f in baku['facets']if f['tag']=='castle-wall'];self.assertLess(unary_union(walls).distance(LineString(t['points'][520:541])),12)
 def test_expansion_builder_is_offline_and_byte_deterministic(self):
  files=['data/tracks.json','data/buildings.json','data/pit-lanes.json','data/corner-details.json','data/venue-osm.json','data/start-markers.json']
  before={f:(R/f).read_bytes()for f in files};subprocess.run([sys.executable,'scripts/build-expansion.py'],cwd=R,check=True,capture_output=True)
  for f,b in before.items():self.assertEqual(b,(R/f).read_bytes(),f)

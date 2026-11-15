"""Monaco footprint/courtyard refinement is offline and deterministic."""
import json,subprocess,sys,unittest
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
class MonacoReferenceTests(unittest.TestCase):
 def test_refinement_preserves_courtyard_voids_and_both_driving_corridors(self):
  t=read('data/tracks.json')[1];pit=read('data/pit-lanes.json')['tracks'][1];buildings=read('data/buildings.json')['tracks'][1]['buildings']
  protected=unary_union([LineString(t['points']+[t['points'][0]]).buffer(t['width']/2+3.5),LineString([(p[0],p[2])for p in pit['points']]).buffer(pit['width']/2+3.5)])
  ref=read('data/monaco-reference.json');import math
  o=t['origin'];co=math.cos(math.radians(o['latitude']))
  def project(p):return [(p[0]-o['longitude'])*111320*co,-(p[1]-o['latitude'])*111320]
  for r in ref['landmarks']:
   parts=[Polygon(b['footprint'])for b in buildings if b.get('monaco_reference_part')and b['osm_id']==r['osm_id']];self.assertTrue(parts);merged=unary_union(parts)
   self.assertLess(merged.intersection(protected).area,.05)
   for hole in r['holes']:self.assertLess(merged.intersection(Polygon([project(p)for p in hole])).area,.1)
 def test_refinement_is_byte_deterministic(self):
  p=ROOT/'data/buildings.json';before=p.read_bytes();subprocess.run([sys.executable,'scripts/monaco_reference.py'],cwd=ROOT,check=True,capture_output=True);self.assertEqual(before,p.read_bytes())
if __name__=='__main__':unittest.main()

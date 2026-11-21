"""Mesh orientation regressions independent of image aesthetics."""
import math
import sys
from pathlib import Path
import unittest
R=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(R/'scripts'))
ns={'__file__':str(R/'scripts/build-car-shapes.py')}
exec(compile((R/'scripts/build-car-shapes.py').read_text().split('\nmodels={}')[0],str(R/'scripts/build-car-shapes.py'),'exec'),ns)
Model=ns['Model']

def normal(a,b,c):
    u=[b[i]-a[i]for i in range(3)];v=[c[i]-a[i]for i in range(3)]
    return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]

class CarRealismTests(unittest.TestCase):
    def test_modern_closed_lofts_have_outward_skin_and_bulkhead_normals_in_both_directions(self):
        for era in [3,4,5]:
            for rows in [[[1,.3,.5,.15],[-1,.3,.5,.15]],[[-1,.3,.5,.15],[1,.3,.5,.15]]]:
                m=Model(era);m.loft('test cylinder','body',rows);b=m.parts[0]
                for i in range(0,len(b['indices']),3):
                    pts=[b['positions'][j]for j in b['indices'][i:i+3]];n=normal(*pts)
                    if sum(v*v for v in n)<1e-18:continue
                    c=[sum(p[k]for p in pts)/3 for k in range(3)]
                    if abs(n[2])>sum(abs(v)for v in n[:2])*100:
                        self.assertGreater(n[2]*c[2],0)
                    else:self.assertGreater(n[0]*c[0]+n[1]*(c[1]-.5),0)
    def test_modern_ellipsoid_normals_point_outward(self):
        for era in [3,4,5]:
            m=Model(era);m.ellipsoid('test helmet','helmet',[0,0,0],[.1,.2,.15]);b=m.parts[0]
            for i in range(0,len(b['indices']),3):
                pts=[b['positions'][j]for j in b['indices'][i:i+3]];n=normal(*pts)
                if sum(v*v for v in n)<1e-18:continue
                c=[sum(p[k]for p in pts)/3 for k in range(3)]
                self.assertGreater(sum(n[k]*c[k]for k in range(3)),0)
    def test_smoothed_sections_do_not_overshoot_or_reverse_longitudinal_order(self):
        from car_surface import smooth_sections
        rows=[[-1,.1,.3,.1],[-.5,.3,.5,.2],[0,.2,.55,.1],[.5,.15,.6,.08]]
        out=smooth_sections(rows,4)
        self.assertEqual(out[0],rows[0]);self.assertEqual(out[-1],rows[-1])
        self.assertTrue(all(a[0]<b[0]for a,b in zip(out,out[1:])))
        for i in range(len(rows)-1):
            for row in out[i*4:i*4+4]:
                for k in range(4):self.assertTrue(min(rows[i][k],rows[i+1][k])-1e-10<=row[k]<=max(rows[i][k],rows[i+1][k])+1e-10)
    def test_shouldered_pod_has_finite_projectable_flank(self):
        from car_surface import pod_outer
        for row in range(21):
            self.assertTrue(math.isfinite(pod_outer(.25,.5,.15,.6,.35+row*.015)))

if __name__=='__main__':unittest.main()

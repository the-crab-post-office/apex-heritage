//! Ground support sampled from the exact native terrain/pit/corner triangles.
use macroquad::prelude::*;
use std::collections::HashMap;
pub struct Ground {
    triangles: Vec<[[f32; 3]; 3]>,
    cells: HashMap<(i32, i32), Vec<usize>>,
}
impl Ground {
    pub fn new(groups: &[&[Mesh]]) -> Self {
        let mut s = Self {
            triangles: vec![],
            cells: HashMap::new(),
        };
        for group in groups {
            for mesh in *group {
                for ids in mesh.indices.chunks_exact(3) {
                    let t = [0, 1, 2].map(|j| mesh.vertices[ids[j] as usize].position.to_array());
                    if ((t[1][0] - t[0][0]) * (t[2][2] - t[0][2])
                        - (t[2][0] - t[0][0]) * (t[1][2] - t[0][2]))
                        .abs()
                        < 0.000001
                    {
                        continue;
                    }
                    let id = s.triangles.len();
                    s.triangles.push(t);
                    let bounds = |k: usize| {
                        t.iter()
                            .map(|p| p[k])
                            .fold((f32::INFINITY, f32::NEG_INFINITY), |(a, b), x| {
                                (a.min(x), b.max(x))
                            })
                    };
                    let (x0, x1) = bounds(0);
                    let (z0, z1) = bounds(2);
                    for x in (x0 / 32.).floor() as i32..=(x1 / 32.).floor() as i32 {
                        for z in (z0 / 32.).floor() as i32..=(z1 / 32.).floor() as i32 {
                            s.cells.entry((x, z)).or_default().push(id);
                        }
                    }
                }
            }
        }
        s
    }
    pub fn height(&self, x: f32, z: f32) -> Option<f32> {
        self.cells
            .get(&((x / 32.).floor() as i32, (z / 32.).floor() as i32))
            .into_iter()
            .flatten()
            .filter_map(|i| apex_heritage::corner::height(self.triangles[*i], x, z))
            .max_by(f32::total_cmp)
    }
    pub fn spans(
        &self,
        a: [f32; 2],
        b: [f32; 2],
        fallback: impl Fn(f32, f32) -> f32,
    ) -> Vec<(Vec3, Vec3)> {
        let n = (((b[0] - a[0]).hypot(b[1] - a[1])) / 1.5).ceil().max(1.) as usize;
        let at = |f: f32| {
            let x = a[0] + (b[0] - a[0]) * f;
            let z = a[1] + (b[1] - a[1]) * f;
            vec3(x, self.height(x, z).unwrap_or_else(|| fallback(x, z)), z)
        };
        fn split(
            at: &impl Fn(f32) -> Vec3,
            a: f32,
            b: f32,
            depth: u8,
            out: &mut Vec<(Vec3, Vec3)>,
        ) {
            let p = at(a);
            let q = at(b);
            let m = (a + b) / 2.;
            if depth < 5 && (at(m).y - (p.y + q.y) / 2.).abs() > 0.04 {
                split(at, a, m, depth + 1, out);
                split(at, m, b, depth + 1, out);
            } else {
                out.push((p, q));
            }
        }
        let mut out = vec![];
        for i in 0..n {
            split(
                &at,
                i as f32 / n as f32,
                (i + 1) as f32 / n as f32,
                0,
                &mut out,
            );
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn samples_sloped_triangles_and_topmost_layer() {
        let mesh = Mesh {
            vertices: [
                [0., 0., 0.],
                [10., 10., 0.],
                [0., 0., 10.],
                [0., 20., 0.],
                [10., 20., 0.],
                [0., 20., 10.],
            ]
            .map(|p| Vertex::new2(Vec3::from_array(p), Vec2::ZERO, WHITE))
            .to_vec(),
            indices: vec![0, 1, 2, 3, 4, 5],
            texture: None,
        };
        let g = Ground::new(&[&[mesh]]);
        assert_eq!(g.height(2., 2.), Some(20.));
        assert_eq!(g.height(9., 9.), None);
        let spans = g.spans([0., 0.], [6., 0.], |_, _| -100.);
        assert_eq!(spans.len(), 4);
        for (a, b) in spans {
            assert!((b - a).length() <= 1.5001);
            assert_eq!(a.y, 20.);
            assert_eq!(b.y, 20.);
        }
    }
    #[test]
    fn adaptive_spans_follow_terrain_crease() {
        let g = Ground::new(&[]);
        let height = |x: f32, _| (x - 0.65).abs() * 2.;
        let spans = g.spans([0., 0.], [6., 0.], height);
        assert!(spans.len() > 4);
        for (a, b) in spans {
            assert!((b.x - a.x) <= 1.5001);
            assert!((height((a.x + b.x) / 2., 0.) - (a.y + b.y) / 2.).abs() <= 0.04001);
        }
    }
}

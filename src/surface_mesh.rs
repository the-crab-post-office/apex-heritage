//! Subtract the complete projected road footprint from terrain TRIANGLES.
//! Vertex clearance alone cannot prevent triangle interiors piercing the road.
use crate::Track;
use std::collections::{HashMap, HashSet};
pub type Point = [f64; 3];
pub type Triangle = [Point; 3];
/// Banking belongs to the pavement and narrow shoulder, not an infinitely
/// extruded tilted plane. Fade into the dune bed outside the kerb.
pub fn bank_offset(width: f64, offset: f64) -> (f64, f64) {
    let start = width / 2. + 1.5;
    let t = ((offset.abs() - start) / 12.).clamp(0., 1.);
    let fade = 1. - t * t * (3. - 2. * t);
    let derivative = if t > 0. && t < 1. {
        -6. * t * (1. - t) / 12.
    } else {
        0.
    };
    (offset * fade, fade + offset.abs() * derivative)
}
/// Continuous, tessellated earth shoulders for banked circuits. At the outer
/// boundary this rejoins the unbanked geographic terrain, never a vertical lip.
pub fn banked_ground(t: &Track) -> Vec<Triangle> {
    if !t.banking.iter().any(|b| b.abs() > 0.1) {
        return vec![];
    }
    let mut out = vec![];
    for side in [-1., 1.] {
        for band in [0., 2., 5., 8., 12., 16., 20., 26., 32., 38.].windows(2) {
            for i in 0..t.points.len() {
                let j = (i + 1) % t.points.len();
                let at = |k, off| {
                    let mut p = road_point(t, k, side * (t.width as f64 / 2. + off), 0.);
                    p[1] = t.driving_surface(p[0] as f32, p[2] as f32, k, 0.).height as f64 + 0.01;
                    p
                };
                let (a, b, c, d) = (
                    at(i, band[0]),
                    at(j, band[0]),
                    at(i, band[1]),
                    at(j, band[1]),
                );
                out.extend([[a, b, c], [c, b, d]]);
            }
        }
    }
    out
}
pub fn road_point_open(t: &Track, i: usize, offset: f64, height: f64) -> Point {
    section_point(t, i, offset, height, false)
}
pub fn road_point(t: &Track, i: usize, offset: f64, height: f64) -> Point {
    section_point(t, i, offset, height, true)
}
fn section_point(t: &Track, i: usize, offset: f64, height: f64, closed: bool) -> Point {
    let n = t.points.len();
    let a = t.points[i];
    let p = t.points[if closed {
        (i + n - 1) % n
    } else {
        i.saturating_sub(1)
    }];
    let q = t.points[if closed {
        (i + 1) % n
    } else {
        (i + 1).min(n - 1)
    }];
    let dx = (q[0] - p[0]) as f64;
    let dz = (q[1] - p[1]) as f64;
    let len = dx.hypot(dz).max(0.000001);
    [
        a[0] as f64 + dz / len * offset,
        t.heights[i] as f64
            + height
            + bank_offset(t.width as f64, offset).0
                * t.banking.get(i).copied().unwrap_or(0.) as f64,
        a[1] as f64 - dx / len * offset,
    ]
}
fn cross(a: Point, b: Point, p: Point) -> f64 {
    (b[0] - a[0]) * (p[2] - a[2]) - (b[2] - a[2]) * (p[0] - a[0])
}
pub fn area(p: &[Point]) -> f64 {
    if p.len() < 3 {
        return 0.;
    }
    let a = p[0];
    (1..p.len() - 1)
        .map(|i| cross(a, p[i], p[i + 1]))
        .sum::<f64>()
        .abs()
        / 2.
}
fn half_plane(poly: &[Point], a: Point, b: Point, inside: bool) -> Vec<Point> {
    let mut out = Vec::new();
    for i in 0..poly.len() {
        let p = poly[i];
        let q = poly[(i + 1) % poly.len()];
        let cp = cross(a, b, p);
        let cq = cross(a, b, q);
        let pin = if inside { cp >= 0. } else { cp <= 0. };
        let qin = if inside { cq >= 0. } else { cq <= 0. };
        if pin {
            out.push(p);
        }
        if pin != qin {
            let t = cp / (cp - cq);
            out.push([
                p[0] + (q[0] - p[0]) * t,
                p[1] + (q[1] - p[1]) * t,
                p[2] + (q[2] - p[2]) * t,
            ]);
        }
    }
    out
}
pub fn subtract_triangle(poly: &[Point], mut clip: Triangle) -> Vec<Vec<Point>> {
    // A coarse spatial cell may contain many unrelated facets. Do not split a
    // disjoint polygon along their infinite edge lines.
    for axis in [0, 2] {
        let pmin = poly.iter().map(|p| p[axis]).fold(f64::INFINITY, f64::min);
        let pmax = poly
            .iter()
            .map(|p| p[axis])
            .fold(f64::NEG_INFINITY, f64::max);
        let cmin = clip.iter().map(|p| p[axis]).fold(f64::INFINITY, f64::min);
        let cmax = clip
            .iter()
            .map(|p| p[axis])
            .fold(f64::NEG_INFINITY, f64::max);
        if pmax <= cmin || cmax <= pmin {
            return vec![poly.to_vec()];
        }
    }
    if cross(clip[0], clip[1], clip[2]) < 0. {
        clip.swap(0, 2);
    }
    let mut remaining = poly.to_vec();
    let mut result = Vec::new();
    for i in 0..3 {
        if remaining.len() < 3 {
            break;
        }
        let a = clip[i];
        let b = clip[(i + 1) % 3];
        let outside = half_plane(&remaining, a, b, false);
        if area(&outside) > 1e-7 {
            result.push(outside);
        }
        remaining = half_plane(&remaining, a, b, true);
    }
    result
}
pub struct RoadMask {
    triangles: Vec<Triangle>,
    cells: HashMap<(i32, i32), Vec<usize>>,
}
fn cells(poly: &[Point]) -> Vec<(i32, i32)> {
    let minx = poly.iter().map(|p| p[0]).fold(f64::INFINITY, f64::min);
    let maxx = poly.iter().map(|p| p[0]).fold(f64::NEG_INFINITY, f64::max);
    let minz = poly.iter().map(|p| p[2]).fold(f64::INFINITY, f64::min);
    let maxz = poly.iter().map(|p| p[2]).fold(f64::NEG_INFINITY, f64::max);
    let mut out = Vec::new();
    for x in (minx / 40.).floor() as i32..=(maxx / 40.).floor() as i32 {
        for z in (minz / 40.).floor() as i32..=(maxz / 40.).floor() as i32 {
            out.push((x, z));
        }
    }
    out
}
impl RoadMask {
    pub fn new(t: &Track) -> Self {
        Self::build(t, true)
    }
    pub fn new_open(t: &Track) -> Self {
        Self::build(t, false)
    }
    fn build(t: &Track, closed: bool) -> Self {
        let mut triangles = Vec::new();
        let w = t.width as f64 / 2.;
        for i in 0..if closed {
            t.points.len()
        } else {
            t.points.len() - 1
        } {
            let j = (i + 1) % t.points.len();
            let a = section_point(t, i, -w, 0., closed);
            let b = section_point(t, j, -w, 0., closed);
            let c = section_point(t, i, w, 0., closed);
            let d = section_point(t, j, w, 0., closed);
            triangles.extend([[a, b, c], [c, b, d]]);
        }
        Self::from_triangles(triangles)
    }
    pub fn from_triangles(triangles: Vec<Triangle>) -> Self {
        let mut index: HashMap<(i32, i32), Vec<usize>> = HashMap::new();
        for (i, t) in triangles.iter().enumerate() {
            for key in cells(t) {
                index.entry(key).or_default().push(i);
            }
        }
        Self {
            triangles,
            cells: index,
        }
    }
    pub fn cut(&self, tri: Triangle) -> Vec<Triangle> {
        let mut ids = HashSet::new();
        for cell in cells(&tri) {
            if let Some(list) = self.cells.get(&cell) {
                ids.extend(list.iter().copied());
            }
        }
        // Stable order avoids nondeterministic triangulations between rebuilds.
        let mut ids: Vec<usize> = ids.into_iter().collect();
        ids.sort_unstable();
        let mut parts = vec![tri.to_vec()];
        for id in ids {
            parts = parts
                .into_iter()
                .flat_map(|p| subtract_triangle(&p, self.triangles[id]))
                .collect();
            if parts.is_empty() {
                break;
            }
        }
        let mut out = Vec::new();
        for p in parts {
            for i in 1..p.len() - 1 {
                let tri = [p[0], p[i], p[i + 1]];
                if area(&tri) > 1e-7 {
                    out.push(tri);
                }
            }
        }
        out
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bank_fade_derivative_and_earth_stations_are_continuous() {
        for x in [-25., -18., -10., -7.5, 0., 7.5, 10., 18., 25.] {
            let e = 0.00001;
            let numerical = (bank_offset(12., x + e).0 - bank_offset(12., x - e).0) / (2. * e);
            assert!((bank_offset(12., x).1 - numerical).abs() < 0.00001);
        }
        let t = crate::tracks().remove(11);
        let tris = banked_ground(&t);
        assert_eq!(tris.len(), 36 * t.points.len());
        for tri in &tris {
            assert!(tri.iter().flatten().all(|v| v.is_finite()));
        }
        // Adjacent cells use exactly the same vertices, not separately rounded
        // offsets; outer stations rejoin the sampled geographic bed.
        for (i, tri) in tris
            .iter()
            .enumerate()
            .take(t.points.len() * 2 - 2)
            .step_by(2)
        {
            assert_eq!(tri[1], tris[i + 2][0]);
        }
        for i in (0..t.points.len()).step_by(31) {
            let p = road_point(&t, i, t.width as f64 / 2. + 38., 0.);
            let y = t.driving_surface(p[0] as f32, p[2] as f32, i, 0.).height;
            assert!((y - (t.terrain_height(p[0] as f32, p[2] as f32) - 1.25)).abs() < 0.0001);
        }
    }
    #[test]
    fn subtracts_interiors_and_interpolates_height() {
        let poly = [[-10., 0., -10.], [10., 20., -10.], [0., 10., 10.]];
        let clip = [[-2., 0., -2.], [2., 0., -2.], [0., 0., 2.]];
        let parts = subtract_triangle(&poly, clip);
        let total: f64 = parts.iter().map(|p| area(p)).sum();
        assert!((total - (area(&poly) - area(&clip))).abs() < 1e-7);
        for p in parts.iter().flatten() {
            assert!((p[1] - (p[0] + 10.)).abs() < 1e-7);
        }
    }
    #[test]
    fn terrain_pieces_exclude_each_circuits_road() {
        for t in crate::tracks() {
            let mask = RoadMask::new(&t);
            for i in (0..t.points.len()).step_by(67) {
                let p = t.points[i];
                let (x, z) = (p[0] as f64, p[1] as f64);
                let tri = [
                    [x - 30., 150., z - 30.],
                    [x + 30., 170., z - 30.],
                    [x, 160., z + 30.],
                ];
                for piece in mask.cut(tri) {
                    let centroid = [
                        (piece[0][0] + piece[1][0] + piece[2][0]) / 3.,
                        0.,
                        (piece[0][2] + piece[1][2] + piece[2][2]) / 3.,
                    ];
                    for id in cells(&piece)
                        .iter()
                        .filter_map(|c| mask.cells.get(c))
                        .flatten()
                    {
                        let q = mask.triangles[*id];
                        let a = cross(q[0], q[1], centroid);
                        let b = cross(q[1], q[2], centroid);
                        let c = cross(q[2], q[0], centroid);
                        assert!(
                            !((a > 1e-6 && b > 1e-6 && c > 1e-6)
                                || (a < -1e-6 && b < -1e-6 && c < -1e-6)),
                            "{}",
                            t.name
                        );
                    }
                }
            }
        }
    }
}

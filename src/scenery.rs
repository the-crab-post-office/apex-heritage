//! Footprint / canopy exclusion against every segment of the closed circuit.
use crate::Track;
use serde::Deserialize;
fn cross(a: [f32; 2], b: [f32; 2], c: [f32; 2]) -> f32 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}
pub fn point_segment(p: [f32; 2], a: [f32; 2], b: [f32; 2]) -> f32 {
    let dx = b[0] - a[0];
    let dz = b[1] - a[1];
    let len = dx * dx + dz * dz;
    let t = if len > 0. {
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len
    } else {
        0.
    }
    .clamp(0., 1.);
    (p[0] - a[0] - t * dx).hypot(p[1] - a[1] - t * dz)
}
pub fn inside(p: [f32; 2], polygon: &[[f32; 2]]) -> bool {
    let mut hit = false;
    for i in 0..polygon.len() {
        let a = polygon[i];
        let b = polygon[(i + 1) % polygon.len()];
        if (a[1] > p[1]) != (b[1] > p[1])
            && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]
        {
            hit = !hit;
        }
    }
    hit
}
fn segment_distance(a: [f32; 2], b: [f32; 2], c: [f32; 2], d: [f32; 2]) -> f32 {
    if cross(a, b, c) * cross(a, b, d) < 0. && cross(c, d, a) * cross(c, d, b) < 0. {
        return 0.;
    }
    point_segment(a, c, d)
        .min(point_segment(b, c, d))
        .min(point_segment(c, a, b))
        .min(point_segment(d, a, b))
}
impl Track {
    pub fn circle_clear(&self, x: f32, z: f32, radius: f32) -> bool {
        (0..self.points.len()).all(|i| {
            point_segment(
                [x, z],
                self.points[i],
                self.points[(i + 1) % self.points.len()],
            ) > self.width / 2. + 3. + radius
        })
    }
    pub fn polygon_clear(&self, poly: &[[f32; 2]]) -> bool {
        poly.len() >= 3
            && (0..self.points.len()).all(|i| {
                let a = self.points[i];
                let b = self.points[(i + 1) % self.points.len()];
                !inside(a, poly)
                    && !inside(b, poly)
                    && (0..poly.len()).all(|j| {
                        segment_distance(a, b, poly[j], poly[(j + 1) % poly.len()])
                            > self.width / 2. + 3.
                    })
            })
    }
}
#[derive(Clone, Deserialize)]
pub struct Building {
    pub osm_id: u64,
    pub footprint: Vec<[f32; 2]>,
    pub height: f32,
}
#[derive(Deserialize)]
pub struct BuildingTrack {
    pub id: String,
    pub buildings: Vec<Building>,
}
#[cfg(any(feature = "native", test))]
pub fn buildings() -> Vec<BuildingTrack> {
    #[derive(Deserialize)]
    struct Database {
        tracks: Vec<BuildingTrack>,
    }
    serde_json::from_str::<Database>(include_str!("../data/buildings.json"))
        .expect("Checked-in OSM snapshot")
        .tracks
}
/// Ear-clipped roofs retain concave mapped polygons; never use a covering box.
pub fn triangulate(poly: &[[f32; 2]]) -> Vec<[usize; 3]> {
    let mut ids: Vec<usize> = (0..poly.len()).collect();
    let mut result = Vec::new();
    let area: f32 = (0..poly.len())
        .map(|i| {
            let a = poly[i];
            let b = poly[(i + 1) % poly.len()];
            a[0] * b[1] - b[0] * a[1]
        })
        .sum();
    if area < 0. {
        ids.reverse();
    }
    while ids.len() > 2 {
        let mut found = false;
        for j in 0..ids.len() {
            let a = ids[(j + ids.len() - 1) % ids.len()];
            let b = ids[j];
            let c = ids[(j + 1) % ids.len()];
            if cross(poly[a], poly[b], poly[c]) <= 0.00001 {
                continue;
            }
            if ids.iter().any(|&k| {
                k != a
                    && k != b
                    && k != c
                    && cross(poly[a], poly[b], poly[k]) >= 0.
                    && cross(poly[b], poly[c], poly[k]) >= 0.
                    && cross(poly[c], poly[a], poly[k]) >= 0.
            }) {
                continue;
            }
            result.push([a, b, c]);
            ids.remove(j);
            found = true;
            break;
        }
        if !found {
            break;
        } // Degenerate roofs may be omitted, but walls keep the real footprint.
    }
    result
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn all_mapped_buildings_clear_the_entire_road() {
        let ts = crate::tracks();
        let bs = buildings();
        assert_eq!(bs.len(), 10);
        for (t, b) in ts.iter().zip(bs.iter()) {
            assert!(!b.buildings.is_empty(), "{}", t.name);
            for building in &b.buildings {
                assert!(
                    t.polygon_clear(&building.footprint),
                    "{} OSM {}",
                    t.name,
                    building.osm_id
                );
            }
        }
    }
    #[test]
    fn long_segments_canopies_and_concave_roofs() {
        let t = Track {
            name: "test".into(),
            length: 400.,
            width: 10.,
            points: vec![[0., 0.], [100., 0.], [100., 100.], [0., 100.]],
            heights: vec![0.; 4],
            ground_heights: vec![0.; 4],
            terrain: None,
        };
        assert!(!t.circle_clear(50., 1., 0.));
        assert!(!t.circle_clear(50., 14., 7.));
        assert!(t.circle_clear(50., 30., 7.));
        assert!(!t.circle_clear(-2., 50., 0.));
        assert!(!t.polygon_clear(&[[40., -20.], [60., -20.], [60., 20.], [40., 20.]]));
        assert!(!t.polygon_clear(&[[-20., -20.], [120., -20.], [120., 120.], [-20., 120.]]));
        let p = [
            [0., 0.],
            [10., 0.],
            [10., 4.],
            [4., 4.],
            [4., 10.],
            [0., 10.],
        ];
        let tris = triangulate(&p);
        assert_eq!(tris.len(), 4);
        let area: f32 = tris
            .iter()
            .map(|v| cross(p[v[0]], p[v[1]], p[v[2]]) / 2.)
            .sum();
        assert!((area - 64.).abs() < 0.001);
    }
    #[test]
    fn monaco_spawns_on_mapped_start_and_faces_sainte_devote() {
        let t = &crate::tracks()[1];
        assert!(t.points[0][0] < -300.);
        assert!(t.points[0][1] > 200.);
        assert!(t.points[1][0] < t.points[0][0]);
        assert!(t.points[1][1] < t.points[0][1]);
    }
}

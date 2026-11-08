//! Shared playable, assisted prototype pit lanes. These offsets are AUTHORED,
//! not surveyed or represented as the real circuits' mapped pit-lane geometry.
use crate::Track;
use serde::Serialize;
#[derive(Clone, Serialize)]
pub struct PitLane {
    pub points: Vec<[f32; 3]>,
    pub distances: Vec<f32>,
    pub entry_index: usize,
    pub exit_index: usize,
    pub box_distance: f32,
    pub length: f32,
    pub width: f32,
    pub limit: f32,
    pub source: String,
}
impl PitLane {
    pub fn new(t: &Track) -> Self {
        let n = t.points.len();
        let before = 45;
        let after = 65;
        let entry_index = n - before;
        let mut points = Vec::new();
        for row in 0..=before + after {
            let i = (entry_index + row) % n;
            let p = t.points[i];
            let a = t.points[(i + n - 1) % n];
            let b = t.points[(i + 1) % n];
            let dx = b[0] - a[0];
            let dz = b[1] - a[1];
            let len = dx.hypot(dz);
            let ramp = (row as f32 / 12.)
                .min((before + after - row) as f32 / 12.)
                .clamp(0., 1.);
            let ramp = ramp * ramp * (3. - 2. * ramp);
            let offset = (t.width / 2. + 8.) * ramp;
            points.push([
                p[0] + dz / len * offset,
                t.heights[i],
                p[1] - dx / len * offset,
            ]);
        }
        let mut distances = vec![0.];
        for i in 1..points.len() {
            let a = points[i - 1];
            let b = points[i];
            distances.push(distances[i - 1] + (b[0] - a[0]).hypot(b[2] - a[2]));
        }
        let length = *distances.last().unwrap();
        let box_distance = distances[before];
        Self {
            points,
            distances,
            entry_index,
            exit_index: after,
            box_distance,
            length,
            width: 6.,
            limit: 80. / 3.6,
            source: "Authored parallel prototype lane near start; NOT mapped/surveyed pit geometry"
                .into(),
        }
    }
    pub fn sample(&self, d: f32, n: usize) -> ([f32; 3], f32, f32, usize) {
        let d = d.clamp(0., self.length);
        let i = self
            .distances
            .partition_point(|v| *v <= d)
            .saturating_sub(1)
            .min(self.points.len() - 2);
        let a = self.points[i];
        let b = self.points[i + 1];
        let len = self.distances[i + 1] - self.distances[i];
        let f = (d - self.distances[i]) / len;
        (
            std::array::from_fn(|k| a[k] + (b[k] - a[k]) * f),
            (b[0] - a[0]).atan2(b[2] - a[2]),
            (b[1] - a[1]) / len,
            (self.entry_index + i) % n,
        )
    }
    pub fn distance(&self, x: f32, z: f32) -> f32 {
        self.points
            .windows(2)
            .map(|p| {
                let a = p[0];
                let b = p[1];
                let dx = b[0] - a[0];
                let dz = b[2] - a[2];
                let f = (((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz)).clamp(0., 1.);
                (x - a[0] - f * dx).hypot(z - a[2] - f * dz)
            })
            .fold(f32::INFINITY, f32::min)
    }
    pub fn as_track(&self) -> Track {
        Track {
            name: "Authored prototype pit lane".into(),
            length: self.length,
            width: self.width,
            points: self.points.iter().map(|p| [p[0], p[2]]).collect(),
            heights: self.points.iter().map(|p| p[1]).collect(),
            ground_heights: self.points.iter().map(|p| p[1]).collect(),
            terrain: None,
        }
    }
}
pub fn refuelling_allowed(era: usize) -> bool {
    era == 0 || era == 2
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn all_ten_lanes_have_continuous_ends_and_finite_box() {
        for t in crate::tracks() {
            let p = PitLane::new(&t);
            assert!(p.length > 400. && p.length < 800.);
            assert!(p.box_distance > 100. && p.box_distance < p.length - 100.);
            assert_eq!(p.points[0][0], t.points[p.entry_index][0]);
            assert_eq!(p.points.last().unwrap()[2], t.points[p.exit_index][1]);
            for d in [0., p.box_distance, p.length] {
                let (x, y, g, i) = p.sample(d, t.points.len());
                assert!(x.iter().all(|v| v.is_finite()) && y.is_finite() && g.is_finite());
                assert!(i < t.points.len());
            }
        }
    }
    #[test]
    fn refuelling_era_rules() {
        assert!(refuelling_allowed(0));
        assert!(!refuelling_allowed(1));
        assert!(refuelling_allowed(2));
        assert!(!refuelling_allowed(3));
    }
}

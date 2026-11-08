//! Shared playable pit paths from current OSM pit-lane ways. Width, height
//! smoothing, service box and race-day public-street registration are estimated.
use crate::Track;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
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
    pub osm_way_ids: Vec<u64>,
    pub track_indices: Vec<usize>,
}
impl PitLane {
    pub fn new(t: &Track) -> Self {
        #[derive(Deserialize)]
        struct Record {
            name: String,
            points: Vec<[f32; 3]>,
            entry_index: usize,
            exit_index: usize,
            box_distance: f32,
            width: f32,
            limit: f32,
            source: String,
            osm_way_ids: Vec<u64>,
            track_indices: Vec<usize>,
        }
        #[derive(Deserialize)]
        struct Database {
            tracks: Vec<Record>,
        }
        static DB: OnceLock<Database> = OnceLock::new();
        let db = DB.get_or_init(|| {
            serde_json::from_str(include_str!("../data/pit-lanes.json"))
                .expect("mapped pit database")
        });
        let record = db
            .tracks
            .iter()
            .find(|r| r.name == t.name)
            .expect("every circuit has a mapped pit lane");
        let points = record.points.clone();
        let mut distances = vec![0.];
        for i in 1..points.len() {
            let a = points[i - 1];
            let b = points[i];
            distances.push(distances[i - 1] + (b[0] - a[0]).hypot(b[2] - a[2]));
        }
        let length = *distances.last().unwrap();
        Self {
            points,
            distances,
            entry_index: record.entry_index,
            exit_index: record.exit_index,
            box_distance: record.box_distance,
            length,
            width: record.width,
            limit: record.limit,
            source: record.source.clone(),
            osm_way_ids: record.osm_way_ids.clone(),
            track_indices: record.track_indices.clone(),
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
            self.track_indices[i].min(n - 1),
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
            name: "Mapped pit lane".into(),
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
            assert!(p.length > 300. && p.length < 1600.);
            assert!(p.box_distance > 60. && p.box_distance < p.length - 60.);
            assert!(!p.osm_way_ids.is_empty());
            assert!(p.source.starts_with("OSM mapped"));
            assert_eq!(p.track_indices.len(), p.points.len());
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

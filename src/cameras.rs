//! Shared web/native camera definitions; chassis-local metres, +Z forward.
use serde::Deserialize;
use std::sync::OnceLock;
#[derive(Deserialize)]
pub struct Rig {
    pub id: String,
    pub label: String,
    pub position: [f32; 3],
    pub target: [f32; 3],
    pub fov: f32,
    pub attached: bool,
    pub hide_head: bool,
}
pub fn rigs() -> &'static Vec<Rig> {
    static RIGS: OnceLock<Vec<Rig>> = OnceLock::new();
    RIGS.get_or_init(|| {
        serde_json::from_str(include_str!("../data/cameras.json")).expect("valid camera rigs")
    })
}
pub fn pose(mode: usize, era: usize, time: f32) -> ([f32; 3], [f32; 3]) {
    let rig = rigs().get(mode).unwrap_or(&rigs()[0]);
    let (mut eye, mut target) = (rig.position, rig.target);
    if rig.id == "cockpit" && era == 0 {
        eye[1] = 0.97;
        target[1] = 0.97;
    }
    if rig.id == "orbit" {
        eye[0] = (time * 0.22).sin() * 7.5;
        eye[2] = -(time * 0.22).cos() * 7.5;
    }
    (eye, target)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn eight_distinct_rigs_with_clear_cockpit_and_rear_views() {
        assert_eq!(rigs().len(), 8);
        for (i, r) in rigs().iter().enumerate() {
            assert!(rigs()[..i].iter().all(|p| p.id != r.id));
            assert!((45.0..90.0).contains(&r.fov));
            for era in 0..4 {
                let (p, t) = pose(i, era, 2.0);
                assert!(p.iter().chain(t.iter()).all(|v| v.is_finite()));
                assert_ne!(p, t);
            }
        }
        assert!(rigs()[1].hide_head && rigs()[1].attached);
        assert!(rigs()[5].target[2] < -20.0);
        assert_ne!(pose(7, 3, 0.0), pose(7, 3, 5.0));
    }
}

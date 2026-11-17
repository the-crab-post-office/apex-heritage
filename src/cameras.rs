//! Shared web/native camera definitions; chassis-local metres, +Z forward.
use serde::{Deserialize, Serialize};
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
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
#[serde(default)]
pub struct Tuning {
    pub distance: f32,
    pub fov: Option<f32>,
}
impl Default for Tuning {
    fn default() -> Self {
        Self {
            distance: 1.0,
            fov: None,
        }
    }
}
impl Tuning {
    pub fn normalized(self) -> Self {
        Self {
            distance: if self.distance.is_finite() {
                self.distance.clamp(0.6, 1.8)
            } else {
                1.0
            },
            fov: self
                .fov
                .filter(|f| f.is_finite())
                .map(|f| f.clamp(45.0, 100.0)),
        }
    }
}
pub fn adjusted_pose(
    mode: usize,
    era: usize,
    time: f32,
    tuning: Tuning,
    look: [f32; 2],
) -> ([f32; 3], [f32; 3], f32) {
    let rig = rigs().get(mode).unwrap_or(&rigs()[0]);
    let t = tuning.normalized();
    let (mut eye, mut target) = pose(mode, era, time);
    if !rig.attached && t.distance != 1.0 {
        for k in 0..3 {
            eye[k] = target[k] + (eye[k] - target[k]) * t.distance;
        }
    }
    if look.iter().all(|v| v.is_finite()) && look != [0.0, 0.0] {
        let d = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]];
        let length = (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt();
        let yaw = d[0].atan2(d[2]) + look[0];
        let pitch = (d[1].atan2(d[0].hypot(d[2])) + look[1]).clamp(-1.45, 1.45);
        target = [
            eye[0] + yaw.sin() * pitch.cos() * length,
            eye[1] + pitch.sin() * length,
            eye[2] + yaw.cos() * pitch.cos() * length,
        ];
    }
    (eye, target, t.fov.unwrap_or(rig.fov))
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
            for era in 0..5 {
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

#[cfg(test)]
mod tuning_tests {
    use super::*;
    #[test]
    fn exterior_distance_and_fov_are_bounded_but_onboard_mount_is_fixed() {
        let t = Tuning {
            distance: 20.0,
            fov: Some(120.0),
        }
        .normalized();
        assert_eq!(t.distance, 1.8);
        assert_eq!(t.fov, Some(100.0));
        assert_eq!(
            Tuning {
                distance: f32::NAN,
                fov: Some(f32::INFINITY)
            }
            .normalized(),
            Tuning::default()
        );
        assert_ne!(adjusted_pose(0, 3, 0., t, [0., 0.]).0, pose(0, 3, 0.).0);
        assert_eq!(adjusted_pose(1, 3, 0., t, [0., 0.]).0, pose(1, 3, 0.).0);
    }
    #[test]
    fn free_look_changes_direction_not_mount_and_can_center_exactly() {
        for mode in 0..8 {
            let base = adjusted_pose(mode, 3, 0., Tuning::default(), [0., 0.]);
            let look = adjusted_pose(mode, 3, 0., Tuning::default(), [0.5, 0.3]);
            assert_eq!(base.0, look.0);
            assert_ne!(base.1, look.1);
            assert_eq!(base.0, pose(mode, 3, 0.).0);
            assert_eq!(base.1, pose(mode, 3, 0.).1);
        }
    }
}

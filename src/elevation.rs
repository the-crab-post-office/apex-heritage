//! Road-following height and grade shared by the two renderers and driving model.
//! Authored profiles, not a surveyed height field. Vehicles stay grounded (2.5D).
use crate::Track;

#[derive(Clone, Copy, Debug)]
pub struct Surface {
    pub height: f32,
    /// Rise/run in the vehicle's heading, not just the circuit's forward direction.
    pub grade: f32,
    pub progress: f32,
}
impl Track {
    /// Project onto the two segments adjoining a locally tracked nearest point.
    /// Never globally jump to the other branch of a crossover.
    pub fn surface_at(&self, x: f32, z: f32, nearest: usize, yaw: f32) -> Surface {
        let n = self.points.len();
        let mut best = f32::MAX;
        let mut result = Surface {
            height: self.heights[nearest],
            grade: 0.,
            progress: nearest as f32 / n as f32,
        };
        for i in [(nearest + n - 1) % n, nearest] {
            let j = (i + 1) % n;
            let a = self.points[i];
            let b = self.points[j];
            let dx = b[0] - a[0];
            let dz = b[1] - a[1];
            let d2 = dx * dx + dz * dz;
            let t = (((x - a[0]) * dx + (z - a[1]) * dz) / d2.max(0.0001)).clamp(0., 1.);
            let distance = (x - a[0] - dx * t).powi(2) + (z - a[1] - dz * t).powi(2);
            if distance < best {
                best = distance;
                let dh = self.heights[j] - self.heights[i];
                result = Surface {
                    height: self.heights[i] + dh * t,
                    grade: dh * (yaw.sin() * dx + yaw.cos() * dz) / d2.max(0.0001),
                    progress: ((i as f32 + t) / n as f32) % 1.,
                };
            }
        }
        result
    }
    /// Approximate surrounding ground from the nearest sampled centerline section.
    /// Uses base ground heights, so Suzuka's overpass doesn't fill the underpass.
    pub fn terrain_height(&self, x: f32, z: f32) -> f32 {
        let n = self.points.len();
        let mut best = f32::MAX;
        let mut height = 0.;
        for i in (0..n).step_by(4) {
            let j = (i + 4) % n;
            let a = self.points[i];
            let b = self.points[j];
            let dx = b[0] - a[0];
            let dz = b[1] - a[1];
            let len2 = dx * dx + dz * dz;
            let t = (((x - a[0]) * dx + (z - a[1]) * dz) / len2.max(0.001)).clamp(0., 1.);
            let d = (x - a[0] - dx * t).powi(2) + (z - a[1] - dz * t).powi(2);
            if d < best {
                best = d;
                height = self.ground_heights[i] * (1. - t) + self.ground_heights[j] * t;
            }
        }
        height
    }
}
#[cfg(test)]
mod tests {
    use crate::{tracks, Simulation};
    #[test]
    fn profiles_are_aligned_periodic_and_bounded() {
        assert_eq!(
            include_str!("../data/tracks.json"),
            include_str!("../web/assets/tracks.json")
        );
        for t in tracks() {
            let n = t.points.len();
            assert_eq!(t.heights.len(), n);
            assert_eq!(t.ground_heights.len(), n);
            assert!((t.heights[0] - t.heights[n - 1]).abs() < 1.);
            for i in 0..n {
                let j = (i + 1) % n;
                let d = (t.points[i][0] - t.points[j][0]).hypot(t.points[i][1] - t.points[j][1]);
                assert!((t.heights[j] - t.heights[i]).abs() / d < 0.25);
            }
        }
    }
    #[test]
    fn opposite_headings_reverse_grade() {
        let t = &tracks()[0];
        let i = 150;
        let p = t.points[i];
        let q = t.points[i + 1];
        let yaw = (q[0] - p[0]).atan2(q[1] - p[1]);
        let a = t.surface_at(p[0], p[1], i, yaw);
        let b = t.surface_at(p[0], p[1], i, yaw + std::f32::consts::PI);
        assert!((a.grade + b.grade).abs() < 0.0001);
        assert!(a.grade.abs() > 0.02);
    }
    #[test]
    fn gravity_changes_coasting_on_a_slope() {
        let mut up = Simulation::new(0, 2, 0, false, true);
        let mut down = Simulation::new(0, 2, 0, false, true);
        // Local synthetic slopes isolate grade physics from other car parameters.
        for sim in [&mut up, &mut down] {
            sim.track.points = vec![[0., 0.], [0., 100.], [100., 100.], [100., 0.]];
            sim.track.width = 14.;
            sim.state.x = 0.;
            sim.state.z = 40.;
            sim.state.yaw = 0.;
            sim.state.speed = 30.;
            sim.nearest = 0;
        }
        up.track.heights = vec![0., 10., 10., 0.];
        down.track.heights = vec![10., 0., 0., 10.];
        up.step(0., 0., 0., 0.05);
        down.step(0., 0., 0., 0.05);
        assert!(down.state.speed > up.state.speed + 0.08);
        assert!(up.state.pitch < 0.);
        assert!(down.state.pitch > 0.);
    }
    #[test]
    fn suzuka_overpass_is_above_the_lower_branch() {
        let t = &tracks()[4];
        let n = t.points.len();
        let a = (0.3873 * n as f32) as usize;
        let b = (0.7956 * n as f32) as usize;
        assert!(t.heights[b] - t.heights[a] > 7.);
        assert!((t.ground_heights[b] - t.ground_heights[a]).abs() < 0.1);
    }
}

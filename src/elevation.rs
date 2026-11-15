//! Road-following height and grade shared by the two renderers and driving model.
//! Geographic GLO-30 surface estimates with explicit road corrections, not survey data.
use crate::Track;

#[derive(Clone, serde::Deserialize)]
pub struct TerrainGrid {
    pub x0: f32,
    pub z0: f32,
    pub dx: f32,
    pub dz: f32,
    pub nx: usize,
    pub nz: usize,
    pub heights: Vec<f32>,
}
impl TerrainGrid {
    pub fn height(&self, x: f32, z: f32) -> f32 {
        let u = ((x - self.x0) / self.dx).clamp(0., self.nx as f32 - 1.00001);
        let v = ((z - self.z0) / self.dz).clamp(0., self.nz as f32 - 1.00001);
        let i = u as usize;
        let j = v as usize;
        let tx = u - i as f32;
        let tz = v - j as f32;
        let a = self.heights[j * self.nx + i];
        let b = self.heights[j * self.nx + i + 1];
        let c = self.heights[(j + 1) * self.nx + i];
        let d = self.heights[(j + 1) * self.nx + i + 1];
        (a * (1. - tx) + b * tx) * (1. - tz) + (c * (1. - tx) + d * tx) * tz
    }
}
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
    /// Keep the vehicle grounded when it leaves the road-aligned shoulders.
    /// The terrain mesh is rendered 1.25 m below its sampled field; the grass
    /// shoulder ribbon remains at road level. Blend across their outer edge.
    pub fn driving_surface(&self, x: f32, z: f32, nearest: usize, yaw: f32) -> Surface {
        let road = self.surface_at(x, z, nearest, yaw);
        if self.terrain.is_none() {
            return road;
        }
        let height = |x: f32, z: f32| {
            let road = self.surface_at(x, z, nearest, yaw);
            let n = self.points.len();
            let distance = [(nearest + n - 1) % n, nearest]
                .iter()
                .map(|&i| {
                    crate::scenery::point_segment([x, z], self.points[i], self.points[(i + 1) % n])
                })
                .fold(f32::INFINITY, f32::min);
            let blend = ((distance - (self.width / 2. + 14.)) / 10.).clamp(0., 1.);
            let blend = blend * blend * (3. - 2. * blend);
            if blend == 0. {
                road.height
            } else {
                road.height + (self.terrain_height(x, z) - 1.25 - road.height) * blend
            }
        };
        let y = height(x, z);
        if (y - road.height).abs() < 0.00001 {
            return road;
        }
        let dx = yaw.sin() * 0.5;
        let dz = yaw.cos() * 0.5;
        Surface {
            height: y,
            grade: height(x + dx, z + dz) - height(x - dx, z - dz),
            progress: road.progress,
        }
    }
    /// Geographic terrain blended into a road-aligned bed near the centreline.
    /// Uses base ground heights, so Suzuka's overpass doesn't fill the underpass.
    pub fn terrain_height(&self, x: f32, z: f32) -> f32 {
        let n = self.points.len();
        let mut best = f32::MAX;
        let mut height = 0.;
        for i in 0..n {
            let j = (i + 1) % n;
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
        if let Some(grid) = &self.terrain {
            let blend = ((best.sqrt() - (self.width / 2. + 30.)) / 110.).clamp(0., 1.);
            let blend = blend * blend * (3. - 2. * blend);
            height + (grid.height(x, z) - height) * blend
        } else {
            height
        }
    }
}
#[cfg(test)]
mod tests {
    use crate::{tracks, Simulation};
    #[test]
    fn spa_photo_climb_feeds_the_driving_surface_for_every_era() {
        let ts = tracks();
        let t = &ts[0];
        let foot = 164;
        let crest = 220;
        assert!((t.heights[crest] - t.heights[foot] - 40.).abs() < 0.002);
        for era in 0..4 {
            let mut sim = Simulation::new(0, era, 0, false, true);
            for i in (foot..=crest).step_by(4) {
                let p = t.points[i];
                let q = t.points[i + 1];
                let yaw = (q[0] - p[0]).atan2(q[1] - p[1]);
                sim.nearest = i;
                sim.state.x = p[0];
                sim.state.z = p[1];
                sim.state.yaw = yaw;
                sim.state.speed = 30.;
                let surface = t.driving_surface(p[0], p[1], i, yaw);
                assert!((surface.height - t.heights[i]).abs() < 0.002);
                sim.step(0.4, 0., 0., 0.01);
                assert!((sim.state.y - t.heights[i]).abs() < 0.7);
                assert_eq!(sim.state.wheels_on_track, 4);
            }
        }
    }
    #[test]
    fn profiles_are_aligned_periodic_and_bounded() {
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
    fn geographic_grid_bilinear_sampling_and_road_bed_match() {
        let grid = super::TerrainGrid {
            x0: 0.,
            z0: 0.,
            dx: 10.,
            dz: 20.,
            nx: 2,
            nz: 2,
            heights: vec![0., 10., 20., 30.],
        };
        assert!((grid.height(5., 10.) - 15.).abs() < 0.0001);
        for t in tracks() {
            let terrain = t
                .terrain
                .as_ref()
                .expect("All ten circuits need geographic terrain");
            assert_eq!(terrain.heights.len(), terrain.nx * terrain.nz);
            for i in (0..t.points.len()).step_by(17) {
                let p = t.points[i];
                assert!(
                    (t.terrain_height(p[0], p[1]) - t.ground_heights[i]).abs() < 0.01,
                    "{} point {}",
                    t.name,
                    i
                );
            }
        }
    }
    #[test]
    fn offroad_vehicle_follows_the_rendered_geographic_ground() {
        let t = &tracks()[0];
        let x = t.terrain.as_ref().unwrap().x0 + 30.;
        let z = t.terrain.as_ref().unwrap().z0 + 30.;
        let s = t.driving_surface(x, z, 0, 0.4);
        assert!((s.height - (t.terrain_height(x, z) - 1.25)).abs() < 0.001);
        let p = t.points[0];
        let road = t.driving_surface(p[0], p[1], 0, 0.4);
        assert!((road.height - t.heights[0]).abs() < 0.001);
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
        let data: serde_json::Value =
            serde_json::from_str(include_str!("../data/tracks.json")).unwrap();
        let correction = &data[4]["road_corrections"][0];
        let a = correction["lower_index"].as_u64().unwrap() as usize;
        let b = correction["upper_index"].as_u64().unwrap() as usize;
        assert!(t.heights[b] - t.heights[a] > 7.);
        assert!((t.ground_heights[b] - t.ground_heights[a]).abs() < 0.1);
    }
}

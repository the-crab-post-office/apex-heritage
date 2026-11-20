//! Authored, editable safety furniture shared by physics and both renderers.
//! Positions are not surveyed real-world facilities; see data/CORNER-DETAILS-NOTICE.md.
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Clone, Deserialize, Serialize)]
pub struct Barrier {
    #[serde(default)]
    pub index: usize,
    pub a: [f32; 2],
    pub b: [f32; 2],
    pub radius: f32,
    pub height: f32,
    pub kind: String,
    pub fence: bool,
}
#[derive(Clone, Deserialize, Serialize)]
pub struct Grandstand {
    #[serde(default)]
    pub osm_id: u64,
    #[serde(default)]
    pub index: usize,
    pub x: f32,
    pub z: f32,
    pub yaw: f32,
    pub width: f32,
    pub depth: f32,
    pub rows: u32,
    pub roof: bool,
    pub footprint: Vec<[f32; 2]>,
}
#[derive(Clone, Deserialize, Serialize)]
pub struct Venue {
    pub id: String,
    pub name: String,
    pub barriers: Vec<Barrier>,
    pub grandstands: Vec<Grandstand>,
    #[serde(skip)]
    cells: HashMap<(i32, i32), Vec<usize>>,
}
pub struct Impact {
    pub position: [f32; 2],
    pub velocity: [f32; 2],
    pub strength: f32,
}
impl Venue {
    pub fn for_track(name: &str) -> Self {
        Self::for_era(name, 3)
    }
    pub fn for_era(name: &str, era: usize) -> Self {
        let record = crate::corner::records()
            .iter()
            .find(|r| r.name == name)
            .expect("mapped venue for every circuit");
        let mut v = Self {
            id: record.id.clone(),
            name: record.name.clone(),
            barriers: record.profiles[era.min(3)]
                .barriers
                .clone()
                .unwrap_or_else(|| record.barriers.clone()),
            grandstands: record.grandstands.clone(),
            cells: HashMap::new(),
        };
        if era == 0 && name != "Monaco" {
            for b in &mut v.barriers {
                if !(name == "Spa-Francorchamps" && (140..250).contains(&b.index)) {
                    b.fence = false;
                }
            }
        }
        for (i, b) in v.barriers.iter().enumerate() {
            let r = b.radius + 1.1;
            for x in ((b.a[0].min(b.b[0]) - r) / 32.).floor() as i32
                ..=((b.a[0].max(b.b[0]) + r) / 32.).floor() as i32
            {
                for z in ((b.a[1].min(b.b[1]) - r) / 32.).floor() as i32
                    ..=((b.a[1].max(b.b[1]) + r) / 32.).floor() as i32
                {
                    v.cells.entry((x, z)).or_default().push(i);
                }
            }
        }
        v
    }
    /// Swept centre-circle impacts: sample no more than 0.4m apart, preventing a
    /// thin wall being skipped even at the public API's 50ms maximum physics step.
    /// This is deliberately not deformable tyres, damage or an FIA safety model.
    pub fn collide(&self, old: [f32; 2], new: [f32; 2], velocity: [f32; 2]) -> Option<Impact> {
        let mut ids = HashSet::new();
        for x in
            (old[0].min(new[0]) / 32.).floor() as i32..=(old[0].max(new[0]) / 32.).floor() as i32
        {
            for z in (old[1].min(new[1]) / 32.).floor() as i32
                ..=(old[1].max(new[1]) / 32.).floor() as i32
            {
                if let Some(cell) = self.cells.get(&(x, z)) {
                    ids.extend(cell.iter().copied());
                }
            }
        }
        if ids.is_empty() {
            return None;
        }
        let mut ids: Vec<usize> = ids.into_iter().collect();
        ids.sort_unstable();
        let steps = (((new[0] - old[0]).hypot(new[1] - old[1]) / 0.4).ceil() as usize).max(1);
        for step in 0..=steps {
            let f = step as f32 / steps as f32;
            let p = [
                old[0] + (new[0] - old[0]) * f,
                old[1] + (new[1] - old[1]) * f,
            ];
            for &i in &ids {
                let b = &self.barriers[i];
                let dx = b.b[0] - b.a[0];
                let dz = b.b[1] - b.a[1];
                let fraction = (((p[0] - b.a[0]) * dx + (p[1] - b.a[1]) * dz)
                    / (dx * dx + dz * dz))
                    .clamp(0., 1.);
                let q = [b.a[0] + fraction * dx, b.a[1] + fraction * dz];
                let distance = (p[0] - q[0]).hypot(p[1] - q[1]);
                let radius = b.radius + 1.;
                if distance >= radius {
                    continue;
                }
                let normal = if distance > 0.0001 {
                    [(p[0] - q[0]) / distance, (p[1] - q[1]) / distance]
                } else {
                    let speed = velocity[0].hypot(velocity[1]);
                    if speed > 0.001 {
                        [-velocity[0] / speed, -velocity[1] / speed]
                    } else {
                        let length = dx.hypot(dz).max(0.001);
                        [dz / length, -dx / length]
                    }
                };
                let vn = velocity[0] * normal[0] + velocity[1] * normal[1];
                let strength = (-vn).max(0.);
                let restitution = if b.kind == "tyres" { 0.12 } else { 0.035 };
                let damping =
                    1. - (strength / velocity[0].hypot(velocity[1]).max(1.) * 0.42).min(0.42);
                let velocity = if vn < 0. {
                    [
                        (velocity[0] - (1. + restitution) * vn * normal[0]) * damping,
                        (velocity[1] - (1. + restitution) * vn * normal[1]) * damping,
                    ]
                } else {
                    velocity
                };
                return Some(Impact {
                    position: [
                        q[0] + normal[0] * (radius + 0.015),
                        q[1] + normal[1] * (radius + 0.015),
                    ],
                    velocity,
                    strength,
                });
            }
        }
        None
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_circuit_has_mapped_facilities_and_clear_collision_capsules() {
        for t in crate::tracks() {
            let v = Venue::for_track(&t.name);
            let p = crate::pit::PitLane::new(&t);
            assert!(v.grandstands.len() >= 2);
            for kind in ["concrete"] {
                assert!(
                    v.barriers.iter().any(|b| b.kind == kind),
                    "{} {kind}",
                    t.name
                );
            }
            for b in &v.barriers {
                for f in [0., 0.25, 0.5, 0.75, 1.] {
                    let x = b.a[0] + (b.b[0] - b.a[0]) * f;
                    let z = b.a[1] + (b.b[1] - b.a[1]) * f;
                    assert!(crate::contact::point_on_pavement(&t, b.index, [x, z]) == false);

                    assert!(p.distance(x, z) > p.width / 2. + b.radius + 0.4);
                }
            }
            let mask = crate::surface_mesh::RoadMask::new(&t);
            let area = |p: [[f64; 3]; 3]| {
                ((p[1][0] - p[0][0]) * (p[2][2] - p[0][2])
                    - (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]))
                    .abs()
                    / 2.
            };
            for s in &v.grandstands {
                for ids in [[0, 1, 2], [0, 2, 3]] {
                    let tri = ids.map(|i| [s.footprint[i][0] as f64, 0., s.footprint[i][1] as f64]);
                    let kept: f64 = mask.cut(tri).into_iter().map(area).sum();
                    assert!(
                        (area(tri) - kept).abs() < 0.02,
                        "{} stand intersects actual road",
                        t.name
                    );
                }
            }
        }
    }
    #[test]
    fn fast_crossing_hits_a_thin_wall() {
        let mut v = Venue {
            id: "test".into(),
            name: "test".into(),
            barriers: vec![Barrier {
                index: 0,
                a: [0., -10.],
                b: [0., 10.],
                radius: 0.25,
                height: 1.2,
                kind: "concrete".into(),
                fence: false,
            }],
            grandstands: vec![],
            cells: HashMap::new(),
        };
        for x in -1..=0 {
            for z in -1..=0 {
                v.cells.insert((x, z), vec![0]);
            }
        }
        let hit = v.collide([-5., 0.], [5., 0.], [100., 0.]).unwrap();
        assert!(hit.position[0] < -1.);
        assert!(hit.velocity[0] <= 0.);
        assert!(hit.velocity[0].abs() < 10.);
        assert_eq!(hit.strength, 100.);
        let overlap = v.collide([0., 0.], [0., 0.], [0., 0.]).unwrap();
        assert!(overlap.position[0].hypot(overlap.position[1]) > 1.25);
        assert_eq!(overlap.strength, 0.);
    }
    #[test]
    fn requested_modern_monaco_barriers_are_identical_for_every_car_era() {
        let modern = Venue::for_era("Monaco", 3);
        assert!(modern.barriers.len() > 1000);
        assert!(modern.barriers.iter().filter(|b| b.fence).count() > 500);
        for era in 0..3 {
            let earlier = Venue::for_era("Monaco", era);
            assert_eq!(earlier.barriers.len(), modern.barriers.len());
            for (a, b) in earlier.barriers.iter().zip(&modern.barriers) {
                assert_eq!(a.a, b.a);
                assert_eq!(a.b, b.b);
                assert_eq!(a.fence, b.fence);
            }
        }
    }
    #[test]
    fn recent_spa_barriers_are_era_scoped_and_leave_every_requested_corner_drivable() {
        let t = crate::tracks().remove(0);
        for era in 0..6 {
            let v = Venue::for_era(&t.name, era);
            assert_eq!(
                v.barriers.iter().any(|b| b.kind.starts_with("spa-")),
                era >= 3
            );
            for (a, b) in [(0, 75), (418, 520), (1285, 1394)] {
                for i in a..b {
                    assert!(
                        v.collide(t.points[i], t.points[(i + 1) % t.points.len()], [0., 0.])
                            .is_none(),
                        "era {era} station {i}"
                    );
                }
            }
        }
    }
    #[test]
    fn no_phantom_barrier_across_the_pit_entry() {
        for t in crate::tracks() {
            let v = Venue::for_track(&t.name);
            let pit = crate::pit::PitLane::new(&t);
            for p in &pit.points {
                assert!(v.collide([p[0], p[2]], [p[0], p[2]], [0., 0.]).is_none());
            }
        }
    }
}

//! Shared rendered and driven corner meshes: no visual-only raised kerbs.
use crate::{contact, surface_mesh, State, Track};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::OnceLock};
#[derive(Clone, Deserialize, Serialize)]
pub struct Kerb {
    pub name: String,
    pub start_index: usize,
    pub end_index: usize,
    pub side: f32,
    pub width: f32,
    pub height: f32,
    pub shape: String,
    pub color_a: String,
    pub color_b: String,
    pub source: String,
}
#[derive(Clone, Deserialize)]
pub struct Runoff {
    pub name: String,
    pub index: usize,
    pub kind: String,
    pub triangles: Vec<[[f32; 2]; 3]>,
}
#[derive(Clone, Deserialize)]
pub struct Profile {
    pub year: u32,
    pub label: String,
    pub geometry_status: String,
    pub notes: String,
    pub kerbs: Vec<Kerb>,
    pub runoffs: Vec<Runoff>,
}
#[derive(Clone, Deserialize)]
pub struct Record {
    pub id: String,
    pub name: String,
    pub profiles: Vec<Profile>,
    pub grandstands: Vec<crate::venue::Grandstand>,
    pub barriers: Vec<crate::venue::Barrier>,
}
pub fn records() -> &'static Vec<Record> {
    #[derive(Deserialize)]
    struct DB {
        tracks: Vec<Record>,
    }
    static DB_CACHE: OnceLock<DB> = OnceLock::new();
    &DB_CACHE
        .get_or_init(|| {
            serde_json::from_str(include_str!("../data/corner-details.json"))
                .expect("corner database")
        })
        .tracks
}
#[derive(Clone, Serialize)]
pub struct Facet {
    pub p: [[f32; 3]; 3],
    pub kind: u8,
    pub color: u32,
}
#[derive(Serialize)]
pub struct Details {
    pub year: u32,
    pub label: String,
    pub geometry_status: String,
    pub notes: String,
    pub kerbs: Vec<Kerb>,
    pub facets: Vec<Facet>,
    #[serde(skip)]
    cells: HashMap<(i32, i32), Vec<usize>>,
}
fn rgb(s: &str) -> u32 {
    u32::from_str_radix(s.trim_start_matches('#'), 16).unwrap_or(0xdddddd)
}
impl Details {
    pub fn new(track: &Track, era: usize) -> Self {
        let record = records()
            .iter()
            .find(|r| r.name == track.name)
            .expect("every circuit detail record");
        let p = &record.profiles[era.min(3)];
        let mut d = Self {
            year: p.year,
            label: p.label.clone(),
            geometry_status: p.geometry_status.clone(),
            notes: p.notes.clone(),
            kerbs: p.kerbs.clone(),
            facets: vec![],
            cells: HashMap::new(),
        };
        let roadmask = surface_mesh::RoadMask::new(track);
        let pit = crate::pit::PitLane::new(track).as_track();
        let pitmask = surface_mesh::RoadMask::new_open(&pit);
        for k in &p.kerbs {
            let profile = if k.shape == "raised" {
                vec![
                    (0., 0.),
                    (0.18, 0.2),
                    (0.5, 0.25),
                    (0.66, 1.),
                    (0.84, 1.),
                    (1., 0.),
                ]
            } else {
                vec![(0., 0.), (0.35, 0.9), (0.8, 1.), (1., 0.1)]
            };
            for i in k.start_index..k.end_index.min(track.points.len() - 1) {
                let j = i + 1;
                let fade = |idx: usize| {
                    let t =
                        (idx - k.start_index) as f64 / (k.end_index - k.start_index).max(1) as f64;
                    ((t * 10.).min((1. - t) * 10.)).clamp(0., 1.)
                };
                for band in profile.windows(2) {
                    let corner = |idx, point: (f64, f64)| {
                        surface_mesh::road_point(
                            track,
                            idx,
                            k.side as f64 * (track.width as f64 / 2. + point.0 * k.width as f64),
                            0.05 + point.1 * k.height as f64 * fade(idx),
                        )
                    };
                    let a = corner(i, band[0]);
                    let b = corner(j, band[0]);
                    let c = corner(i, band[1]);
                    let e = corner(j, band[1]);
                    for tri in [[a, b, c], [c, b, e]] {
                        for clipped in roadmask.cut(tri).into_iter().flat_map(|t| pitmask.cut(t)) {
                            d.facets.push(Facet {
                                p: clipped.map(|p| p.map(|v| v as f32)),
                                kind: 0,
                                color: rgb(if i % 2 == 0 { &k.color_a } else { &k.color_b }),
                            });
                        }
                    }
                }
            }
        }
        for r in &p.runoffs {
            let (kind, color) = match r.kind.as_str() {
                "gravel" => (1, 0xc1ad84),
                "asphalt" => (2, 0x666e70),
                "red_paint" => (2, 0xb52b24),
                "green_paint" => (2, 0x27814b),
                _ => (3, 0x91a366),
            };
            for tri in &r.triangles {
                let points = tri.map(|p| {
                    let ground =
                        if track.name == "Spa-Francorchamps" && r.name.contains("photo apron") {
                            track.surface_at(p[0], p[1], r.index, 0.)
                        } else {
                            track.driving_surface(p[0], p[1], r.index, 0.)
                        };
                    [p[0], ground.height + 0.025, p[1]]
                });
                for piece in roadmask
                    .cut(points.map(|p| p.map(|v| v as f64)))
                    .into_iter()
                    .flat_map(|p| pitmask.cut(p))
                {
                    d.facets.push(Facet {
                        p: piece.map(|p| p.map(|v| v as f32)),
                        kind,
                        color,
                    });
                }
            }
        }
        d.index();
        d
    }
    fn index(&mut self) {
        for (i, f) in self.facets.iter().enumerate() {
            let minx = f.p.iter().map(|p| p[0]).fold(f32::INFINITY, f32::min);
            let maxx = f.p.iter().map(|p| p[0]).fold(f32::NEG_INFINITY, f32::max);
            let minz = f.p.iter().map(|p| p[2]).fold(f32::INFINITY, f32::min);
            let maxz = f.p.iter().map(|p| p[2]).fold(f32::NEG_INFINITY, f32::max);
            for x in (minx / 24.).floor() as i32..=(maxx / 24.).floor() as i32 {
                for z in (minz / 24.).floor() as i32..=(maxz / 24.).floor() as i32 {
                    self.cells.entry((x, z)).or_default().push(i);
                }
            }
        }
    }
    /// Highest mesh facet under a contact probe near its current road branch.
    pub fn at(&self, x: f32, z: f32, base: f32) -> Option<(f32, u8)> {
        let mut result = None;
        if let Some(ids) = self
            .cells
            .get(&((x / 24.).floor() as i32, (z / 24.).floor() as i32))
        {
            for &i in ids {
                let f = &self.facets[i];
                if let Some(y) = height(f.p, x, z) {
                    if (y - base).abs() < 1.5 && result.is_none_or(|(old, _)| y > old) {
                        result = Some((y, f.kind));
                    }
                }
            }
        }
        result
    }
}
pub fn height(p: [[f32; 3]; 3], x: f32, z: f32) -> Option<f32> {
    let a = p[0];
    let b = p[1];
    let c = p[2];
    let den = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if den.abs() < 0.000001 {
        return None;
    }
    let u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / den;
    let v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / den;
    if u >= -0.00001 && v >= -0.00001 && u + v <= 1.00001 {
        Some(a[1] * u + b[1] * v + c[1] * (1. - u - v))
    } else {
        None
    }
}
pub fn ride_height(era: usize) -> f32 {
    [0.105, 0.065, 0.045, 0.04][era.min(3)]
}
/// Contact-support approximation, not a full articulated suspension solver.
/// Floor probes use the exact same raised mesh returned to both renderers.
pub fn update_contact(t: &Track, d: &Details, s: &mut State, nearest: usize, era: usize, dt: f32) {
    let wheels = contact::wheels(era);
    let mut lifts = [0.; 4];
    let mut grip = 0.;
    let mut count = 0;
    let mut kerb = 0.0_f32;
    let mut surface = 0;
    for (i, w) in wheels.iter().enumerate() {
        let centre = contact::world(s.x, s.z, s.yaw, w.lateral, w.longitudinal);
        let legal = contact::on_road(t, nearest, &contact::patch(s.x, s.z, s.yaw, *w));
        if legal {
            count += 1;
        }
        let base = t
            .driving_surface(centre[0], centre[1], nearest, s.yaw)
            .height
            + 0.05;
        let mut support = base;
        let mut kind = if legal { 4 } else { 3 };
        let mut wheel_grip = 0.;
        for p in std::iter::once(centre).chain(contact::patch(s.x, s.z, s.yaw, *w)) {
            let mut material = if contact::point_on_pavement(t, nearest, p) {
                4
            } else {
                3
            };
            if let Some((y, k)) = d.at(p[0], p[1], base) {
                if y >= support - 0.04 {
                    support = support.max(y);
                    kind = k;
                    material = k;
                }
            }
            wheel_grip += match material {
                4 => 1.,
                0 => 0.86,
                1 => 0.38,
                2 => 0.94,
                _ => 0.56,
            };
        }
        lifts[i] = (support - base).max(0.);
        s.wheel_heights[i] = support;
        kerb = kerb.max(lifts[i]);
        grip += wheel_grip / 5.;
        if !legal {
            surface = surface.max(kind + 1);
        }
    }
    s.wheels_on_track = count;
    s.offtrack = count == 0;
    s.surface_grip = grip / 4.;
    s.surface_kind = surface;
    s.kerb_hit = (kerb / 0.16).clamp(0., 1.);
    let target = lifts.iter().sum::<f32>() / 4.;
    let travel = if era == 0 { 0.075 } else { 0.045 };
    let omega = if era == 0 { 18. } else { 26. };
    // Semi-implicit spring, substepped to remain stable at the API's 50ms cap.
    let steps = (dt / 0.005).ceil().max(1.) as usize;
    let sub = dt / steps as f32;
    for _ in 0..steps {
        s.heave_velocity +=
            ((target - s.heave) * omega * omega - 2. * 0.8 * omega * s.heave_velocity) * sub;
        s.heave = (s.heave + s.heave_velocity * sub).clamp(-travel, 0.4);
    }
    let left = (lifts[0] + lifts[1]) / 2.;
    let right = (lifts[2] + lifts[3]) / 2.;
    let front = (lifts[0] + lifts[2]) / 2.;
    let rear = (lifts[1] + lifts[3]) / 2.;
    let roll = ((right - left) / (2. * wheels[0].lateral.abs())).atan();
    let pitch = (-(front - rear) / (wheels[0].longitudinal - wheels[1].longitudinal)).atan();
    s.body_roll += (roll - s.body_roll) * (1. - (-dt * 18.).exp());
    s.kerb_pitch += (pitch - s.kerb_pitch) * (1. - (-dt * 18.).exp());
    let base = t.driving_surface(s.x, s.z, nearest, s.yaw).height + 0.05;
    let downforce_compression =
        (s.speed * s.speed * if era == 0 { 0. } else { 0.000004 }).min(ride_height(era) * 0.45);
    let clearance = ride_height(era) - downforce_compression;
    let mut penetration = 0.0_f32;
    for ix in -2..=2 {
        for iz in -4..=4 {
            let x = ix as f32 * 0.26;
            let z = iz as f32 * 0.29;
            let p = contact::world(s.x, s.z, s.yaw, x, z);
            let road = t.driving_surface(p[0], p[1], nearest, s.yaw).height + 0.05;
            if let Some((height, 0)) = d.at(p[0], p[1], road) {
                let plane =
                    road + s.heave + clearance + s.body_roll.tan() * x - s.kerb_pitch.tan() * z;
                penetration = penetration.max(height - plane);
            }
        }
    }
    s.bottoming = (s.bottoming - dt * 3.).max(0.);
    s.floor_strike = penetration > 0.003;
    if s.floor_strike && dt > 0. {
        s.bottoming = s
            .bottoming
            .max((penetration * 8. + (-s.heave_velocity).max(0.) * 0.1).clamp(0., 1.));
        s.speed *= (-dt * penetration * 10.).exp();
        s.heave_velocity = (s.heave_velocity + penetration * dt * 180.).min(2.5);
    }
    s.ride_height = clearance;
    s.y = base + 0.05 + s.heave;
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn triangle_height_is_barycentric_not_a_bounding_box() {
        assert_eq!(
            height([[0., 0., 0.], [2., 2., 0.], [0., 0., 2.]], 1., 0.5),
            Some(1.)
        );
        assert!(height([[0., 0., 0.], [2., 2., 0.], [0., 0., 2.]], 1.9, 1.9).is_none());
    }
    #[test]
    fn all_era_kerbs_have_nonuniform_dimensions_and_actual_height() {
        for t in crate::tracks() {
            for era in 0..4 {
                let d = Details::new(&t, era);
                assert!(!d.kerbs.is_empty());
                assert!(d.facets.iter().any(|f| f.kind == 0));
                assert!(d.facets.iter().any(|f| f.kind > 0));
                assert!(d
                    .kerbs
                    .iter()
                    .any(|k| (k.width - d.kerbs[0].width).abs() > 0.1));
                if era > 0 && t.name != "Monaco" {
                    assert!(d.kerbs.iter().any(|k| k.height >= 0.13));
                }
                assert!(d
                    .facets
                    .iter()
                    .flat_map(|f| f.p)
                    .flatten()
                    .all(|v| v.is_finite()));
            }
        }
    }
    #[test]
    fn a_raised_ridge_under_the_floor_can_bottom_out_without_offtrack() {
        let t = Track {
            name: "fixture".into(),
            length: 300.,
            width: 10.,
            points: vec![
                [0., -100.],
                [0., -50.],
                [0., 0.],
                [0., 50.],
                [0., 100.],
                [100., 100.],
                [100., -100.],
            ],
            heights: vec![0.; 7],
            ground_heights: vec![0.; 7],
            terrain: None,
        };
        for (high, expected) in [(0.075, false), (0.25, true)] {
            let mut d = Details {
                year: 2023,
                label: String::new(),
                geometry_status: String::new(),
                notes: String::new(),
                kerbs: vec![],
                facets: vec![
                    Facet {
                        p: [[-0.2, high, -4.], [0.2, high, -4.], [-0.2, high, 4.]],
                        kind: 0,
                        color: 0,
                    },
                    Facet {
                        p: [[0.2, high, -4.], [0.2, high, 4.], [-0.2, high, 4.]],
                        kind: 0,
                        color: 0,
                    },
                ],
                cells: HashMap::new(),
            };
            d.index();
            let mut s = State {
                speed: 30.,
                surface_grip: 1.,
                ..State::default()
            };
            update_contact(&t, &d, &mut s, 2, 2, 1. / 120.);
            assert_eq!(s.floor_strike, expected);
            assert_eq!(s.wheels_on_track, 4);
            assert!(!s.offtrack);
            if expected {
                assert!(s.bottoming > 0.5);
                assert!(s.speed < 30.);
            }
        }
    }
    #[test]
    fn actual_authored_monza_ridge_can_strike_the_floor_with_tyres_still_legal() {
        let track = crate::tracks()
            .into_iter()
            .find(|t| t.name == "Monza")
            .unwrap();
        let details = Details::new(&track, 2);
        let k = details
            .kerbs
            .iter()
            .find(|k| k.shape == "raised" && k.height > 0.13)
            .unwrap();
        let i = (k.start_index + k.end_index) / 2;
        let p = surface_mesh::road_point(
            &track,
            i,
            k.side as f64 * (track.width as f64 / 2. + k.width as f64 * 0.74 - 0.5),
            0.1,
        );
        let a = track.points[(i + track.points.len() - 1) % track.points.len()];
        let b = track.points[(i + 1) % track.points.len()];
        let mut s = State {
            x: p[0] as f32,
            y: p[1] as f32,
            z: p[2] as f32,
            yaw: (b[0] - a[0]).atan2(b[1] - a[1]),
            speed: 25.,
            ..State::default()
        };
        update_contact(&track, &details, &mut s, i, 2, 1. / 120.);
        assert!(s.wheels_on_track > 0);
        assert!(!s.offtrack);
        assert!(
            s.floor_strike,
            "ridge height {} width {}",
            k.height, k.width
        );
        assert!(s.bottoming > 0.);
    }
}

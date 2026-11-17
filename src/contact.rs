//! Four tyre contact patches, not a centre-of-car track-limit shortcut.
use crate::{surface_mesh, Track};
#[derive(Clone, Copy)]
pub struct Wheel {
    pub lateral: f32,
    pub longitudinal: f32,
    pub width: f32,
    pub patch_length: f32,
    pub radius: f32,
}
pub fn wheels(era: usize) -> [Wheel; 4] {
    let classic = era == 0;
    let layout = crate::car_shapes::layout(era);
    let half = layout.map_or(1.02, |l| l.half);
    let (front, rear) = layout.map_or((1.43, -1.44), |l| (l.front, l.rear));
    std::array::from_fn(|i| Wheel {
        lateral: if i < 2 { -half } else { half },
        longitudinal: if i % 2 == 0 { front } else { rear },
        width: layout.map_or(if i % 2 == 0 { 0.34 } else { 0.44 }, |l| {
            if i % 2 == 0 {
                l.front_width
            } else {
                l.rear_width
            }
        }),
        patch_length: if classic { 0.18 } else { 0.24 },
        radius: layout.map_or(0.35, |l| l.radius),
    })
}
pub fn world(x: f32, z: f32, yaw: f32, lateral: f32, longitudinal: f32) -> [f32; 2] {
    [
        x + yaw.cos() * lateral + yaw.sin() * longitudinal,
        z - yaw.sin() * lateral + yaw.cos() * longitudinal,
    ]
}
pub fn patch(x: f32, z: f32, yaw: f32, w: Wheel) -> [[f32; 2]; 4] {
    [(-1., -1.), (1., -1.), (1., 1.), (-1., 1.)].map(|(a, b)| {
        world(
            x,
            z,
            yaw,
            w.lateral + a * w.width / 2.,
            w.longitudinal + b * w.patch_length / 2.,
        )
    })
}
/// Inclusive SAT intersection: touching the outer white-line boundary remains legal.
pub fn overlap(a: &[[f32; 2]], b: &[[f32; 2]]) -> bool {
    for poly in [a, b] {
        for i in 0..poly.len() {
            let p = poly[i];
            let q = poly[(i + 1) % poly.len()];
            let axis = [q[1] - p[1], p[0] - q[0]];
            let project = |poly: &[[f32; 2]]| {
                poly.iter()
                    .map(|p| p[0] * axis[0] + p[1] * axis[1])
                    .fold((f32::INFINITY, f32::NEG_INFINITY), |(min, max), v| {
                        (min.min(v), max.max(v))
                    })
            };
            let aa = project(a);
            let bb = project(b);
            if aa.1 < bb.0 - 0.00001 || bb.1 < aa.0 - 0.00001 {
                return false;
            }
        }
    }
    true
}
pub fn on_road(track: &Track, nearest: usize, patch: &[[f32; 2]; 4]) -> bool {
    on_corridor(track, nearest, patch, 0.11)
}
pub fn point_on_pavement(track: &Track, nearest: usize, p: [f32; 2]) -> bool {
    on_corridor(track, nearest, &[p; 4], 0.)
}
fn on_corridor(track: &Track, nearest: usize, patch: &[[f32; 2]; 4], margin: f64) -> bool {
    let n = track.points.len();
    let w = track.width as f64 / 2. - margin;
    for offset in -5..=5 {
        let i = (nearest as i32 + offset).rem_euclid(n as i32) as usize;
        let j = (i + 1) % n;
        let quad = [
            surface_mesh::road_point(track, i, -w, 0.),
            surface_mesh::road_point(track, i, w, 0.),
            surface_mesh::road_point(track, j, w, 0.),
            surface_mesh::road_point(track, j, -w, 0.),
        ]
        .map(|p| [p[0] as f32, p[2] as f32]);
        if overlap(patch, &[quad[0], quad[1], quad[2]])
            || overlap(patch, &[quad[0], quad[2], quad[3]])
        {
            return true;
        }
    }
    false
}
pub fn wheels_on_road(t: &Track, nearest: usize, x: f32, z: f32, yaw: f32, era: usize) -> u8 {
    wheels(era)
        .into_iter()
        .filter(|&w| on_road(t, nearest, &patch(x, z, yaw, w)))
        .count() as u8
}
#[cfg(test)]
mod tests {
    use super::*;
    fn straight() -> Track {
        Track {
            name: "test".into(),
            length: 200.,
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
        }
    }
    #[test]
    fn partial_car_over_the_line_stays_legal_until_all_four_tyres_leave() {
        let t = straight();
        for era in 0..5 {
            assert_eq!(wheels_on_road(&t, 2, 0., 0., 0., era), 4);
            assert_eq!(wheels_on_road(&t, 2, 5., 0., 0., era), 2);
            assert_eq!(wheels_on_road(&t, 2, 7., 0., 0., era), 0);
        }
    }
    #[test]
    fn sideways_front_or_rear_axle_still_on_track_is_legal() {
        let t = straight();
        for era in 0..5 {
            let yaw = std::f32::consts::FRAC_PI_2;
            assert_eq!(wheels_on_road(&t, 2, 5.3, 0., yaw, era), 2);
            assert_eq!(wheels_on_road(&t, 2, 7., 0., yaw, era), 0);
        }
    }
    #[test]
    fn even_a_contact_patch_edge_on_the_white_line_counts() {
        let t = straight();
        let w = wheels(2)[1];
        let x = t.width / 2. - 0.11 - w.lateral + w.width / 2.;
        let p = patch(x, 0., 0., w);
        assert!(on_road(&t, 2, &p));
        let p = patch(x + 0.003, 0., 0., w);
        assert!(!on_road(&t, 2, &p));
    }
    #[test]
    fn wheel_positions_match_the_four_rendered_tyre_centres() {
        assert_eq!(wheels(0)[0].longitudinal, 1.12);
        assert_eq!(wheels(0)[1].longitudinal, -1.1);
        assert_eq!(wheels(3)[0].lateral, -0.80);
        assert_eq!(wheels(3)[0].longitudinal, 1.75);
        assert_eq!(wheels(3)[3].longitudinal, -1.85);
        assert_eq!(wheels(0)[1].width, 0.34);
        assert_eq!(wheels(3)[3].width, 0.405);
    }
    #[test]
    fn triangle_bounding_boxes_are_not_used_as_track_limits() {
        assert!(!overlap(
            &[[0., 0.], [10., 0.], [0., 10.]],
            &[[8., 8.], [9., 8.], [9., 9.], [8., 9.]]
        ));
    }
}

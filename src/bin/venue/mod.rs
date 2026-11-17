//! Low-detail native safety furniture, baked once into bounded vertex batches.
mod ground;
use apex_heritage::{venue::Venue, Track};
pub use ground::Ground;
use macroquad::prelude::*;
#[derive(Default)]
struct Builder {
    vertices: Vec<Vertex>,
    indices: Vec<u16>,
    meshes: Vec<Mesh>,
}
impl Builder {
    fn triangle(&mut self, p: [Vec3; 3], color: Color) {
        if self.vertices.len() + 3 > 3996 {
            self.flush();
        }
        for v in p {
            self.indices.push(self.vertices.len() as u16);
            self.vertices.push(Vertex::new2(v, vec2(0., 0.), color));
        }
    }
    fn quad(&mut self, p: [Vec3; 4], c: Color) {
        self.triangle([p[0], p[1], p[2]], c);
        self.triangle([p[0], p[2], p[3]], c);
    }
    fn flush(&mut self) {
        if self.vertices.is_empty() {
            return;
        }
        self.meshes.push(Mesh {
            vertices: std::mem::take(&mut self.vertices),
            indices: std::mem::take(&mut self.indices),
            texture: None,
        });
    }
    fn cube(&mut self, m: Mat4, size: Vec3, color: Color) {
        let corners = [
            [-1., -1., -1.],
            [1., -1., -1.],
            [1., 1., -1.],
            [-1., 1., -1.],
            [-1., -1., 1.],
            [1., -1., 1.],
            [1., 1., 1.],
            [-1., 1., 1.],
        ]
        .map(|p| m.transform_point3(vec3(p[0], p[1], p[2]) * size * 0.5));
        for (ids, shade) in [
            ([0, 1, 2, 3], 0.7),
            ([4, 7, 6, 5], 0.92),
            ([0, 4, 5, 1], 0.58),
            ([3, 2, 6, 7], 1.),
            ([1, 5, 6, 2], 0.8),
            ([0, 3, 7, 4], 0.75),
        ] {
            self.quad(
                ids.map(|i| corners[i]),
                Color::new(color.r * shade, color.g * shade, color.b * shade, 1.),
            );
        }
    }
    fn ring(&mut self, p: Vec3, color: Color) {
        let sides = 8;
        for i in 0..sides {
            let a = i as f32 / sides as f32 * std::f32::consts::TAU;
            let b = (i + 1) as f32 / sides as f32 * std::f32::consts::TAU;
            let point = |a: f32, r: f32, y: f32| p + vec3(a.sin() * r, y, a.cos() * r);
            let [oa, ob, ia, ib] = [
                point(a, 0.405, 0.195),
                point(b, 0.405, 0.195),
                point(a, 0.175, 0.195),
                point(b, 0.175, 0.195),
            ];
            self.quad([oa, ob, ib, ia], color);
            let dark = Color::new(color.r * 0.68, color.g * 0.68, color.b * 0.68, 1.);
            self.quad([oa, oa - Vec3::Y * 0.39, ob - Vec3::Y * 0.39, ob], dark);
            self.quad([ia, ib, ib - Vec3::Y * 0.39, ia - Vec3::Y * 0.39], dark);
        }
    }
}
fn transform(x: f32, y: f32, z: f32, yaw: f32) -> Mat4 {
    Mat4::from_translation(vec3(x, y, z)) * Mat4::from_rotation_y(yaw)
}
pub fn build(t: &Track, v: &Venue, support: &Ground) -> Vec<Mesh> {
    let mut b = Builder::default();
    if t.name == "Monaco" {
        let color = |hex: &str| {
            let n = u32::from_str_radix(hex.trim_start_matches('#'), 16).unwrap();
            Color::from_rgba((n >> 16) as u8, (n >> 8) as u8, n as u8, 255)
        };
        for f in &apex_heritage::piscine::data().facets {
            let mut p = f.p.map(|p| vec3(p[0], p[1], p[2]));
            if (p[1] - p[0]).cross(p[2] - p[0]).y < 0. {
                p.swap(1, 2);
            }
            b.triangle(p, color(&f.color));
        }
        for o in &apex_heritage::piscine::data().objects {
            b.cube(
                transform(o.x, o.y, o.z, o.yaw),
                vec3(o.sx, o.sy, o.sz),
                color(&o.color),
            );
        }
    }
    let steel = Color::from_rgba(135, 150, 152, 255);
    let cement = Color::from_rgba(181, 187, 177, 255);
    let rubber = Color::from_rgba(29, 33, 34, 255);
    for original in &v.barriers {
        let spans = if original.kind == "tyres" {
            vec![(
                vec3(original.a[0], 0., original.a[1]),
                vec3(original.b[0], 0., original.b[1]),
            )]
        } else {
            support.spans(original.a, original.b, |x, z| t.terrain_height(x, z) - 1.25)
        };
        for (a, end) in spans {
            let wall = apex_heritage::venue::Barrier {
                a: [a.x, a.z],
                b: [end.x, end.z],
                ..original.clone()
            };
            let dx = wall.b[0] - wall.a[0];
            let dz = wall.b[1] - wall.a[1];
            let len = dx.hypot(dz);
            let yaw = dx.atan2(dz);
            let ground = |x, z| {
                support
                    .height(x, z)
                    .unwrap_or_else(|| t.terrain_height(x, z) - 1.25)
            };
            let ya = ground(wall.a[0], wall.a[1]);
            let yb = ground(wall.b[0], wall.b[1]);
            let sloped_length = len.hypot(yb - ya);
            let base = transform(
                (wall.a[0] + wall.b[0]) / 2.,
                (ya + yb) / 2.,
                (wall.a[1] + wall.b[1]) / 2.,
                yaw,
            ) * Mat4::from_rotation_x(-(yb - ya).atan2(len));
            if wall.kind == "tyres" {
                let count = (len / 0.79).ceil() as usize;
                for i in 0..count {
                    let f = (i as f32 + 0.5) / count as f32;
                    let x = wall.a[0] + dx * f;
                    let z = wall.a[1] + dz * f;
                    for row in 0..3 {
                        b.ring(
                            vec3(x, ground(x, z) + 0.2 + row as f32 * 0.39, z),
                            if i % 9 == 0 {
                                LIGHTGRAY
                            } else if i % 9 == 1 {
                                MAROON
                            } else {
                                rubber
                            },
                        );
                    }
                }
            } else if wall.kind == "concrete" || wall.kind.starts_with("spa-") {
                let nx = dz / len.max(0.0001) * wall.radius;
                let nz = -dx / len.max(0.0001) * wall.radius;
                let base_points = [
                    [wall.a[0] - nx, wall.a[1] - nz],
                    [wall.a[0] + nx, wall.a[1] + nz],
                    [wall.b[0] + nx, wall.b[1] + nz],
                    [wall.b[0] - nx, wall.b[1] - nz],
                ]
                .map(|[x, z]| vec3(x, ground(x, z) - 0.06, z));
                let mut extension = 0.0_f32;
                for edge in 0..4 {
                    for f in [0.25, 0.5, 0.75] {
                        let p = base_points[edge].lerp(base_points[(edge + 1) % 4], f);
                        extension = extension.max(p.y - ground(p.x, p.z) + 0.06);
                    }
                }
                let c = [
                    base_points[0] - Vec3::Y * extension,
                    base_points[1] - Vec3::Y * extension,
                    base_points[2] - Vec3::Y * extension,
                    base_points[3] - Vec3::Y * extension,
                    base_points[0] + Vec3::Y * wall.height,
                    base_points[1] + Vec3::Y * wall.height,
                    base_points[2] + Vec3::Y * wall.height,
                    base_points[3] + Vec3::Y * wall.height,
                ];
                for face in [
                    [0, 1, 2, 3],
                    [4, 7, 6, 5],
                    [0, 4, 5, 1],
                    [1, 5, 6, 2],
                    [2, 6, 7, 3],
                    [3, 7, 4, 0],
                ] {
                    b.quad(
                        face.map(|i| c[i]),
                        if wall.kind == "spa-red" {
                            Color::from_rgba(181, 53, 44, 255)
                        } else if wall.kind == "spa-yellow" {
                            Color::from_rgba(223, 198, 68, 255)
                        } else {
                            cement
                        },
                    );
                }
            } else {
                for y in [0.35, 0.62, 0.89] {
                    b.cube(
                        base * Mat4::from_translation(vec3(0., y, 0.)),
                        vec3(0.16, 0.19, sloped_length + 0.02),
                        steel,
                    );
                }
            }
            if wall.fence {
                for level in [1.6, 2.4, 3.2, 4.] {
                    b.cube(
                        base * Mat4::from_translation(vec3(0., level, 0.)),
                        vec3(0.025, 0.025, sloped_length),
                        steel,
                    );
                }
                let count = (len / 1.4).ceil() as usize;
                for i in 0..=count {
                    let f = i as f32 / count as f32;
                    let x = wall.a[0] + dx * f;
                    let z = wall.a[1] + dz * f;
                    b.cube(
                        transform(x, ground(x, z) + 2.75, z, yaw),
                        vec3(0.018, 2.9, 0.018),
                        steel,
                    );
                }
            }
        }
        let dx = original.b[0] - original.a[0];
        let dz = original.b[1] - original.a[1];
        let len = dx.hypot(dz);
        let yaw = dx.atan2(dz);
        let ground = |x, z| {
            support
                .height(x, z)
                .unwrap_or_else(|| t.terrain_height(x, z) - 1.25)
        };
        let posts = (len / 4.).ceil().max(1.) as usize;
        for i in 0..=posts {
            let f = i as f32 / posts as f32;
            let x = original.a[0] + dx * f;
            let z = original.a[1] + dz * f;
            if original.fence {
                b.cube(
                    transform(x, ground(x, z) + 2.10, z, yaw),
                    vec3(0.08, 4.4, 0.08),
                    steel,
                );
            }
            if original.kind == "armco" {
                b.cube(
                    transform(x, ground(x, z) + 0.5, z, yaw),
                    vec3(0.12, 1.2, 0.14),
                    steel,
                );
            }
        }
    }
    for (id, s) in v.grandstands.iter().enumerate() {
        let cols = (((s.width - 1.4) / 0.82) as usize).clamp(4, 160);
        let row_depth = ((s.depth - 1.) / s.rows as f32).max(0.6);
        let floor = s
            .footprint
            .iter()
            .map(|p| t.terrain_height(p[0], p[1]) - 1.25)
            .fold(f32::NEG_INFINITY, f32::max)
            + 0.25;
        let frame = transform(s.x, floor, s.z, s.yaw);
        b.cube(frame, vec3(s.width, 0.3, s.depth), cement);
        for row in 0..s.rows {
            let rise = row as f32 * 0.48;
            let z = s.depth / 2. - 0.5 - (row as f32 + 0.5) * row_depth;
            b.cube(
                frame * Mat4::from_translation(vec3(0., (rise + 0.65) / 2., z)),
                vec3(s.width, rise + 0.65, row_depth),
                cement,
            );
            for j in 0..cols {
                if j % 16 == 15 {
                    continue;
                }
                let x = -s.width / 2. + 0.7 + j as f32 * (s.width - 1.4) / (cols - 1) as f32;
                let color = [BLUE, LIGHTGRAY, MAROON, YELLOW][(id + j / 9) % 4];
                let m = frame * Mat4::from_translation(vec3(x, rise + 0.8, z));
                b.cube(m, vec3(0.65, 0.12, 0.56), color);
                b.cube(
                    m * Mat4::from_translation(vec3(0., 0.25, -0.28)),
                    vec3(0.65, 0.44, 0.08),
                    color,
                );
                if (t.name == "Monaco" && (497..=555).contains(&s.index))
                    || (j + row as usize * 3 + id) % 3 == 0
                {
                    b.cube(
                        m * Mat4::from_translation(vec3(0., 0.4, 0.)),
                        vec3(0.37, 0.52, 0.25),
                        color,
                    );
                    b.cube(
                        m * Mat4::from_translation(vec3(0., 0.8, 0.)),
                        vec3(0.22, 0.25, 0.22),
                        BEIGE,
                    );
                }
            }
        }
        for x in [-s.width / 2. + 0.6, 0., s.width / 2. - 0.6] {
            for z in [-s.depth / 2. + 0.5, s.depth / 2. - 0.5] {
                let p = frame.transform_point3(vec3(x, 0., z));
                let bottom = t.terrain_height(p.x, p.z) - 1.25;
                let top = floor
                    + if s.roof {
                        s.rows as f32 * 0.48 + 3.3
                    } else {
                        0.1
                    };
                b.cube(
                    transform(p.x, (top + bottom) / 2., p.z, s.yaw),
                    vec3(0.24, top - bottom, 0.24),
                    steel,
                );
            }
        }
        if s.roof {
            b.cube(
                frame * Mat4::from_translation(vec3(0., s.rows as f32 * 0.48 + 3.35, 0.)),
                vec3(s.width + 2., 0.16, s.depth + 3.),
                Color::from_rgba(69, 78, 83, 255),
            );
        }
        b.flush();
    }
    b.flush();
    b.meshes
}
pub fn draw(meshes: &[Mesh]) {
    for m in meshes {
        draw_mesh(m);
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_corner_batches_use_every_exact_shared_contact_triangle() {
        let t = &apex_heritage::tracks()[2];
        for era in [0, 3] {
            let d = apex_heritage::corner::Details::new(t, era);
            let m = corners(&d);
            assert_eq!(
                m.iter().map(|m| m.vertices.len()).sum::<usize>(),
                d.facets.len() * 3
            );
            let p: Vec<_> = m
                .iter()
                .flat_map(|m| m.vertices.iter().map(|v| v.position))
                .collect();
            for (i, f) in d.facets.iter().enumerate() {
                for j in 0..3 {
                    assert_eq!(p[i * 3 + j], vec3(f.p[j][0], f.p[j][1], f.p[j][2]));
                }
            }
        }
    }
    #[test]
    fn native_concrete_bottom_corners_embed_in_sloped_rendered_ground() {
        let t = &apex_heritage::tracks()[0];
        let mut v = Venue::for_track(&t.name);
        v.grandstands.clear();
        let mut wall = v
            .barriers
            .iter()
            .find(|b| b.kind == "concrete")
            .unwrap()
            .clone();
        wall.a = [-2., -2.];
        wall.b = [2., 2.];
        wall.radius = 0.4;
        wall.fence = false;
        v.barriers = vec![wall];
        let points = [
            vec3(-10., -5., -10.),
            vec3(-10., 1., 10.),
            vec3(10., -1., -10.),
            vec3(10., 5., 10.),
        ];
        let mesh = Mesh {
            vertices: points.map(|p| Vertex::new2(p, Vec2::ZERO, WHITE)).to_vec(),
            indices: vec![0, 1, 2, 2, 1, 3],
            texture: None,
        };
        let g = Ground::new(&[&[mesh]]);
        let meshes = build(t, &v, &g);
        let positions: Vec<_> = meshes
            .iter()
            .flat_map(|m| m.vertices.iter().map(|v| v.position))
            .collect();
        assert!(!positions.is_empty());
        for segment in positions.chunks_exact(36) {
            for p in &segment[..6] {
                let gap = p.y - g.height(p.x, p.z).unwrap();
                assert!((gap + 0.06).abs() < 0.00001, "bottom gap {gap}");
            }
        }
    }
    #[test]
    fn concrete_foundations_cover_ground_steps_across_wall_width() {
        let t = &apex_heritage::tracks()[0];
        let mut v = Venue::for_track(&t.name);
        v.grandstands.clear();
        let mut wall = v
            .barriers
            .iter()
            .find(|b| b.kind == "concrete")
            .unwrap()
            .clone();
        wall.a = [0., -2.];
        wall.b = [0., 2.];
        wall.radius = 0.4;
        wall.fence = false;
        v.barriers = vec![wall];
        let mut ground_mesh = Builder::default();
        for (x0, x1, y) in [(-10., -0.1, 1.), (-0.1, 0.1, 0.), (0.1, 10., 1.)] {
            ground_mesh.quad(
                [
                    vec3(x0, y, -10.),
                    vec3(x0, y, 10.),
                    vec3(x1, y, 10.),
                    vec3(x1, y, -10.),
                ],
                WHITE,
            );
        }
        ground_mesh.flush();
        let support = Ground::new(&[&ground_mesh.meshes]);
        let meshes = build(t, &v, &support);
        for m in meshes {
            for segment in m.vertices.chunks_exact(36) {
                for vertex in &segment[..6] {
                    assert!(
                        (vertex.position.y + 0.06).abs() < 0.00001,
                        "foundation must extend through the lower grass level"
                    );
                }
            }
        }
    }
    #[test]
    fn all_native_venue_batches_fit_and_are_finite() {
        for t in apex_heritage::tracks() {
            let v = Venue::for_track(&t.name);
            let landscape = crate::terrain_mesh(&t, &apex_heritage::corner::Details::new(&t, 3));
            let support = Ground::new(&[&landscape]);
            let meshes = build(&t, &v, &support);
            assert!(!meshes.is_empty());
            for m in meshes {
                assert!(m.vertices.len() <= 3996);
                assert!(m.indices.iter().all(|i| (*i as usize) < m.vertices.len()));
                assert!(m.vertices.iter().all(|p| p.position.is_finite()));
            }
        }
    }
}

/// The exact same raised, clipped triangles used by tyre/floor contact and WebGL.
pub fn corners(details: &apex_heritage::corner::Details) -> Vec<Mesh> {
    let mut b = Builder::default();
    for f in &details.facets {
        let c = f.color;
        let color = Color::new(
            ((c >> 16) & 255) as f32 / 255.,
            ((c >> 8) & 255) as f32 / 255.,
            (c & 255) as f32 / 255.,
            1.,
        );
        b.triangle(f.p.map(|p| vec3(p[0], p[1], p[2])), color);
    }
    b.flush();
    b.meshes
}

/// The same explicit overhead hotel and recent Spa paint used by WebGL.
pub fn references(t: &Track, era: usize) -> Vec<Mesh> {
    let mut builder = Builder::default();
    if let Some(scene) = apex_heritage::reference_scene::for_track(&t.name, era) {
        for f in &scene.facets {
            let n = u32::from_str_radix(f.color.trim_start_matches('#'), 16).unwrap();
            builder.triangle(
                f.p.map(Vec3::from_array),
                Color::from_rgba((n >> 16) as u8, (n >> 8) as u8, n as u8, 255),
            );
        }
    }
    builder.flush();
    builder.meshes
}

//! Low-detail native safety furniture, baked once into bounded vertex batches.
use apex_heritage::{venue::Venue, Track};
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
pub fn build(t: &Track, v: &Venue) -> Vec<Mesh> {
    let mut b = Builder::default();
    let steel = Color::from_rgba(135, 150, 152, 255);
    let cement = Color::from_rgba(181, 187, 177, 255);
    let rubber = Color::from_rgba(29, 33, 34, 255);
    for wall in &v.barriers {
        let dx = wall.b[0] - wall.a[0];
        let dz = wall.b[1] - wall.a[1];
        let len = dx.hypot(dz);
        let yaw = dx.atan2(dz);
        let ground = |x, z| t.terrain_height(x, z) - 1.2;
        let ya = ground(wall.a[0], wall.a[1]);
        let yb = ground(wall.b[0], wall.b[1]);
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
        } else if wall.kind == "concrete" {
            b.cube(
                base * Mat4::from_translation(vec3(0., wall.height / 2., 0.)),
                vec3(wall.radius * 2., wall.height, len + 0.04),
                cement,
            );
        } else {
            for y in [0.35, 0.62, 0.89] {
                b.cube(
                    base * Mat4::from_translation(vec3(0., y, 0.)),
                    vec3(0.16, 0.19, len + 0.04),
                    steel,
                );
            }
        }
        let posts = (len / 4.).ceil() as usize;
        for i in 0..=posts {
            let f = i as f32 / posts as f32;
            let x = wall.a[0] + dx * f;
            let z = wall.a[1] + dz * f;
            if wall.fence {
                b.cube(
                    transform(x, ground(x, z) + 2.65, z, yaw),
                    vec3(0.08, 3.3, 0.08),
                    steel,
                );
            } else if wall.kind == "armco" {
                b.cube(
                    transform(x, ground(x, z) + 0.5, z, yaw),
                    vec3(0.12, 1., 0.14),
                    steel,
                );
            }
        }
        if wall.fence {
            for level in [1.6, 2.4, 3.2, 4.] {
                b.cube(
                    base * Mat4::from_translation(vec3(0., level, 0.)),
                    vec3(0.025, 0.025, len),
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
                if (j + row as usize * 3 + id) % 3 == 0 {
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
                LIGHTGRAY,
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
    fn all_native_venue_batches_fit_and_are_finite() {
        for t in apex_heritage::tracks() {
            let v = Venue::for_track(&t.name);
            let meshes = build(&t, &v);
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

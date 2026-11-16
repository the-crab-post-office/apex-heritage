//! Native counterpart to web/reference-car.js; identical authored chassis/wheel triangles.
use macroquad::prelude::*;
use std::collections::HashMap;
fn hex(s: &str) -> Color {
    let n = u32::from_str_radix(s.trim_start_matches('#'), 16).unwrap_or(0xcccccc);
    Color::from_rgba((n >> 16) as u8, (n >> 8) as u8, n as u8, 255)
}
pub struct Cars {
    pub hide_head: bool,
    meshes: HashMap<usize, Vec<(String, Option<String>, bool, bool, Mesh)>>,
}
impl Cars {
    pub fn new() -> Self {
        let mut meshes = HashMap::new();
        for era in 0..4 {
            let batches = apex_heritage::car_shapes::model(era)
                .unwrap()
                .iter()
                .map(|b| {
                    let mut normals = vec![Vec3::ZERO; b.positions.len()];
                    for tri in b.indices.chunks(3) {
                        let a = Vec3::from_array(b.positions[tri[0] as usize]);
                        let n = (Vec3::from_array(b.positions[tri[1] as usize]) - a)
                            .cross(Vec3::from_array(b.positions[tri[2] as usize]) - a)
                            .normalize_or_zero();
                        for i in tri {
                            normals[*i as usize] += n;
                        }
                    }
                    let vertices = b
                        .positions
                        .iter()
                        .zip(&b.uvs)
                        .enumerate()
                        .map(|(i, (p, u))| {
                            let n = normals[i].normalize_or_zero();
                            let light =
                                0.48 + 0.52 * n.dot(vec3(-0.3, 0.85, 0.4).normalize()).abs();
                            Vertex::new2(
                                Vec3::from_array(*p),
                                Vec2::from_array(*u),
                                Color::new(light, light, light, 1.),
                            )
                        })
                        .collect();
                    (
                        b.material.clone(),
                        b.wheel.clone(),
                        b.head,
                        b.cockpit_ghost,
                        Mesh {
                            vertices,
                            indices: b.indices.clone(),
                            texture: None,
                        },
                    )
                })
                .collect();
            meshes.insert(era, batches);
        }
        Self {
            meshes,
            hide_head: false,
        }
    }
    pub fn draw(
        &mut self,
        p: Vec3,
        yaw: f32,
        pitch: f32,
        roll: f32,
        heights: [f32; 4],
        texture: &Texture2D,
        era: usize,
        team: usize,
    ) {
        let t = apex_heritage::roster::team(era, team);
        let rot =
            Mat4::from_rotation_y(yaw) * Mat4::from_rotation_x(pitch) * Mat4::from_rotation_z(roll);
        unsafe {
            get_internal_gl()
                .quad_gl
                .push_model_matrix(Mat4::from_translation(p) * rot);
        }
        let wheels = apex_heritage::contact::wheels(era);
        for (material, wheel, head, ghost, mesh) in self.meshes.get_mut(&era).unwrap() {
            if *head && self.hide_head {
                continue;
            }
            let mapped =
                ["body", "pods", "wing", "tyre", "front_wing"].contains(&material.as_str());
            mesh.texture = if mapped { Some(texture.clone()) } else { None };
            let mut color = match material.as_str() {
                "carbon" => hex("#14191f"),
                "rubber" => hex("#111317"),
                "rim" => hex("#aab0ae"),
                "engine" => hex("#56595a"),
                "exhaust" => hex("#a7947c"),
                "screen" => hex("#55c7ac"),
                "belt" => hex("#b52b21"),
                "brake" => hex("#74716c"),
                "groove" => hex("#070809"),
                "helmet" => hex("#ece9da"),
                "accent" => hex(if era == 0 { &t.secondary } else { &t.accent }),
                "compound" => hex(if era == 0 { "#202224" } else { "#c62a36" }),
                _ => WHITE,
            };
            if *ghost && self.hide_head {
                color.a = 0.22;
            }
            // Vertex lighting is baked once; material tint is supplied independently.
            gl_use_default_material();
            if let Some(which) = wheel {
                for (i, w) in wheels.iter().enumerate() {
                    if (i % 2 == 0) != (which == "front") {
                        continue;
                    }
                    let y = (heights[i] + w.radius
                        - p.y
                        - rot.x_axis.y * w.lateral
                        - rot.z_axis.y * w.longitudinal)
                        / rot.y_axis.y;
                    unsafe {
                        get_internal_gl()
                            .quad_gl
                            .push_model_matrix(Mat4::from_translation(vec3(
                                w.lateral,
                                y,
                                w.longitudinal,
                            )));
                    }
                    draw_tinted(mesh, color);
                    unsafe {
                        get_internal_gl().quad_gl.pop_model_matrix();
                    }
                }
            } else {
                draw_tinted(mesh, color);
            }
        }
        unsafe {
            get_internal_gl().quad_gl.pop_model_matrix();
        }
    }
}
fn draw_tinted(mesh: &Mesh, color: Color) {
    // Macroquad's built-in mesh pipeline stores per-vertex colour. Scratch copy keeps cache immutable.
    let vertices = mesh
        .vertices
        .iter()
        .map(|v| {
            let mut v = *v;
            v.color[0] = (v.color[0] as f32 * color.r) as u8;
            v.color[1] = (v.color[1] as f32 * color.g) as u8;
            v.color[2] = (v.color[2] as f32 * color.b) as u8;
            v.color[3] = (v.color[3] as f32 * color.a) as u8;
            v
        })
        .collect();
    draw_mesh(&Mesh {
        vertices,
        indices: mesh.indices.clone(),
        texture: mesh.texture.clone(),
    });
}

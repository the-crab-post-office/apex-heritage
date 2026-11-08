//! Lightweight native renderer using exactly the same Rust simulation as the browser.
use apex_heritage::{tracks, Simulation, Track};
use macroquad::prelude::*;
fn conf() -> Conf {
    Conf {
        window_title: "APEX / HERITAGE — Native".into(),
        window_width: 1440,
        window_height: 900,
        high_dpi: true,
        ..Default::default()
    }
}
const TEAM_NAMES: [[&str; 4]; 4] = [
    ["Lotus 49", "Ferrari 312", "Brabham BT24", "Cooper T81"],
    [
        "McLaren MP4/4",
        "Ferrari F1/87/88C",
        "Williams FW12",
        "Benetton B188",
    ],
    [
        "Ferrari F2004",
        "Williams FW26",
        "Renault R24",
        "McLaren MP4-19",
    ],
    [
        "Red Bull RB19",
        "Mercedes W14",
        "Ferrari SF-23",
        "Aston Martin AMR23",
    ],
];
fn car(p: Vec3, yaw: f32, pitch: f32, color: Color, era: usize) {
    // Transform the entire model so body, wings and wheels all follow heading.
    unsafe {
        get_internal_gl().quad_gl.push_model_matrix(
            Mat4::from_translation(p) * Mat4::from_rotation_y(yaw) * Mat4::from_rotation_x(pitch),
        );
    }
    let classic = era == 0;
    draw_cube(
        vec3(0., 0.48, 0.),
        vec3(
            if classic { 0.8 } else { 1.3 },
            0.55,
            if era == 3 { 4.4 } else { 3.6 },
        ),
        None,
        color,
    );
    if !classic {
        draw_cube(vec3(0., 0.24, 2.0), vec3(2.2, 0.12, 0.55), None, color);
        draw_cube(vec3(0., 0.95, -1.8), vec3(2., 0.12, 0.55), None, color);
        draw_cube(vec3(0., 0.7, -0.7), vec3(0.55, 0.6, 0.9), None, color);
    }
    draw_cube(vec3(0., 0.77, 0.2), vec3(0.45, 0.15, 0.6), None, BLACK);
    draw_sphere(vec3(0., 1., 0.), 0.22, None, WHITE);
    for x in [-1., 1.] {
        for z in [-1.25, 1.25] {
            draw_cube(
                vec3(x, 0.36, z),
                vec3(if classic { 0.3 } else { 0.48 }, 0.72, 0.72),
                None,
                Color::from_rgba(18, 19, 20, 255),
            );
        }
    }
    unsafe {
        get_internal_gl().quad_gl.pop_model_matrix();
    }
}
fn terrain_mesh(t: &Track) -> Vec<Mesh> {
    let min_x = t.points.iter().map(|p| p[0]).fold(f32::INFINITY, f32::min) - 300.;
    let max_x = t
        .points
        .iter()
        .map(|p| p[0])
        .fold(f32::NEG_INFINITY, f32::max)
        + 300.;
    let min_z = t.points.iter().map(|p| p[1]).fold(f32::INFINITY, f32::min) - 300.;
    let max_z = t
        .points
        .iter()
        .map(|p| p[1])
        .fold(f32::NEG_INFINITY, f32::max)
        + 300.;
    let nx = (((max_x - min_x) / 28.).ceil() as usize).min(120);
    let nz = (((max_z - min_z) / 28.).ceil() as usize).min(120);
    let mut vertices = Vec::new();
    for iz in 0..=nz {
        for ix in 0..=nx {
            let x = min_x + (max_x - min_x) * ix as f32 / nx as f32;
            let z = min_z + (max_z - min_z) * iz as f32 / nz as f32;
            let y = t.terrain_height(x, z) - 1.25;
            vertices.push(Vertex::new2(
                vec3(x, y, z),
                vec2(ix as f32 / nx as f32, iz as f32 / nz as f32),
                Color::from_rgba(76, 94, 52, 255),
            ));
        }
    }
    // Keep each draw under Macroquad's default 5,000-index capacity.
    let mut chunks = Vec::new();
    for z0 in (0..nz).step_by(20) {
        for x0 in (0..nx).step_by(20) {
            let w = (nx - x0).min(20);
            let h = (nz - z0).min(20);
            let mut vs = Vec::new();
            let mut ids = Vec::new();
            for z in 0..=h {
                for x in 0..=w {
                    vs.push(vertices[(z0 + z) * (nx + 1) + x0 + x].clone());
                    if x < w && z < h {
                        let a = (z * (w + 1) + x) as u16;
                        let b = a + (w + 1) as u16;
                        ids.extend_from_slice(&[a, b, a + 1, a + 1, b, b + 1]);
                    }
                }
            }
            chunks.push(Mesh {
                vertices: vs,
                indices: ids,
                texture: None,
            });
        }
    }
    chunks
}
#[macroquad::main(conf)]
async fn main() {
    let smoke = std::env::var("APEX_SMOKE").is_ok();
    let mut smoke_frames = 0;
    let circuits = tracks();
    let mut ti = 0usize;
    let mut era = 2usize;
    let mut team = 0usize;
    let mut wet = false;
    let mut assist = true;
    let mut menu = !smoke;
    let mut paused = false;
    let mut sim = Simulation::new(ti, era, team, wet, assist);
    let mut accumulator = 0.;
    let mut terrain_track = ti;
    let mut landscape = terrain_mesh(&circuits[ti]);
    loop {
        if smoke {
            smoke_frames += 1;
            if smoke_frames > 120 {
                assert!(sim.state().speed > 5.);
                println!(
                    "Native render + physics smoke passed: {:0.1} km/h",
                    sim.state().speed * 3.6
                );
                break;
            }
        }
        if is_key_pressed(KeyCode::Escape) {
            if !menu {
                paused = !paused;
            }
        }
        if menu {
            if is_key_pressed(KeyCode::Right) {
                ti = (ti + 1) % 10;
            }
            if is_key_pressed(KeyCode::Left) {
                ti = (ti + 9) % 10;
            }
            if is_key_pressed(KeyCode::E) {
                era = (era + 1) % 4;
            }
            if is_key_pressed(KeyCode::T) {
                team = (team + 1) % 4;
            }
            if is_key_pressed(KeyCode::W) {
                wet = !wet;
            }
            if is_key_pressed(KeyCode::A) {
                assist = !assist;
            }
            if is_key_pressed(KeyCode::Enter) {
                sim = Simulation::new(ti, era, team, wet, assist);
                menu = false;
                paused = false;
            }
        }
        if !menu && !paused {
            if is_key_pressed(KeyCode::R) {
                sim.recover();
            }
            if is_key_pressed(KeyCode::M) {
                menu = true;
            }
            let throttle = if smoke || is_key_down(KeyCode::W) || is_key_down(KeyCode::Up) {
                1.
            } else {
                0.
            };
            let brake = if is_key_down(KeyCode::S)
                || is_key_down(KeyCode::Down)
                || is_key_down(KeyCode::Space)
            {
                1.
            } else {
                0.
            };
            let steer = (if is_key_down(KeyCode::A) || is_key_down(KeyCode::Left) {
                1.
            } else {
                0.
            }) - (if is_key_down(KeyCode::D) || is_key_down(KeyCode::Right) {
                1.
            } else {
                0.
            });
            accumulator += if smoke {
                1. / 60.
            } else {
                get_frame_time().min(0.1)
            };
            while accumulator >= 1. / 120. {
                sim.step(throttle, brake, steer, 1. / 120.);
                accumulator -= 1. / 120.;
            }
        }
        clear_background(if wet {
            Color::from_rgba(100, 117, 126, 255)
        } else {
            Color::from_rgba(162, 193, 208, 255)
        });
        if terrain_track != ti {
            landscape = terrain_mesh(&circuits[ti]);
            terrain_track = ti;
        }
        let s = sim.state();
        let p = vec3(s.x, s.y, s.z);
        let f = vec3(
            s.yaw.sin() * s.pitch.cos(),
            -s.pitch.sin(),
            s.yaw.cos() * s.pitch.cos(),
        );
        set_camera(&Camera3D {
            position: p - f * 10. + vec3(0., 5., 0.),
            target: p + f * 12. + vec3(0., 0.7, 0.),
            up: vec3(0., 1., 0.),
            fovy: 58.,
            z_far: 12000.,
            ..Default::default()
        });
        draw_plane(
            vec3(0., -10., 0.),
            vec2(10000., 10000.),
            None,
            Color::from_rgba(57, 78, 45, 255),
        );
        for patch in &landscape {
            draw_mesh(patch);
        }
        let t = &circuits[ti];
        let n = t.points.len();
        for i in 0..n {
            let a = t.points[i];
            let b = t.points[(i + 1) % n];
            if (a[0] - s.x).hypot(a[1] - s.z) > 700. {
                continue;
            }
            let dx = b[0] - a[0];
            let dz = b[1] - a[1];
            let len = dx.hypot(dz);
            let r = vec3(dz / len, 0., -dx / len) * t.width * 0.5;
            let av = vec3(a[0], t.heights[i] + 0.05, a[1]);
            let bv = vec3(b[0], t.heights[(i + 1) % n] + 0.05, b[1]);
            let vertices = vec![
                Vertex::new2(av - r, vec2(0., 0.), Color::from_rgba(48, 50, 52, 255)),
                Vertex::new2(av + r, vec2(1., 0.), Color::from_rgba(48, 50, 52, 255)),
                Vertex::new2(bv - r, vec2(0., 1.), Color::from_rgba(48, 50, 52, 255)),
                Vertex::new2(bv + r, vec2(1., 1.), Color::from_rgba(48, 50, 52, 255)),
            ];
            draw_mesh(&Mesh {
                vertices,
                indices: vec![0, 1, 2, 2, 1, 3],
                texture: None,
            });
            if i % 3 == 0 {
                let c = if i % 6 == 0 { RED } else { WHITE };
                draw_cube(av - r * 1.04, vec3(0.5, 0.06, 2.), None, c);
                draw_cube(av + r * 1.04, vec3(0.5, 0.06, 2.), None, c);
            }
            if i % 20 == 0 {
                let mut tree = av + r * 4.;
                tree.y = t.terrain_height(tree.x, tree.z);
                draw_cube(tree + vec3(0., 2., 0.), vec3(0.7, 4., 0.7), None, BROWN);
                draw_sphere(tree + vec3(0., 5., 0.), 3., None, DARKGREEN);
            }
        }
        car(p, s.yaw, s.pitch, [RED, ORANGE, BLUE, GREEN][team], era);
        set_default_camera();
        if menu {
            draw_rectangle(
                0.,
                0.,
                screen_width(),
                screen_height(),
                Color::new(0.025, 0.03, 0.035, 0.94),
            );
            draw_text("APEX / HERITAGE", 70., 100., 56., WHITE);
            draw_text(
                "THE HISTORY OF SPEED. IN YOUR HANDS.",
                72.,
                145.,
                22.,
                ORANGE,
            );
            draw_text(&format!("<  {}  >", t.name), 72., 245., 42., WHITE);
            draw_text(
                &format!(
                    "[E] ERA: {}     [T] TEAM: {}",
                    [
                        "1967 / NO WINGS",
                        "1988 / TURBO",
                        "2004 / V10",
                        "2023 / HYBRID"
                    ][era],
                    TEAM_NAMES[era][team]
                ),
                72.,
                315.,
                26.,
                WHITE,
            );
            draw_text(
                &format!("[W] WET: {}     [A] ASSISTS: {}", wet, assist),
                72.,
                365.,
                26.,
                WHITE,
            );
            draw_text(
                "ARROWS: SELECT CIRCUIT     ENTER: DRIVE",
                72.,
                445.,
                26.,
                ORANGE,
            );
            draw_text(
                "WASD / ARROWS: DRIVE   SPACE: BRAKE   R: RECOVER   ESC: PAUSE   M: MENU",
                72.,
                515.,
                19.,
                GRAY,
            );
            draw_text(
                "Native prototype / original assets / map-derived layouts / unofficial",
                72.,
                screen_height() - 50.,
                18.,
                GRAY,
            );
        } else {
            draw_rectangle(20., 20., 470., 95., Color::new(0., 0., 0., 0.7));
            draw_text(&format!("{}   LAP {}", t.name, s.lap), 40., 54., 25., WHITE);
            draw_text(
                &format!(
                    "{:03} km/h   G{}   {:02}:{:05.2}",
                    s.speed * 3.6,
                    s.gear,
                    (s.lap_time / 60.) as u32,
                    s.lap_time % 60.
                ),
                40.,
                93.,
                32.,
                ORANGE,
            );
            draw_text(
                "WASD / arrows  •  Space brake  •  R recover  •  Esc pause  •  M menu",
                25.,
                screen_height() - 25.,
                20.,
                WHITE,
            );
            draw_text(
                &format!(
                    "ELEVATION {:.0} m   GRADE {:+.1}%",
                    s.y - 0.1,
                    s.grade * 100.
                ),
                25.,
                screen_height() - 53.,
                20.,
                WHITE,
            );
            if s.offtrack {
                draw_text("OFF TRACK", screen_width() / 2. - 90., 80., 30., ORANGE);
            }
            if paused {
                draw_rectangle(
                    0.,
                    0.,
                    screen_width(),
                    screen_height(),
                    Color::new(0., 0., 0., 0.6),
                );
                draw_text(
                    "PAUSED — ESC TO RESUME",
                    screen_width() / 2. - 220.,
                    screen_height() / 2.,
                    38.,
                    WHITE,
                );
                if is_key_pressed(KeyCode::M) {
                    menu = true;
                    paused = false;
                }
            }
        }
        next_frame().await
    }
}

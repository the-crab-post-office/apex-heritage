//! Lightweight native renderer using exactly the same Rust simulation as the browser.
use apex_heritage::native_audio::NativeAudio;
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
    let mut points = Vec::new();
    for iz in 0..=nz {
        for ix in 0..=nx {
            let x = min_x + (max_x - min_x) * ix as f32 / nx as f32;
            let z = min_z + (max_z - min_z) * iz as f32 / nz as f32;
            points.push([x as f64, (t.terrain_height(x, z) - 1.25) as f64, z as f64]);
        }
    }
    let mask = apex_heritage::surface_mesh::RoadMask::new(t);
    let pit_track = apex_heritage::pit::PitLane::new(t).as_track();
    let pit_mask = apex_heritage::surface_mesh::RoadMask::new_open(&pit_track);
    let photo = apex_heritage::tracks()
        .iter()
        .position(|q| q.name == t.name)
        .map(|i| apex_heritage::imagery::areas()[i].clone());
    let mut meshes = Vec::new();
    let mut vertices = Vec::new();
    let mut indices = Vec::new();
    for z in 0..nz {
        for x in 0..nx {
            let a = z * (nx + 1) + x;
            let b = a + nx + 1;
            for tri in [
                [points[a], points[b], points[a + 1]],
                [points[a + 1], points[b], points[b + 1]],
            ] {
                for piece in mask.cut(tri).into_iter().flat_map(|p| pit_mask.cut(p)) {
                    if vertices.len() + 3 > 3996 {
                        meshes.push(Mesh {
                            vertices: std::mem::take(&mut vertices),
                            indices: std::mem::take(&mut indices),
                            texture: None,
                        });
                    }
                    for p in piece {
                        indices.push(vertices.len() as u16);
                        vertices.push(Vertex::new2(
                            vec3(p[0] as f32, p[1] as f32, p[2] as f32),
                            photo
                                .as_ref()
                                .map(|a| {
                                    vec2(
                                        (p[0] as f32 - a.bounds[0]) / (a.bounds[2] - a.bounds[0]),
                                        (p[2] as f32 - a.bounds[1]) / (a.bounds[3] - a.bounds[1]),
                                    )
                                })
                                .unwrap_or(vec2(0., 0.)),
                            WHITE,
                        ));
                    }
                }
            }
        }
    }
    if !vertices.is_empty() {
        meshes.push(Mesh {
            vertices,
            indices,
            texture: None,
        });
    }
    meshes
}

fn pit_mesh_build(pit: &apex_heritage::pit::PitLane, road: &Track) -> Vec<Mesh> {
    let t = pit.as_track();
    let mask = apex_heritage::surface_mesh::RoadMask::new(road);
    let mut meshes = Vec::new();
    let mut vertices = Vec::new();
    let mut indices = Vec::new();
    for i in 0..t.points.len() - 1 {
        let a = apex_heritage::surface_mesh::road_point_open(&t, i, -t.width as f64 / 2., 0.035);
        let b =
            apex_heritage::surface_mesh::road_point_open(&t, i + 1, -t.width as f64 / 2., 0.035);
        let c = apex_heritage::surface_mesh::road_point_open(&t, i, t.width as f64 / 2., 0.035);
        let d = apex_heritage::surface_mesh::road_point_open(&t, i + 1, t.width as f64 / 2., 0.035);
        for tri in [[a, b, c], [c, b, d]] {
            for piece in mask.cut(tri) {
                if vertices.len() + 3 > 3996 {
                    meshes.push(Mesh {
                        vertices: std::mem::take(&mut vertices),
                        indices: std::mem::take(&mut indices),
                        texture: None,
                    });
                }
                for p in piece {
                    indices.push(vertices.len() as u16);
                    vertices.push(Vertex::new2(
                        vec3(p[0] as f32, p[1] as f32, p[2] as f32),
                        vec2(p[0] as f32 / 4., p[2] as f32 / 4.),
                        Color::from_rgba(90, 93, 90, 255),
                    ));
                }
            }
        }
    }
    if !vertices.is_empty() {
        meshes.push(Mesh {
            vertices,
            indices,
            texture: None,
        });
    }
    meshes
}
fn mapped_buildings(
    t: &Track,
    buildings: &[apex_heritage::scenery::Building],
) -> Vec<(Vec3, Mesh)> {
    let pit = apex_heritage::pit::PitLane::new(t).as_track();
    buildings
        .iter()
        .filter(|b| t.polygon_clear(&b.footprint) && pit.polygon_clear(&b.footprint))
        .map(|b| {
            let n = b.footprint.len();
            let center = vec3(
                b.footprint.iter().map(|p| p[0]).sum::<f32>() / n as f32,
                0.,
                b.footprint.iter().map(|p| p[1]).sum::<f32>() / n as f32,
            );
            let base = b
                .footprint
                .iter()
                .map(|p| t.terrain_height(p[0], p[1]))
                .fold(f32::INFINITY, f32::min)
                - 0.2;
            let mut vs = Vec::new();
            let mut ids = Vec::new();
            let color = [
                Color::from_rgba(181, 176, 156, 255),
                Color::from_rgba(208, 198, 178, 255),
                Color::from_rgba(155, 159, 148, 255),
            ][b.osm_id as usize % 3];
            for p in &b.footprint {
                for h in [base, base + b.height] {
                    vs.push(Vertex::new2(vec3(p[0], h, p[1]), vec2(0., 0.), color));
                }
            }
            for i in 0..n {
                let a = (i * 2) as u16;
                let c = (((i + 1) % n) * 2) as u16;
                ids.extend_from_slice(&[a, c, a + 1, a + 1, c, c + 1]);
            }
            for tri in apex_heritage::scenery::triangulate(&b.footprint) {
                ids.extend(tri.iter().map(|i| (i * 2 + 1) as u16));
            }
            (
                center,
                Mesh {
                    vertices: vs,
                    indices: ids,
                    texture: None,
                },
            )
        })
        .collect()
}
#[macroquad::main(conf)]
async fn main() {
    let smoke = std::env::var("APEX_SMOKE").is_ok();
    let mut smoke_frames = 0;
    let mut controller = apex_heritage::controller::Controller::new();
    let audio = NativeAudio::new();
    let mut sound_on = true;
    let circuits = tracks();
    let mapped = apex_heritage::scenery::buildings();
    let photo_areas = apex_heritage::imagery::areas();
    let photos: Vec<Texture2D> = apex_heritage::imagery::PHOTOS
        .iter()
        .map(|b| {
            let t = Texture2D::from_file_with_format(b, Some(ImageFormat::Jpeg));
            t.set_filter(FilterMode::Linear);
            t
        })
        .collect();
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
    for mesh in &mut landscape {
        mesh.texture = Some(photos[ti].clone());
    }
    let mut pit_lane = apex_heritage::pit::PitLane::new(&circuits[ti]);
    let mut pit_mesh = pit_mesh_build(&pit_lane, &circuits[ti]);
    let mut camera_mode = 0;
    let mut buildings = mapped_buildings(&circuits[ti], &mapped[ti].buildings);
    loop {
        let pad = controller.poll();
        if pad.pressed.contains(&gilrs::Button::Select) && !menu {
            menu = true;
            paused = false;
        }
        if pad.lost && !menu {
            paused = true;
        }
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
        if is_key_pressed(KeyCode::V) {
            sound_on = !sound_on;
        }
        if is_key_pressed(KeyCode::Escape) || pad.pressed.contains(&gilrs::Button::Start) {
            if !menu {
                paused = !paused;
            }
        }
        if menu {
            if is_key_pressed(KeyCode::Right) || pad.pressed.contains(&gilrs::Button::DPadRight) {
                ti = (ti + 1) % 10;
            }
            if is_key_pressed(KeyCode::Left) || pad.pressed.contains(&gilrs::Button::DPadLeft) {
                ti = (ti + 9) % 10;
            }
            if is_key_pressed(KeyCode::E) || pad.pressed.contains(&gilrs::Button::LeftTrigger) {
                era = (era + 1) % 4;
            }
            if is_key_pressed(KeyCode::T) || pad.pressed.contains(&gilrs::Button::RightTrigger) {
                team = (team + 1) % 4;
            }
            if is_key_pressed(KeyCode::W) {
                wet = !wet;
            }
            if is_key_pressed(KeyCode::A) {
                assist = !assist;
            }
            if is_key_pressed(KeyCode::Enter) || pad.pressed.contains(&gilrs::Button::South) {
                sim = Simulation::new(ti, era, team, wet, assist);
                menu = false;
                paused = false;
            }
        }
        if !menu && !paused {
            if is_key_pressed(KeyCode::R) || pad.pressed.contains(&gilrs::Button::East) {
                sim.recover();
            }
            if is_key_pressed(KeyCode::M) {
                menu = true;
            }
            let throttle = (if smoke || is_key_down(KeyCode::W) || is_key_down(KeyCode::Up) {
                1.
            } else {
                0.
            } as f32)
                .max(pad.throttle);
            let brake = (if is_key_down(KeyCode::S)
                || is_key_down(KeyCode::Down)
                || is_key_down(KeyCode::Space)
            {
                1.
            } else {
                0.
            } as f32)
                .max(pad.brake);
            let mut steer = (if is_key_down(KeyCode::A) || is_key_down(KeyCode::Left) {
                1.
            } else {
                0.
            }) - (if is_key_down(KeyCode::D) || is_key_down(KeyCode::Right) {
                1.
            } else {
                0.
            });
            if pad.steer.abs() > 0. {
                steer = pad.steer;
            }
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
        if !menu && !paused {
            if is_key_pressed(KeyCode::P) || pad.pressed.contains(&gilrs::Button::West) {
                sim.request_pit();
            }
            if is_key_pressed(KeyCode::L) || pad.pressed.contains(&gilrs::Button::North) {
                sim.toggle_limiter();
            }
            if is_key_pressed(KeyCode::O) {
                sim.start_pit_practice();
            }
            if is_key_pressed(KeyCode::C) || pad.pressed.contains(&gilrs::Button::RightTrigger) {
                camera_mode = (camera_mode + 1) % 3;
            }
        }
        if terrain_track != ti {
            pit_lane = apex_heritage::pit::PitLane::new(&circuits[ti]);
            pit_mesh = pit_mesh_build(&pit_lane, &circuits[ti]);
            landscape = terrain_mesh(&circuits[ti]);
            for mesh in &mut landscape {
                mesh.texture = Some(photos[ti].clone());
            }
            buildings = mapped_buildings(&circuits[ti], &mapped[ti].buildings);
            terrain_track = ti;
        }
        let s = sim.state();
        if let Some(audio) = &audio {
            audio.update(s, era, menu || paused || !sound_on);
        }
        let p = vec3(s.x, s.y, s.z);
        let f = vec3(
            s.yaw.sin() * s.pitch.cos(),
            -s.pitch.sin(),
            s.yaw.cos() * s.pitch.cos(),
        );
        set_camera(&Camera3D {
            position: if camera_mode == 1 {
                p + f * 0.3 + vec3(0., 1.4, 0.)
            } else {
                p - f * if camera_mode == 2 { 16. } else { 10. }
                    + vec3(0., if camera_mode == 2 { 9. } else { 5. }, 0.)
            },
            target: p + f * 12. + vec3(0., 0.7, 0.),
            up: vec3(0., 1., 0.),
            fovy: 58.,
            z_far: 12000.,
            ..Default::default()
        });
        let base_ground = circuits[ti]
            .terrain
            .as_ref()
            .map(|g| g.heights.iter().copied().fold(f32::INFINITY, f32::min) - 5.)
            .unwrap_or(-10.);
        draw_plane(
            vec3(0., base_ground, 0.),
            vec2(10000., 10000.),
            None,
            Color::from_rgba(57, 78, 45, 255),
        );
        for mesh in &pit_mesh {
            draw_mesh(mesh);
        }
        let (box_p, box_yaw, _, _) =
            pit_lane.sample(pit_lane.box_distance, circuits[ti].points.len());
        let box_center = vec3(box_p[0], box_p[1] + 0.14, box_p[2]);
        let right = vec3(box_yaw.cos(), 0., -box_yaw.sin());
        let forward = vec3(box_yaw.sin(), 0., box_yaw.cos());
        for x in [-2.2, 2.2] {
            draw_line_3d(
                box_center + right * x - forward * 4.5,
                box_center + right * x + forward * 4.5,
                YELLOW,
            );
        }
        for z in [-4.5, 4.5] {
            draw_line_3d(
                box_center + forward * z - right * 2.2,
                box_center + forward * z + right * 2.2,
                YELLOW,
            );
        }
        for x in [-1., 1.] {
            for z in [-1.5, 1.5] {
                let crew =
                    box_center + right * x * if s.pit_phase == 2 { 1.5 } else { 4.2 } + forward * z;
                draw_cube(crew + vec3(0., 0.7, 0.), vec3(0.4, 1., 0.4), None, ORANGE);
                draw_sphere(crew + vec3(0., 1.4, 0.), 0.2, None, BEIGE);
            }
        }
        for patch in &landscape {
            draw_mesh(patch);
        }
        let t = &circuits[ti];
        for (center, building) in &buildings {
            if (center.x - s.x).hypot(center.z - s.z) < 850. {
                draw_mesh(building);
            }
        }
        let start = t.points[0];
        let next = t.points[1];
        let yaw = (next[0] - start[0]).atan2(next[1] - start[1]);
        for j in 0..(t.width * 2.) as usize {
            let x = j as f32 * 0.5 - t.width * 0.5;
            for z in [-0.25, 0.25] {
                let px = start[0] + x * yaw.cos() + z * yaw.sin();
                let pz = start[1] - x * yaw.sin() + z * yaw.cos();
                draw_cube(
                    vec3(px, t.heights[0] + 0.065, pz),
                    vec3(0.48, 0.025, 0.48),
                    None,
                    if (j + (z > 0.) as usize) % 2 == 0 {
                        WHITE
                    } else {
                        BLACK
                    },
                );
            }
        }
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
            let mut vertices = Vec::new();
            for row in [i, (i + 1) % n] {
                for offset in [-t.width as f64 / 2., 0., t.width as f64 / 2.] {
                    let p = apex_heritage::surface_mesh::road_point(t, row, offset, 0.05);
                    vertices.push(Vertex::new2(
                        vec3(p[0] as f32, p[1] as f32, p[2] as f32),
                        vec2(0., 0.),
                        Color::from_rgba(48, 50, 52, 255),
                    ));
                }
            }
            draw_mesh(&Mesh {
                vertices,
                indices: vec![0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5],
                texture: None,
            });
            if i % 3 == 0 {
                let c = if i % 6 == 0 { RED } else { WHITE };
                for curb in [av - r * 1.04, av + r * 1.04] {
                    if pit_lane.distance(curb.x, curb.z) > pit_lane.width / 2. + 1. {
                        draw_cube(curb, vec3(0.5, 0.06, 2.), None, c);
                    }
                }
            }
            if i % 20 == 0 {
                let mut tree = av + r * 4.;
                if !apex_heritage::imagery::forest_at(&photo_areas[ti], tree.x, tree.z)
                    || !t.circle_clear(tree.x, tree.z, 3.)
                    || pit_lane.distance(tree.x, tree.z) < pit_lane.width / 2. + 4.
                {
                    continue;
                }
                if mapped[ti]
                    .buildings
                    .iter()
                    .any(|b| apex_heritage::scenery::inside([tree.x, tree.z], &b.footprint))
                {
                    continue;
                }
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
                "OSM contributors (ODbL) / Edvvc recordings (CC BY-SA 3.0) / V: audio / unofficial",
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
                "WASD / arrows  •  Space brake  •  R recover  •  V audio  •  Esc pause  •  M menu",
                25.,
                screen_height() - 25.,
                20.,
                WHITE,
            );
            draw_text(
                &format!(
                    "ELEVATION {:0.0} m   GRADE {:+0.1}%",
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
        if !menu {
            draw_rectangle(20., 125., 650., 65., Color::new(0., 0., 0., 0.7));
            draw_text(
                &format!(
                    "P/X pit: {}  L/Y limiter: {}  Tyres {:0.0}% Fuel {:0.0}%",
                    s.pit_requested,
                    s.pit_limiter,
                    s.tyre_condition * 100.,
                    s.fuel * 100.
                ),
                30.,
                150.,
                19.,
                WHITE,
            );
            draw_text(
                &if s.pit_phase == 2 {
                    format!("SERVICING {:0.1}s", s.pit_remaining)
                } else if s.pit_active {
                    format!(
                        "PIT ASSIST · BOX {:0.0}m · BRAKE TO STOP",
                        (pit_lane.box_distance - s.pit_distance).max(0.)
                    )
                } else {
                    "O: pit practice (resets lap); C/RB: camera".into()
                },
                30.,
                177.,
                19.,
                YELLOW,
            );
        }
        draw_text(
            &format!("v{}", env!("CARGO_PKG_VERSION")),
            screen_width() - 100.,
            25.,
            18.,
            WHITE,
        );
        next_frame().await
    }
}

#[cfg(test)]
mod surface_tests {
    use super::*;
    use std::collections::HashMap;
    type Triangle = [[f64; 3]; 3];
    fn height_at(p: [f64; 3], t: Triangle) -> Option<f64> {
        let [a, b, c] = t;
        let d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
        if d.abs() < 1e-9 {
            return None;
        }
        let u = ((b[2] - c[2]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[2] - c[2])) / d;
        let v = ((c[2] - a[2]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[2] - c[2])) / d;
        let w = 1. - u - v;
        if u >= -1e-9 && v >= -1e-9 && w >= -1e-9 {
            Some(u * a[1] + v * b[1] + w * c[1])
        } else {
            None
        }
    }
    #[test]
    fn actual_native_terrain_and_pit_meshes_do_not_pierce_any_circuit() {
        for t in tracks() {
            let mut cells: HashMap<(i32, i32), Vec<Triangle>> = HashMap::new();
            let pit = apex_heritage::pit::PitLane::new(&t);
            for mesh in terrain_mesh(&t).into_iter().chain(pit_mesh_build(&pit, &t)) {
                assert!(mesh.vertices.len() < 4000);
                for ids in mesh.indices.chunks_exact(3) {
                    let tri: Triangle = std::array::from_fn(|i| {
                        let p = mesh.vertices[ids[i] as usize].position;
                        [p.x as f64, p.y as f64, p.z as f64]
                    });
                    let minx = tri.iter().map(|p| p[0]).fold(f64::INFINITY, f64::min);
                    let maxx = tri.iter().map(|p| p[0]).fold(f64::NEG_INFINITY, f64::max);
                    let minz = tri.iter().map(|p| p[2]).fold(f64::INFINITY, f64::min);
                    let maxz = tri.iter().map(|p| p[2]).fold(f64::NEG_INFINITY, f64::max);
                    for x in (minx / 40.).floor() as i32..=(maxx / 40.).floor() as i32 {
                        for z in (minz / 40.).floor() as i32..=(maxz / 40.).floor() as i32 {
                            cells.entry((x, z)).or_default().push(tri);
                        }
                    }
                }
            }
            let mut samples = 0;
            for i in (0..t.points.len()).step_by(8) {
                for fraction in [-0.85, -0.4, 0., 0.4, 0.85] {
                    let a = apex_heritage::surface_mesh::road_point(
                        &t,
                        i,
                        fraction * t.width as f64 / 2.,
                        0.05,
                    );
                    let b = apex_heritage::surface_mesh::road_point(
                        &t,
                        (i + 1) % t.points.len(),
                        fraction * t.width as f64 / 2.,
                        0.05,
                    );
                    let p = std::array::from_fn(|k| (a[k] + b[k]) / 2.);
                    samples += 1;
                    if let Some(list) =
                        cells.get(&((p[0] / 40.).floor() as i32, (p[2] / 40.).floor() as i32))
                    {
                        for tri in list {
                            if let Some(y) = height_at(p, *tri) {
                                assert!(
                                    y <= p[1] + 0.01,
                                    "{} sample {}: native terrain {} above road {}",
                                    t.name,
                                    i,
                                    y,
                                    p[1]
                                );
                            }
                        }
                    }
                }
            }
            assert!(samples > 350);
        }
    }
}

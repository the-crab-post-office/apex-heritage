//! Lightweight native renderer using exactly the same Rust simulation as the browser.
mod camera_controls;
mod reference_car;
mod venue;
use apex_heritage::native_audio::NativeAudio;
use apex_heritage::{tracks, Simulation, Track};
use macroquad::prelude::*;
fn conf() -> macroquad::conf::Conf {
    macroquad::conf::Conf {
        draw_call_vertex_capacity: 10000,
        draw_call_index_capacity: 32768,
        miniquad_conf: Conf {
            window_title: "APEX / HERITAGE — Native".into(),
            window_width: 1440,
            window_height: 900,
            high_dpi: true,
            ..Default::default()
        },
        ..Default::default()
    }
}
fn car(
    p: Vec3,
    yaw: f32,
    pitch: f32,
    roll: f32,
    heights: [f32; 4],
    texture: &Texture2D,
    _color: Color,
    era: usize,
    cars: &mut reference_car::Cars,
    team: usize,
) {
    cars.draw(p, yaw, pitch, roll, heights, texture, era, team);
}
fn tunnel(t: &Track, range: Option<(usize, usize)>, player: Vec3, texture: &Texture2D) {
    let Some((start, end)) = range else {
        return;
    };
    let n = t.points.len();
    let w = t.width / 2.;
    for step in 0..(end - start + n) % n {
        let i = (start + step) % n;
        let j = (i + 1) % n;
        let a = t.points[i];
        let b = t.points[j];
        let center = vec3(
            (a[0] + b[0]) / 2.,
            (t.heights[i] + t.heights[j]) / 2.,
            (a[1] + b[1]) / 2.,
        );
        if center.distance(player) > 180. {
            continue;
        }
        let dx = b[0] - a[0];
        let dz = b[1] - a[1];
        let len = dx.hypot(dz);
        unsafe {
            get_internal_gl().quad_gl.push_model_matrix(
                Mat4::from_translation(center) * Mat4::from_rotation_y(dx.atan2(dz)),
            );
        }
        draw_cube(
            vec3(0., 4.65, 0.),
            vec3(w * 2. + 1.3, 0.14, len + 0.1),
            Some(texture),
            Color::from_rgba(71, 65, 57, 255),
        );
        for side in [-1., 1.] {
            let open = side > 0. && step as f32 > ((end - start + n) % n) as f32 * 0.72;
            let height = if open { 1.5 } else { 4.55 };
            draw_cube(
                vec3(side * (w + 0.45), height / 2., 0.),
                vec3(0.35, height, len + 0.05),
                Some(texture),
                LIGHTGRAY,
            );
            draw_cube(
                vec3(side * (w + 0.25), 2.6, 0.),
                vec3(0.32, 3.7, 0.18),
                None,
                DARKGRAY,
            );
            for y in [0.55, 0.78, 1.01] {
                draw_cube(
                    vec3(side * (w + 0.12), y, 0.),
                    vec3(0.16, 0.095, len + 0.05),
                    None,
                    GRAY,
                );
            }
            if step % 2 == 0 {
                draw_cube(
                    vec3(side * (w - 0.62), 4.25, 0.),
                    vec3(0.55, 0.08, 0.82),
                    None,
                    if step % 4 == 0 {
                        Color::from_rgba(210, 234, 255, 255)
                    } else {
                        Color::from_rgba(255, 214, 141, 255)
                    },
                );
            }
        }
        unsafe {
            get_internal_gl().quad_gl.pop_model_matrix();
        }
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
                            vec2(p[0] as f32 / 4., p[2] as f32 / 4.),
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
                for h in [
                    base,
                    b.roof_height
                        .unwrap_or(base + b.height)
                        .max(base + b.height),
                ] {
                    vs.push(Vertex::new2(
                        vec3(p[0], h, p[1]),
                        vec2((p[0] + p[1]) / 6., (h - base) / 4.),
                        color,
                    ));
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
    let metadata: serde_json::Value =
        serde_json::from_str(include_str!("../../data/tracks.json")).unwrap();
    let tunnel_ranges: Vec<Option<(usize, usize)>> = metadata
        .as_array()
        .unwrap()
        .iter()
        .map(|t| {
            t["road_corrections"]
                .as_array()
                .unwrap()
                .iter()
                .find(|c| c["type"] == "tunnel")
                .map(|c| {
                    (
                        c["start_index"].as_u64().unwrap() as usize,
                        c["end_index"].as_u64().unwrap() as usize,
                    )
                })
        })
        .collect();
    let mapped = apex_heritage::scenery::buildings();
    let photo_areas = apex_heritage::imagery::areas();
    let grass = Texture2D::from_file_with_format(
        include_bytes!("../../web/assets/materials/Grass004_1K-JPG_Color.jpg"),
        Some(ImageFormat::Jpeg),
    );
    grass.set_filter(FilterMode::Linear);
    unsafe {
        get_internal_gl().quad_context.texture_set_wrap(
            grass.raw_miniquad_id(),
            macroquad::miniquad::TextureWrap::Repeat,
            macroquad::miniquad::TextureWrap::Repeat,
        );
    }
    let walls: Vec<Texture2D> = [
        include_bytes!("../../web/assets/materials/Bricks001_1K-JPG_Color.jpg").as_slice(),
        include_bytes!("../../web/assets/materials/Concrete023_1K-JPG_Color.jpg").as_slice(),
    ]
    .iter()
    .map(|b| {
        let tex = Texture2D::from_file_with_format(b, Some(ImageFormat::Jpeg));
        tex.set_filter(FilterMode::Linear);
        unsafe {
            get_internal_gl().quad_context.texture_set_wrap(
                tex.raw_miniquad_id(),
                macroquad::miniquad::TextureWrap::Repeat,
                macroquad::miniquad::TextureWrap::Repeat,
            );
        }
        tex
    })
    .collect();
    let mut ti = std::env::var("APEX_SMOKE_TRACK")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(0)
        .min(9);
    let mut era = std::env::var("APEX_SMOKE_ERA")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(2)
        .min(3);
    let mut team = 0usize;
    let mut wet = false;
    let mut assist = true;
    let mut menu = !smoke;
    let mut paused = false;
    let mut sim = Simulation::new(ti, era, team, wet, assist);
    let mut accumulator = 0.;
    let mut terrain_track = ti;
    let mut terrain_era = era;
    let mut landscape = terrain_mesh(&circuits[ti]);
    for mesh in &mut landscape {
        mesh.texture = Some(grass.clone());
    }
    let mut pit_lane = apex_heritage::pit::PitLane::new(&circuits[ti]);
    let mut pit_mesh = pit_mesh_build(&pit_lane, &circuits[ti]);
    let mut safety = apex_heritage::venue::Venue::for_era(&circuits[ti].name, era);

    let mut details = apex_heritage::corner::Details::new(&circuits[ti], era);
    let mut corner_mesh = venue::corners(&details);
    let mut safety_mesh = venue::build(
        &circuits[ti],
        &safety,
        &venue::Ground::new(&[&landscape, &pit_mesh, &corner_mesh]),
    );
    let mut camera_controls = camera_controls::Controls::new(smoke);
    let mut camera_mode = std::env::var("APEX_SMOKE_CAMERA")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or_else(|| camera_controls.selected())
        .min(apex_heritage::cameras::rigs().len() - 1);
    let mut reference_cars = reference_car::Cars::new();
    let mut livery_key = (era, team);
    let mut livery_texture = Texture2D::from_file_with_format(
        apex_heritage::livery_assets::png(&apex_heritage::roster::team(era, team).id),
        None,
    );
    let mut buildings = mapped_buildings(&circuits[ti], &mapped[ti].buildings);
    for (i, (_, mesh)) in buildings.iter_mut().enumerate() {
        mesh.texture = Some(walls[i % walls.len()].clone());
    }
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
            if std::env::var("APEX_SMOKE_ALL_CAMERAS").is_ok() {
                camera_mode = ((smoke_frames - 1) / 15) % apex_heritage::cameras::rigs().len();
            }
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
                team = team.min(apex_heritage::roster::teams(era).len() - 1);
            }
            if is_key_pressed(KeyCode::T) || pad.pressed.contains(&gilrs::Button::RightTrigger) {
                team = (team + 1) % apex_heritage::roster::teams(era).len();
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
                camera_mode = (camera_mode + 1) % apex_heritage::cameras::rigs().len();
            }
            for (i, key) in [
                KeyCode::Key1,
                KeyCode::Key2,
                KeyCode::Key3,
                KeyCode::Key4,
                KeyCode::Key5,
                KeyCode::Key6,
                KeyCode::Key7,
                KeyCode::Key8,
            ]
            .iter()
            .enumerate()
            {
                if is_key_pressed(*key) {
                    camera_mode = i;
                }
            }
        }
        camera_controls.update(camera_mode, !menu);
        if terrain_track != ti || terrain_era != era {
            safety = apex_heritage::venue::Venue::for_era(&circuits[ti].name, era);

            details = apex_heritage::corner::Details::new(&circuits[ti], era);
            corner_mesh = venue::corners(&details);
            pit_lane = apex_heritage::pit::PitLane::new(&circuits[ti]);
            pit_mesh = pit_mesh_build(&pit_lane, &circuits[ti]);
            landscape = terrain_mesh(&circuits[ti]);
            for mesh in &mut landscape {
                mesh.texture = Some(grass.clone());
            }
            safety_mesh = venue::build(
                &circuits[ti],
                &safety,
                &venue::Ground::new(&[&landscape, &pit_mesh, &corner_mesh]),
            );
            buildings = mapped_buildings(&circuits[ti], &mapped[ti].buildings);
            for (i, (_, mesh)) in buildings.iter_mut().enumerate() {
                mesh.texture = Some(walls[i % walls.len()].clone());
            }
            terrain_track = ti;
            terrain_era = era;
        }
        if livery_key != (era, team) {
            livery_texture = Texture2D::from_file_with_format(
                apex_heritage::livery_assets::png(&apex_heritage::roster::team(era, team).id),
                None,
            );
            livery_key = (era, team);
        }
        let paint = u32::from_str_radix(
            apex_heritage::roster::team(era, team)
                .color
                .trim_start_matches('#'),
            16,
        )
        .unwrap();
        let team_color =
            Color::from_rgba((paint >> 16) as u8, (paint >> 8) as u8, paint as u8, 255);
        let s = sim.state();
        if let Some(audio) = &audio {
            audio.update(s, era, menu || paused || !sound_on);
        }
        let t = &circuits[ti];
        if !menu {
            let p = vec3(s.x, s.y, s.z);
            let rig = &apex_heritage::cameras::rigs()[camera_mode];
            let tuning = camera_controls.tuning(camera_mode);
            let (eye, target, fov) = apex_heritage::cameras::adjusted_pose(
                camera_mode,
                era,
                get_time() as f32,
                tuning,
                camera_controls.look,
            );
            let rotation = Mat4::from_rotation_y(s.yaw)
                * if rig.attached {
                    Mat4::from_rotation_x(s.pitch) * Mat4::from_rotation_z(s.body_roll)
                } else {
                    Mat4::IDENTITY
                };
            set_camera(&Camera3D {
                position: p + rotation.transform_vector3(Vec3::from_array(eye)),
                target: p + rotation.transform_vector3(Vec3::from_array(target)),
                up: rotation.transform_vector3(vec3(0., 1., 0.)),
                fovy: (fov
                    + if camera_mode == 0 && tuning.fov.is_none() {
                        (s.speed.abs() / 110.).min(1.) * 10.
                    } else {
                        0.
                    })
                .to_radians(),
                z_near: 0.035,
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
            tunnel(
                &circuits[ti],
                tunnel_ranges[ti],
                vec3(s.x, s.y, s.z),
                &walls[1],
            );
            venue::draw(&safety_mesh);
            venue::draw(&corner_mesh);
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
                    let crew = box_center
                        + right * x * if s.pit_phase == 2 { 1.5 } else { 4.2 }
                        + forward * z;
                    draw_cube(crew + vec3(0., 0.7, 0.), vec3(0.4, 1., 0.4), None, ORANGE);
                    draw_sphere(crew + vec3(0., 1.4, 0.), 0.2, None, BEIGE);
                }
            }
            for patch in &landscape {
                draw_mesh(patch);
            }
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
                if i % 20 == 0 {
                    let mut tree = av + r * 4.;
                    let ground = t.driving_surface(tree.x, tree.z, i, 0.).height;
                    if details.at(tree.x, tree.z, ground).is_some() {
                        continue;
                    }
                    if !apex_heritage::imagery::forest_at(&photo_areas[ti], tree.x, tree.z)
                        || !t.circle_clear(tree.x, tree.z, 3.)
                        || pit_lane.distance(tree.x, tree.z) < pit_lane.width / 2. + 4.
                    {
                        continue;
                    }
                    if safety.grandstands.iter().any(|s| {
                        apex_heritage::scenery::inside([tree.x, tree.z], &s.footprint)
                            || s.footprint.iter().enumerate().any(|(i, a)| {
                                apex_heritage::scenery::point_segment(
                                    [tree.x, tree.z],
                                    *a,
                                    s.footprint[(i + 1) % s.footprint.len()],
                                ) < 4.
                            })
                    }) {
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
            reference_cars.hide_head = rig.hide_head;
            car(
                p,
                s.yaw,
                s.pitch,
                s.body_roll,
                s.wheel_heights,
                &livery_texture,
                team_color,
                era,
                &mut reference_cars,
                team,
            );
            reference_cars.hide_head = false;
            if s.bottoming > 0.05 && s.speed > 4. {
                for i in 0..7 {
                    let q = i as f32 * 0.71 + get_time() as f32 * 16.;
                    let origin = p + vec3(
                        s.yaw.cos() * q.sin() * 0.4,
                        -0.05 + s.ride_height,
                        -s.yaw.sin() * q.sin() * 0.4,
                    );
                    draw_line_3d(
                        origin,
                        origin
                            - vec3(s.travel_yaw.sin(), -0.07, s.travel_yaw.cos())
                                * s.bottoming
                                * (0.4 + (i % 3) as f32 * 0.2),
                        ORANGE,
                    );
                }
            }
        } else {
            clear_background(Color::from_rgba(24, 31, 36, 255));
            set_camera(&Camera3D {
                position: vec3(7.3, 3.4, 9.4),
                target: vec3(0., 0.4, 0.),
                up: vec3(0., 1., 0.),
                fovy: 34.0_f32.to_radians(),
                viewport: Some((
                    (screen_width() * 0.47).min(680.) as i32,
                    0,
                    (screen_width() - (screen_width() * 0.47).min(680.)) as i32,
                    screen_height() as i32,
                )),
                aspect: Some(
                    (screen_width() - (screen_width() * 0.47).min(680.)) / screen_height(),
                ),
                ..Default::default()
            });
            draw_plane(
                vec3(0., -0.02, 0.),
                vec2(200., 200.),
                None,
                Color::from_rgba(33, 40, 44, 255),
            );
            car(
                vec3(0., 0.1, 0.),
                0.55 + get_time() as f32 * 0.12,
                0.,
                0.,
                [0.; 4],
                &livery_texture,
                team_color,
                era,
                &mut reference_cars,
                team,
            );
        }
        set_default_camera();
        if menu {
            draw_rectangle(
                0.,
                0.,
                (screen_width() * 0.47).min(680.),
                screen_height(),
                Color::new(0.025, 0.03, 0.035, 0.94),
            );
            draw_text("APEX / HERITAGE", 70., 100., 56., WHITE);
            draw_text(
                "THE COLLECTION / 47 CONSTRUCTORS / 4 ERAS",
                72.,
                145.,
                22.,
                ORANGE,
            );
            draw_text(&format!("<  {}  >", t.name), 72., 245., 42., WHITE);
            draw_text(&details.label, 72., 278., 16., ORANGE);
            draw_text(
                &format!(
                    "[E] ERA: {}     [T] TEAM: {}",
                    [
                        "1967 / NO WINGS",
                        "1988 / TURBO",
                        "2004 / V10",
                        "2023 / HYBRID"
                    ][era],
                    format!(
                        "{} {}",
                        apex_heritage::roster::team(era, team).name,
                        apex_heritage::roster::team(era, team).car
                    )
                ),
                72.,
                315.,
                18.,
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
            if s.bottoming > 0.08 {
                draw_text(
                    "FLOOR STRIKE / RAISED KERB",
                    screen_width() / 2. - 190.,
                    120.,
                    26.,
                    ORANGE,
                );
            } else if s.impact > 0.08 {
                draw_text(
                    "BARRIER IMPACT — LAP INVALID",
                    screen_width() / 2. - 220.,
                    80.,
                    26.,
                    ORANGE,
                );
            } else if s.offtrack {
                draw_text("OFF TRACK", screen_width() / 2. - 90., 80., 30., ORANGE);
            }
            if !s.offtrack && s.impact < 0.08 && s.rear_slip > 0.3 {
                draw_text(
                    "REAR GRIP LOSS — EASE THROTTLE / COUNTERSTEER",
                    25.,
                    screen_height() - 79.,
                    18.,
                    ORANGE,
                );
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
                    format!(
                        "C/RB or 1-8: {} · O: pit practice",
                        apex_heritage::cameras::rigs()[camera_mode].label
                    )
                },
                30.,
                177.,
                19.,
                YELLOW,
            );
        }
        if !menu {
            let tuning = camera_controls.tuning(camera_mode);
            draw_rectangle(
                20.,
                screen_height() - 66.,
                1000.,
                49.,
                Color::new(0., 0., 0., 0.65),
            );
            draw_text(
                &format!(
                    "CAM {} | FOV {:.0}{} | Distance {} | {}",
                    apex_heritage::cameras::rigs()[camera_mode].label,
                    tuning
                        .fov
                        .unwrap_or(apex_heritage::cameras::rigs()[camera_mode].fov),
                    if tuning.fov.is_none() { " auto" } else { "" },
                    if apex_heritage::cameras::rigs()[camera_mode].attached {
                        "fixed onboard".into()
                    } else {
                        format!("{:.2}x", tuning.distance)
                    },
                    if camera_controls.saved {
                        "local preferences"
                    } else {
                        "session only: cannot save"
                    }
                ),
                30.,
                screen_height() - 47.,
                16.,
                WHITE,
            );
            draw_text("Right-drag: look | Backspace: center | [ / ]: FOV | Wheel / PgUp,Dn: distance | Home: reset camera",30.,screen_height()-26.,15.,YELLOW);
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

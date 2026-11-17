//! Shared deterministic-ish, fixed-step single-seater driving model.
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
pub mod cameras;
pub mod car_shapes;
pub mod contact;
#[cfg(feature = "native")]
pub mod controller;
pub mod corner;
mod dynamics;
pub mod elevation;
#[cfg(feature = "native")]
pub mod imagery;
#[cfg(feature = "native")]
pub mod livery_assets;
#[cfg(feature = "native")]
pub mod native_audio;
pub mod piscine;
pub mod pit;
pub mod powertrain;
#[cfg(feature = "native")]
pub mod recorded_audio;
pub mod reference_scene;
pub mod roster;
pub mod scenery;
pub mod surface_mesh;
pub mod tyres;
pub mod venue;

#[wasm_bindgen]
pub fn build_version() -> String {
    env!("CARGO_PKG_VERSION").to_owned()
}
#[wasm_bindgen]
pub fn track_data_hash() -> String {
    let hash = include_bytes!("../data/tracks.json")
        .iter()
        .fold(0x811c9dc5u32, |h, b| {
            (h ^ *b as u32).wrapping_mul(0x01000193)
        });
    format!("{hash:08x}")
}
#[derive(Clone, Deserialize)]
pub struct Track {
    pub name: String,
    pub length: f32,
    pub width: f32,
    pub points: Vec<[f32; 2]>,
    pub heights: Vec<f32>,
    pub ground_heights: Vec<f32>,
    #[serde(default)]
    pub terrain: Option<elevation::TerrainGrid>,
}
pub fn tracks() -> Vec<Track> {
    serde_json::from_str(include_str!("../data/tracks.json")).unwrap()
}

#[derive(Clone, Copy, Serialize)]
pub struct CarSpec {
    pub mass: f32,
    pub power: f32,
    pub grip: f32,
    pub aero: f32,
    pub brake: f32,
    pub steer: f32,
    pub drag: f32,
    pub lag: f32,
    pub gears: u32,
}
// Five historically inspired eras; values are gameplay approximations, not telemetry.
pub fn car_spec(era: usize, team: usize) -> CarSpec {
    let mut s = match roster::era_index(era) {
        0 => CarSpec {
            mass: 540.,
            power: 300000.,
            grip: 1.16,
            aero: 0.05,
            brake: 13.,
            steer: 0.50,
            drag: 0.68,
            lag: 0.,
            gears: 5,
        },
        1 => CarSpec {
            mass: 540.,
            power: 500000.,
            grip: 1.50,
            aero: 1.65,
            brake: 21.,
            steer: 0.34,
            drag: 0.73,
            lag: 1.3,
            gears: 6,
        },
        2 => CarSpec {
            mass: 605.,
            power: 660000.,
            grip: 1.75,
            aero: 2.8,
            brake: 30.,
            steer: 0.31,
            drag: 0.86,
            lag: 0.,
            gears: 7,
        },
        4 => CarSpec {
            mass: 752.,
            power: 735000.,
            grip: 1.94,
            aero: 3.8,
            brake: 32.,
            steer: 0.29,
            drag: 0.87,
            lag: 0.18,
            gears: 8,
        },
        _ => CarSpec {
            mass: 798.,
            power: 735000.,
            grip: 1.9,
            aero: 4.1,
            brake: 32.,
            steer: 0.28,
            drag: 0.91,
            lag: 0.2,
            gears: 8,
        },
    };
    let t = roster::team(era, team);
    s.power *= t.power / [410., 680., 900., 1000., 1000.][roster::era_index(era)];
    s.grip *= t.grip / 100.;
    s.brake *= t.brake / 100.;
    if era.min(3) == 1 && !t.turbo {
        s.lag = 0.;
    }
    s
}

#[derive(Default, Clone, Serialize)]
pub struct State {
    pub x: f32,
    pub z: f32,
    pub y: f32,
    pub pitch: f32,
    pub grade: f32,
    pub yaw: f32,
    pub speed: f32,
    pub lateral: f32,
    pub yaw_rate: f32,
    pub steering: f32,
    pub rpm: f32,
    pub shift_cut: f32,
    pub gear: u32,
    pub lap: u32,
    pub elapsed: f32,
    pub lap_time: f32,
    pub best: f32,
    pub last: f32,
    pub progress: f32,
    pub offtrack: bool,
    pub slip: f32,
    pub throttle: f32,
    pub brake: f32,
    pub boost: f32,
    pub invalid: bool,
    pub fuel: f32,
    pub tyre_condition: f32,
    pub pit_requested: bool,
    pub pit_active: bool,
    pub pit_limiter: bool,
    pub pit_phase: u8,
    pub pit_distance: f32,
    pub pit_remaining: f32,
    pub pit_stops: u32,
    pub pit_missed: bool,
    pub impact: f32,
    pub rear_slip: f32,
    pub travel_yaw: f32,
    pub wheels_on_track: u8,
    pub wheel_heights: [f32; 4],
    pub surface_grip: f32,
    pub surface_kind: u8,
    pub heave: f32,
    pub heave_velocity: f32,
    pub body_roll: f32,
    pub kerb_pitch: f32,
    pub ride_height: f32,
    pub kerb_hit: f32,
    pub bottoming: f32,
    pub floor_strike: bool,
}
#[wasm_bindgen]
pub struct Simulation {
    track: Track,
    spec: CarSpec,
    state: State,
    nearest: usize,
    checkpoints: u8,
    wet: bool,
    assists: bool,
    lap_start: f32,
    lap_distance: f32,
    shift_timer: f32,
    era: usize,
    pit: pit::PitLane,
    venue: venue::Venue,
    rear_memory: dynamics::RearMemory,
    details: corner::Details,
}
#[wasm_bindgen]
impl Simulation {
    #[wasm_bindgen(constructor)]
    pub fn new(track_index: usize, era: usize, team: usize, wet: bool, assists: bool) -> Self {
        let ts = tracks();
        let track = ts[track_index.min(ts.len() - 1)].clone();
        let pit = pit::PitLane::new(&track);
        let venue = venue::Venue::for_era(&track.name, era);
        let details = corner::Details::new(&track, era);
        let mut s = Self {
            venue,
            details,
            rear_memory: dynamics::RearMemory::default(),
            pit,
            track,
            spec: car_spec(era, team),
            state: State::default(),
            nearest: 0,
            checkpoints: 0,
            wet,
            assists,
            lap_start: 0.,
            lap_distance: 0.,
            shift_timer: 0.,
            era: roster::era_index(era),
        };
        s.reset();
        s
    }
    pub fn reset(&mut self) {
        let p = self.track.points[0];
        let q = self.track.points[1];
        let yaw = (q[0] - p[0]).atan2(q[1] - p[1]);
        let road = self.track.surface_at(p[0], p[1], 0, yaw);
        self.state = State {
            x: p[0],
            z: p[1],
            y: road.height + 0.1,
            grade: road.grade,
            pitch: -road.grade.atan(),
            yaw,
            travel_yaw: yaw,
            gear: 1,
            rpm: powertrain::idle_rpm(self.spec.gears),
            lap: 1,
            fuel: 1.,
            tyre_condition: 1.,
            surface_grip: 1.,
            wheels_on_track: 4,
            ride_height: corner::ride_height(self.era),
            wheel_heights: [road.height + 0.05; 4],
            ..State::default()
        };
        self.nearest = 0;
        self.checkpoints = 0;
        self.lap_start = 0.;
        self.lap_distance = 0.;
        self.shift_timer = 0.;
        self.rear_memory = dynamics::RearMemory::default();
    }
    pub fn start_pit_practice(&mut self) {
        self.reset();
        self.nearest = self.pit.entry_index.saturating_sub(10);
        self.recover();
        self.state.pit_requested = true;
        self.state.pit_limiter = true;
    }
    pub fn request_pit(&mut self) -> bool {
        if !self.state.pit_active {
            self.state.pit_requested = !self.state.pit_requested;
        }
        self.state.pit_requested
    }
    pub fn toggle_limiter(&mut self) -> bool {
        self.state.pit_limiter = !self.state.pit_limiter;
        self.state.pit_limiter
    }
    pub fn corner_geometry_json(&self) -> String {
        serde_json::to_string(&self.details).unwrap()
    }
    pub fn venue_geometry_json(&self) -> String {
        serde_json::to_string(&self.venue).unwrap()
    }
    pub fn pit_geometry_json(&self) -> String {
        serde_json::to_string(&self.pit).unwrap()
    }
    pub fn recover(&mut self) {
        if self.state.pit_active {
            return;
        }

        let p = self.track.points[self.nearest];
        let q = self.track.points[(self.nearest + 3) % self.track.points.len()];
        self.state.x = p[0];
        self.state.z = p[1];
        self.state.yaw = (q[0] - p[0]).atan2(q[1] - p[1]);
        self.state.travel_yaw = self.state.yaw;
        self.state.rear_slip = 0.;
        self.state.slip = 0.;
        self.state.steering = 0.;
        self.state.impact = 0.;
        self.state.heave = 0.;
        self.state.heave_velocity = 0.;
        self.state.body_roll = 0.;
        self.state.kerb_pitch = 0.;
        self.state.bottoming = 0.;
        self.state.floor_strike = false;
        self.state.kerb_hit = 0.;
        self.state.surface_grip = 1.;
        self.state.wheels_on_track = 4;
        self.rear_memory = dynamics::RearMemory::default();
        self.state.speed = 0.;
        self.state.lateral = 0.;
        self.state.yaw_rate = 0.;
        self.state.gear = 1;
        self.state.rpm = powertrain::idle_rpm(self.spec.gears);
        self.state.shift_cut = 0.;
        self.shift_timer = 0.;
        self.state.invalid = true;
        let road = self
            .track
            .surface_at(p[0], p[1], self.nearest, self.state.yaw);
        self.state.y = road.height + 0.1;
        self.state.grade = road.grade;
        self.state.pitch = -road.grade.atan();
    }
    pub fn step(&mut self, throttle: f32, brake: f32, steer: f32, dt: f32) {
        if !dt.is_finite() || !throttle.is_finite() || !brake.is_finite() || !steer.is_finite() {
            return;
        }
        let dt = dt.clamp(0., 0.05);
        let throttle = throttle.clamp(0., 1.);
        let brake = brake.clamp(0., 1.);
        let steer = steer.clamp(-1., 1.);
        if self.state.pit_requested && !self.state.pit_active {
            let e = self.pit.points[0];
            let distance = (self.state.x - e[0]).hypot(self.state.z - e[2]);
            let (_, yaw, _, _) = self.pit.sample(0., self.track.points.len());
            let along = (self.state.x - e[0]) * yaw.sin() + (self.state.z - e[2]) * yaw.cos();
            if distance < 9. && along >= 0. && (self.state.yaw - yaw).cos() > 0.5 {
                self.state.pit_active = true;
                self.state.pit_phase = 1;
                let along = (self.state.x - e[0]) * yaw.sin() + (self.state.z - e[2]) * yaw.cos();
                self.state.pit_distance = along.max(0.);
                self.state.pit_missed = false;
                self.state.invalid = true;
            }
        }
        if self.state.pit_active {
            self.step_pit(throttle, brake, dt);
            return;
        }
        corner::update_contact(
            &self.track,
            &self.details,
            &mut self.state,
            self.nearest,
            self.era,
            0.,
        );
        if self.state.pit_phase > 0
            && self.pit.distance(self.state.x, self.state.z) < self.pit.width / 2. + 1.
        {
            self.state.surface_grip = 1.;
            self.state.surface_kind = 0;
        }
        let s = &mut self.state;
        let old_position = [s.x, s.z];
        s.impact = (s.impact - dt * 1.5).max(0.);
        let throttle = if s.fuel > 0. { throttle } else { 0. };
        let spec = self.spec;
        let surface = self.track.driving_surface(s.x, s.z, self.nearest, s.yaw);
        let grade = surface.grade;
        let grade_gravity = 9.81 * grade / (1. + grade * grade).sqrt();
        s.elapsed += dt;
        s.lap_time = s.elapsed - self.lap_start;
        let previous_throttle = s.throttle;
        s.throttle = throttle;
        s.brake = brake;
        let classic = self.era == 0;
        let response = if classic { 5.5 } else { 8. };
        s.steering += (steer - s.steering) * (1. - (-dt * response).exp());
        let wet_factor = if self.wet { 0.70 } else { 1. };
        let terrain = s.surface_grip;
        let mechanical = spec.grip * (0.8 + 0.2 * s.tyre_condition) * 9.81
            / (1. + grade * grade).sqrt()
            * wet_factor
            * terrain;
        let aero =
            spec.aero * s.speed * s.speed / spec.mass * wet_factor * (1. - s.bottoming * 0.25);
        let grip = tyres::effective_grip(mechanical, aero);
        let target_boost = if throttle > 0.4 && spec.lag > 0. {
            1.
        } else {
            0.
        };
        s.boost += (target_boost - s.boost) * (dt / (spec.lag + 0.06)).min(1.);
        let power = spec.power
            * (if spec.lag > 0.5 {
                0.42 + 0.58 * s.boost
            } else {
                1.
            });
        let traction = grip * (if self.assists { 0.97 } else { 1.15 });
        let raw_accel = throttle * power * (if self.shift_timer > 0. { 0.16 } else { 1. })
            / (spec.mass * (s.speed + 20.));
        let lateral_use = (s.yaw_rate.abs() * s.speed / grip.max(0.1)).min(0.98);
        let combined = tyres::combined_budget(lateral_use * grip, grip);
        let acceleration = if s.pit_limiter && s.speed >= self.pit.limit {
            0.
        } else {
            raw_accel.min(traction * combined)
        };
        let resistance = spec.drag * s.speed * s.speed / spec.mass
            + 0.30
            + if s.surface_kind == 2 {
                s.speed * 0.22
            } else if s.offtrack {
                s.speed * 0.08
            } else {
                0.
            };
        s.speed = (s.speed
            + (acceleration
                - brake * spec.brake.min(grip * 1.15) * combined
                - resistance
                - grade_gravity)
                * dt)
            .max(0.);
        let max_angle = spec.steer / (1. + s.speed * if classic { 0.045 } else { 0.038 });
        let desired_yaw = s.speed
            / crate::car_shapes::layout(self.era).map_or(3.1, |l| l.front - l.rear)
            * (s.steering * max_angle).tan();
        dynamics::advance(
            s,
            &mut self.rear_memory,
            dynamics::RearInput {
                grip,
                desired_yaw,
                raw_accel,
                throttle,
                brake,
                previous_throttle,
                classic,
                assists: self.assists,
            },
            dt,
        );
        s.x += s.travel_yaw.sin() * s.speed * dt;
        s.z += s.travel_yaw.cos() * s.speed * dt;
        if let Some(hit) = self.venue.collide(
            old_position,
            [s.x, s.z],
            [s.travel_yaw.sin() * s.speed, s.travel_yaw.cos() * s.speed],
        ) {
            s.x = hit.position[0];
            s.z = hit.position[1];
            s.speed = hit.velocity[0].hypot(hit.velocity[1]);
            if s.speed > 0.05 {
                s.travel_yaw = hit.velocity[0].atan2(hit.velocity[1]);
            }
            s.lateral = -s.speed * dynamics::angle(s.yaw - s.travel_yaw).sin();
            s.yaw_rate *= 0.3;
            if hit.strength > 1. {
                s.impact = (hit.strength / 25.).min(1.);
                s.invalid = true;
            }
        }
        powertrain::update_engine(s, spec.gears, &mut self.shift_timer, dt);
        let n = self.track.points.len();
        let old = self.nearest;
        // Local nearest-point search preserves the correct branch at Suzuka's crossover.
        let radius = 35_i32;
        let mut best = f32::MAX;
        let mut idx = old;
        for offset in -radius..=radius {
            let i = (old as i32 + offset).rem_euclid(n as i32) as usize;
            let p = self.track.points[i];
            let d = (p[0] - s.x).powi(2) + (p[1] - s.z).powi(2);
            if d < best {
                best = d;
                idx = i;
            }
        }
        self.nearest = idx;
        corner::update_contact(&self.track, &self.details, s, idx, self.era, dt);
        if s.offtrack {
            s.invalid = true;
        }
        let road = self.track.surface_at(s.x, s.z, idx, s.yaw);
        s.progress = road.progress;
        let driving = self.track.driving_surface(s.x, s.z, idx, s.yaw);
        s.grade = driving.grade;
        s.pitch = -driving.grade.atan() + s.kerb_pitch;
        s.fuel = (s.fuel - dt * (0.00015 + throttle * 0.0004)).max(0.);
        s.tyre_condition = (s.tyre_condition - dt * (0.00022 + s.slip * 0.0008)).max(0.);
        self.advance_lap(idx, old);
    }

    pub fn state_json(&self) -> String {
        serde_json::to_string(&self.state).unwrap()
    }
    pub fn spec_json(&self) -> String {
        serde_json::to_string(&self.spec).unwrap()
    }
}
impl Simulation {
    fn advance_lap(&mut self, idx: usize, old: usize) {
        let n = self.track.points.len();
        let s = &mut self.state;
        let delta = (idx as i32 - old as i32 + n as i32 / 2).rem_euclid(n as i32) - n as i32 / 2;
        if delta > 0 && !s.offtrack {
            self.lap_distance += delta as f32 / n as f32;
        }
        if s.progress > 0.23 && s.progress < 0.30 {
            self.checkpoints |= 1;
        }
        if s.progress > 0.48 && s.progress < 0.55 && self.checkpoints & 1 != 0 {
            self.checkpoints |= 2;
        }
        if s.progress > 0.73 && s.progress < 0.80 && self.checkpoints & 2 != 0 {
            self.checkpoints |= 4;
        }
        if old > n * 9 / 10
            && idx < n / 10
            && self.checkpoints == 7
            && self.lap_distance > 0.90
            && s.speed > 1.
        {
            s.last = s.lap_time;
            if !s.invalid && (s.best == 0. || s.last < s.best) {
                s.best = s.last;
            }
            s.lap += 1;
            self.lap_start = s.elapsed;
            self.checkpoints = 0;
            self.lap_distance = 0.;
            s.invalid = false;
        }
    }
    fn step_pit(&mut self, throttle: f32, brake: f32, dt: f32) {
        let old = self.nearest;
        let s = &mut self.state;
        s.elapsed += dt;
        s.lap_time = s.elapsed - self.lap_start;
        s.invalid = true;
        s.offtrack = false;
        s.wheels_on_track = 4;
        s.surface_grip = 1.;
        s.surface_kind = 0;
        s.heave = 0.;
        s.heave_velocity = 0.;
        s.body_roll = 0.;
        s.kerb_pitch = 0.;
        s.bottoming = 0.;
        s.floor_strike = false;
        s.kerb_hit = 0.;
        s.slip = 0.;
        s.rear_slip = 0.;
        s.impact = 0.;
        self.rear_memory = dynamics::RearMemory::default();
        s.lateral = 0.;
        s.yaw_rate = 0.;
        s.steering = 0.;
        if s.pit_phase == 2 {
            s.speed = 0.;
            s.throttle = 0.;
            s.brake = 1.;
            s.pit_remaining = (s.pit_remaining - dt).max(0.);
            if s.pit_remaining <= 0. {
                s.tyre_condition = 1.;
                if pit::refuelling_allowed(self.era) {
                    s.fuel = 1.;
                }
                s.pit_stops += 1;
                s.pit_phase = 3;
            }
        } else {
            let throttle = if s.fuel > 0. { throttle } else { 0. };
            s.throttle = throttle;
            s.brake = brake;
            let accel = if s.pit_limiter && s.speed >= self.pit.limit {
                0.
            } else {
                throttle * 6.
            };
            s.speed = (s.speed + (accel - brake * 12. - 0.5) * dt).max(0.);
            s.pit_distance = (s.pit_distance + s.speed * dt).min(self.pit.length);
            let box_error = (s.pit_distance - self.pit.box_distance).abs();
            if s.pit_phase == 1 && box_error < 1.75 && s.speed < 0.7 {
                s.pit_phase = 2;
                s.speed = 0.;
                s.pit_remaining = [12., 7., 4., 2.8, 2.8][self.era];
                if pit::refuelling_allowed(self.era) {
                    s.pit_remaining = s
                        .pit_remaining
                        .max((1. - s.fuel) * [18., 0., 12., 0., 0.][self.era]);
                }
            } else if s.pit_phase == 1 && s.pit_distance > self.pit.box_distance + 1.75 {
                s.pit_missed = true;
                s.pit_phase = 3;
            }
            s.fuel = (s.fuel - dt * (0.00015 + throttle * 0.0004)).max(0.);
        }
        let (p, yaw, grade, idx) = self.pit.sample(s.pit_distance, self.track.points.len());
        s.x = p[0];
        s.y = p[1] + 0.1;
        s.wheel_heights = [p[1] + 0.05; 4];
        s.z = p[2];
        s.yaw = yaw;
        s.travel_yaw = yaw;
        s.grade = grade;
        s.pitch = -grade.atan();
        s.progress = idx as f32 / self.track.points.len() as f32;
        powertrain::update_engine(s, self.spec.gears, &mut self.shift_timer, dt);
        self.nearest = idx;
        self.advance_lap(idx, old);
        if self.state.pit_distance >= self.pit.length {
            self.state.pit_active = false;
            self.state.pit_requested = false;
            self.state.pit_phase = 0;
            self.state.pit_limiter = false;
            self.state.invalid = true;
        }
    }
}
impl Simulation {
    pub fn state(&self) -> &State {
        &self.state
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn classic_is_progressive_has_hairpin_lock_and_keeps_era_identity() {
        let mut sim = Simulation::new(1, 0, 0, false, false);
        sim.state.speed = 8.;
        sim.step(0., 0., 1., 1. / 120.);
        assert!(sim.state.steering > 0. && sim.state.steering < 0.06);
        assert!(sim.state.yaw_rate.abs() < 0.1);
        for _ in 0..60 {
            sim.step(0.2, 0., 1., 1. / 120.);
        }
        assert!(sim.state.yaw_rate > 0.2);
        assert!(sim.state.slip.is_finite());
        assert!(car_spec(0, 0).grip < car_spec(2, 0).grip);
        assert!(car_spec(0, 0).aero < 0.1);
        sim.recover();
        assert_eq!(sim.state.yaw_rate, 0.);
    }
    #[test]
    fn pit_stops_enter_service_and_exit_in_all_eras() {
        for circuit in 0..10 {
            for era in 0..5 {
                let mut sim = Simulation::new(circuit, era, 0, false, true);
                let e = sim.pit.points[0];
                let (_, yaw, _, _) = sim.pit.sample(0., sim.track.points.len());
                sim.state.x = e[0];
                sim.state.z = e[2];
                sim.state.yaw = yaw;
                sim.nearest = sim.pit.entry_index;
                sim.state.fuel = 0.4;
                sim.state.tyre_condition = 0.3;
                sim.request_pit();
                sim.toggle_limiter();
                for _ in 0..12000 {
                    let remaining = sim.pit.box_distance - sim.state.pit_distance;
                    let target = (2. * 8. * (remaining - 0.3).max(0.)).sqrt().min(15.);
                    let speed = sim.state.speed;
                    sim.step(
                        if speed < target - 0.1 { 1. } else { 0. },
                        if speed > target + 0.1 { 1. } else { 0. },
                        0.,
                        1. / 120.,
                    );
                    assert!(sim.state.speed <= sim.pit.limit + 0.1);
                    if sim.state.pit_phase == 2 {
                        break;
                    }
                }
                assert_eq!(
                    sim.state.pit_phase, 2,
                    "era {era}, distance {} box {}",
                    sim.state.pit_distance, sim.pit.box_distance
                );
                let before = sim.state.pit_remaining;
                sim.step(1., 0., 0., 0.);
                assert_eq!(sim.state.pit_remaining, before);
                for _ in 0..3000 {
                    sim.step(1., 0., 0., 1. / 120.);
                    if sim.state.pit_phase == 3 {
                        break;
                    }
                }
                assert_eq!(sim.state.pit_stops, 1);
                assert_eq!(sim.state.tyre_condition, 1.);
                assert_eq!(sim.state.speed, 0.);
                if pit::refuelling_allowed(era) {
                    assert_eq!(sim.state.fuel, 1.);
                } else {
                    assert!(sim.state.fuel < 0.4);
                }
                for _ in 0..12000 {
                    sim.step(1., 0., 0., 1. / 120.);
                    if !sim.state.pit_active {
                        break;
                    }
                }
                assert!(!sim.state.pit_active && !sim.state.pit_requested);
                assert!(sim.state.invalid);
                assert_eq!(sim.state.pit_stops, 1);
            }
        }
    }
    #[test]
    fn missed_box_does_not_award_free_service_and_recover_does_not_bypass_pits() {
        let mut s = Simulation::new(1, 2, 0, false, true);
        s.state.pit_active = true;
        s.state.pit_phase = 1;
        s.state.pit_distance = s.pit.box_distance + 4.;
        s.state.speed = 10.;
        s.recover();
        assert!(s.state.pit_active);
        s.step(1., 0., 0., 1. / 120.);
        assert!(s.state.pit_missed);
        assert_eq!(s.state.pit_stops, 0);
    }
    #[test]
    fn ten_tracks_are_closed_and_sensible() {
        let t = tracks();
        assert_eq!(t.len(), 10);
        for x in t {
            assert!(x.points.len() > 400);
            assert!(x.length > 3000.);
            let p = x.points[0];
            let q = x.points[x.points.len() - 1];
            assert!((p[0] - q[0]).hypot(p[1] - q[1]) < 20.);
        }
    }
    #[test]
    fn every_era_and_team_has_distinct_power() {
        for e in 0..5 {
            for t in 1..4 {
                assert_ne!(car_spec(e, 0).power, car_spec(e, t).power)
            }
        }
    }
    #[test]
    fn acceleration_and_braking() {
        let mut s = Simulation::new(0, 2, 0, false, true);
        for _ in 0..180 {
            s.step(1., 0., 0., 1. / 120.);
        }
        let v = s.state.speed;
        assert!(v > 10.);
        for _ in 0..120 {
            s.step(0., 1., 0., 1. / 120.);
        }
        assert!(s.state.speed < v);
    }
    #[test]
    fn reset_and_recover() {
        let mut s = Simulation::new(1, 0, 2, true, false);
        s.step(1., 0., 1., 0.016);
        s.recover();
        assert!(s.state.invalid);
        assert_eq!(s.state.speed, 0.);
        s.reset();
        assert_eq!(s.state.lap, 1);
        assert!(!s.state.invalid);
    }
    #[test]
    fn actual_simulation_hits_barriers_instead_of_crossing_them() {
        for track in 0..10 {
            let mut sim = Simulation::new(track, 2, 0, false, true);
            let b = sim.venue.barriers[0].clone();
            let dx = b.b[0] - b.a[0];
            let dz = b.b[1] - b.a[1];
            let length = dx.hypot(dz);
            let normal = [dz / length, -dx / length];
            let mid = [(b.a[0] + b.b[0]) / 2., (b.a[1] + b.b[1]) / 2.];
            sim.state.x = mid[0] + normal[0] * 4.;
            sim.state.z = mid[1] + normal[1] * 4.;
            sim.state.yaw = (-normal[0]).atan2(-normal[1]);
            sim.state.travel_yaw = sim.state.yaw;
            sim.state.speed = 100.;
            sim.step(0., 0., 0., 0.05);
            assert!(sim.state.impact > 0.5, "track {track}");
            assert!(sim.state.invalid);
            assert!(sim.state.speed < 15.);
            assert!(
                (sim.state.x - mid[0]) * normal[0] + (sim.state.z - mid[1]) * normal[1]
                    >= b.radius + 0.99
            );
        }
    }
    #[test]
    fn actual_simulation_transmits_slides_and_recover_resets_velocity_heading() {
        for era in 0..5 {
            let mut sim = Simulation::new(0, era, 0, false, false);
            let p = sim.track.points[0];
            // A fixed-speed on-road handling rig: hold position at the same
            // road station so walls/runoff cannot confound rear-axle dynamics.
            let mut peak = 0.0_f32;
            for _ in 0..300 {
                sim.state.x = p[0];
                sim.state.z = p[1];
                sim.state.speed = 30.;
                sim.step(1., 0.9, 1., 1. / 120.);
                peak = peak.max(dynamics::angle(sim.state.yaw - sim.state.travel_yaw).abs());
            }
            assert!(peak > 1.2, "era {era}, slip angle {peak}");
            sim.recover();
            assert_eq!(sim.state.travel_yaw, sim.state.yaw);
            assert_eq!(sim.state.rear_slip, 0.);
            assert_eq!(sim.state.yaw_rate, 0.);
            sim.reset();
            assert_eq!(sim.state.travel_yaw, sim.state.yaw);
            assert_eq!(sim.state.rear_slip, 0.);
        }
    }
    #[test]
    fn rejects_nan_input() {
        let mut s = Simulation::new(0, 0, 0, false, false);
        s.step(f32::NAN, 0., 0., 1.);
        assert_eq!(s.state.elapsed, 0.);
    }
    #[test]
    fn no_lap_from_standing_still() {
        let mut s = Simulation::new(0, 3, 0, false, true);
        for _ in 0..1000 {
            s.step(0., 0., 0., 0.016);
        }
        assert_eq!(s.state.lap, 1);
    }
    #[test]
    fn checkpoint_order_registers_a_complete_lap() {
        let mut s = Simulation::new(0, 2, 0, false, true);
        let n = s.track.points.len();
        for j in 0..=n {
            let i = j % n;
            let p = s.track.points[i];
            let q = s.track.points[(i + 1) % n];
            s.state.x = p[0];
            s.state.z = p[1];
            s.state.yaw = (q[0] - p[0]).atan2(q[1] - p[1]);
            s.state.speed = 3.;
            s.step(0., 0., 0., 0.01);
        }
        assert_eq!(s.state.lap, 2);
        assert!(s.state.best > 1.);
    }
    #[test]
    fn reversing_does_not_register_a_lap() {
        let mut s = Simulation::new(0, 2, 0, false, true);
        let n = s.track.points.len();
        for j in (0..n).rev() {
            let p = s.track.points[j];
            s.state.x = p[0];
            s.state.z = p[1];
            s.state.speed = 3.;
            s.step(0., 0., 0., 0.01);
        }
        assert_eq!(s.state.lap, 1);
        assert_eq!(s.state.best, 0.);
    }
    #[test]
    fn wet_weather_reduces_braking_grip() {
        let mut dry = Simulation::new(0, 3, 0, false, true);
        let mut wet = Simulation::new(0, 3, 0, true, true);
        dry.state.speed = 40.;
        wet.state.speed = 40.;
        dry.step(0., 1., 0., 0.05);
        wet.step(0., 1., 0., 0.05);
        assert!(wet.state.speed > dry.state.speed);
    }
    #[test]
    fn turbo_boost_builds_over_time() {
        let mut s = Simulation::new(0, 1, 0, false, true);
        s.step(1., 0., 0., 0.05);
        let early = s.state.boost;
        for _ in 0..60 {
            s.step(1., 0., 0., 0.05);
        }
        assert!(early < 0.1);
        assert!(s.state.boost > 0.8);
    }
    #[test]
    fn simulation_only_invalidates_when_all_four_patches_leave_the_track() {
        let mut sim = Simulation::new(0, 2, 0, false, true);
        sim.track = Track {
            name: "straight test".into(),
            ground_heights: vec![0.; 7],
            length: 600.,
            width: 10.,
            points: vec![
                [100000., 99900.],
                [100000., 99950.],
                [100000., 100000.],
                [100000., 100050.],
                [100000., 100100.],
                [100100., 100100.],
                [100100., 99900.],
            ],
            heights: vec![0.; 7],
            terrain: None,
        };
        sim.nearest = 2;
        sim.state.x = 100005.;
        sim.state.z = 100000.;
        sim.state.yaw = 0.;
        sim.state.travel_yaw = 0.;
        sim.state.speed = 0.;
        sim.state.invalid = false;
        sim.step(1. / 120., 0., 0., 0.);
        assert_eq!(sim.state.wheels_on_track, 2);
        assert!(!sim.state.offtrack);
        assert!(!sim.state.invalid);
        assert!(sim.state.surface_grip < 0.95);
        sim.state.x = 100007.;
        sim.step(1. / 120., 0., 0., 0.);
        assert_eq!(sim.state.wheels_on_track, 0);
        assert!(sim.state.offtrack);
        assert!(sim.state.invalid);
    }
}

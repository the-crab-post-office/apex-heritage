//! Shared deterministic-ish, fixed-step single-seater driving model.
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Clone, Deserialize)]
pub struct Track {
    pub name: String,
    pub length: f32,
    pub width: f32,
    pub points: Vec<[f32; 2]>,
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
// Four historically inspired eras; values are gameplay approximations, not telemetry.
pub fn car_spec(era: usize, team: usize) -> CarSpec {
    let mut s = match era.min(3) {
        0 => CarSpec {
            mass: 540.,
            power: 300000.,
            grip: 1.05,
            aero: 0.05,
            brake: 13.,
            steer: 0.42,
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
    // Each era has an independently tuned field; teams indexed in UI order.
    let modifiers = match era.min(3) {
        0 => [
            (1.0, 1.0, 1.0),
            (0.94, 0.96, 1.03),
            (0.9, 0.94, 0.98),
            (0.97, 0.90, 0.94),
        ],
        1 => [
            (1.0, 1.0, 1.0),
            (0.94, 0.95, 1.04),
            (0.84, 0.96, 0.98),
            (0.88, 0.90, 0.96),
        ],
        2 => [
            (1.0, 1.0, 1.0),
            (0.98, 0.96, 1.02),
            (0.94, 0.98, 0.97),
            (0.96, 0.93, 0.95),
        ],
        _ => [
            (1.0, 1.0, 1.0),
            (0.97, 0.96, 1.01),
            (0.98, 0.94, 1.03),
            (0.95, 0.95, 0.98),
        ],
    };
    let (p, g, b) = modifiers[team.min(3)];
    s.power *= p;
    s.grip *= g;
    s.brake *= b;
    s
}

#[derive(Default, Clone, Serialize)]
pub struct State {
    pub x: f32,
    pub z: f32,
    pub yaw: f32,
    pub speed: f32,
    pub lateral: f32,
    pub steering: f32,
    pub rpm: f32,
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
}
#[wasm_bindgen]
impl Simulation {
    #[wasm_bindgen(constructor)]
    pub fn new(track_index: usize, era: usize, team: usize, wet: bool, assists: bool) -> Self {
        let ts = tracks();
        let track = ts[track_index.min(ts.len() - 1)].clone();
        let mut s = Self {
            track,
            spec: car_spec(era, team),
            state: State::default(),
            nearest: 0,
            checkpoints: 0,
            wet,
            assists,
            lap_start: 0.,
            lap_distance: 0.,
        };
        s.reset();
        s
    }
    pub fn reset(&mut self) {
        let p = self.track.points[0];
        let q = self.track.points[1];
        self.state = State {
            x: p[0],
            z: p[1],
            yaw: (q[0] - p[0]).atan2(q[1] - p[1]),
            gear: 1,
            lap: 1,
            ..State::default()
        };
        self.nearest = 0;
        self.checkpoints = 0;
        self.lap_start = 0.;
        self.lap_distance = 0.;
    }
    pub fn recover(&mut self) {
        let p = self.track.points[self.nearest];
        let q = self.track.points[(self.nearest + 3) % self.track.points.len()];
        self.state.x = p[0];
        self.state.z = p[1];
        self.state.yaw = (q[0] - p[0]).atan2(q[1] - p[1]);
        self.state.speed = 0.;
        self.state.lateral = 0.;
        self.state.invalid = true;
    }
    pub fn step(&mut self, throttle: f32, brake: f32, steer: f32, dt: f32) {
        if !dt.is_finite() || !throttle.is_finite() || !brake.is_finite() || !steer.is_finite() {
            return;
        }
        let dt = dt.clamp(0., 0.05);
        let throttle = throttle.clamp(0., 1.);
        let brake = brake.clamp(0., 1.);
        let steer = steer.clamp(-1., 1.);
        let s = &mut self.state;
        let spec = self.spec;
        s.elapsed += dt;
        s.lap_time = s.elapsed - self.lap_start;
        s.throttle = throttle;
        s.brake = brake;
        s.steering += (steer - s.steering) * (dt * 8.).min(1.);
        let wet_factor = if self.wet { 0.70 } else { 1. };
        let terrain = if s.offtrack { 0.48 } else { 1. };
        let grip = spec.grip * 9.81 * wet_factor * terrain
            + spec.aero * s.speed * s.speed / spec.mass * wet_factor;
        let target_boost = if throttle > 0.4 { 1. } else { 0. };
        s.boost += (target_boost - s.boost) * (dt / (spec.lag + 0.06)).min(1.);
        let power = spec.power
            * (if spec.lag > 0.5 {
                0.42 + 0.58 * s.boost
            } else {
                1.
            });
        let traction = grip * (if self.assists { 0.97 } else { 1.15 });
        let raw_accel = throttle * power / (spec.mass * (s.speed + 20.));
        let acceleration = raw_accel.min(traction);
        let resistance = spec.drag * s.speed * s.speed / spec.mass
            + 0.30
            + if s.offtrack { s.speed * 0.12 } else { 0. };
        s.speed = (s.speed + (acceleration - brake * spec.brake.min(grip * 1.5) - resistance) * dt)
            .max(0.);
        let max_angle = spec.steer / (1. + s.speed * 0.038);
        let desired_yaw = s.speed / 3.1 * (s.steering * max_angle).tan();
        let max_yaw = grip / s.speed.max(1.);
        let yaw_rate = desired_yaw.clamp(-max_yaw, max_yaw);
        s.slip = ((desired_yaw.abs() - max_yaw).max(0.) * 1.5
            + if self.assists {
                0.
            } else {
                (raw_accel - traction).max(0.) * 0.03
            })
        .min(1.);
        s.yaw += yaw_rate * dt;
        let lateral_target = if self.assists {
            0.
        } else {
            -(desired_yaw - yaw_rate) * s.speed * 0.12
        };
        s.lateral += (lateral_target - s.lateral) * (dt * 4.).min(1.);
        s.x += (s.yaw.sin() * s.speed + s.yaw.cos() * s.lateral) * dt;
        s.z += (s.yaw.cos() * s.speed - s.yaw.sin() * s.lateral) * dt;
        s.gear = ((s.speed * 3.6 / (if spec.gears == 5 { 53. } else { 47. })) as u32 + 1)
            .min(spec.gears);
        let peak = if spec.gears == 7 {
            19000.
        } else if spec.gears == 5 {
            10000.
        } else {
            12500.
        };
        s.rpm = (0.45 + (s.speed * 3.6 % 47.) / 47. * 0.55) * peak;
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
        s.offtrack = best.sqrt() > self.track.width * 0.5;
        if best.sqrt() > self.track.width * 0.5 + 5. {
            s.invalid = true;
        }
        s.progress = idx as f32 / n as f32;
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
    pub fn state_json(&self) -> String {
        serde_json::to_string(&self.state).unwrap()
    }
    pub fn spec_json(&self) -> String {
        serde_json::to_string(&self.spec).unwrap()
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
        for e in 0..4 {
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
}

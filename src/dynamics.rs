//! Deterministic progressive rear breakaway, not random scripted spins.
//! A small combined-load margin and a build-up time make ordinary steering
//! safe. Sustained power/braking at the lateral limit can exceed rear grip.
use crate::State;
#[derive(Default)]
pub struct RearMemory {
    lift: f32,
}
pub struct RearInput {
    pub grip: f32,
    pub desired_yaw: f32,
    pub raw_accel: f32,
    pub throttle: f32,
    pub brake: f32,
    pub previous_throttle: f32,
    pub classic: bool,
    pub assists: bool,
}
pub fn angle(a: f32) -> f32 {
    a.sin().atan2(a.cos())
}
pub fn advance(s: &mut State, m: &mut RearMemory, i: RearInput, dt: f32) {
    let max_yaw = i.grip / s.speed.max(1.);
    let target = i.desired_yaw.clamp(-max_yaw, max_yaw);
    let lateral = (target.abs() / max_yaw.max(0.001)).min(1.);
    m.lift = (m.lift * (-dt / 0.38).exp()).max((i.previous_throttle - i.throttle).max(0.));
    let speed_gate = ((s.speed - 5.) / 9.).clamp(0., 1.);
    let rear_load = crate::tyres::rear_load_factor(
        i.brake * i.grip,
        i.raw_accel.min(i.grip),
        s.speed,
        if i.classic { 2.22 } else { 3.6 },
    );
    let longitudinal = ((i.raw_accel / (i.grip * rear_load).max(0.1)).min(2.) * 0.45
        + i.brake * 0.65
        + m.lift * if i.classic { 0.35 } else { 0.22 })
        * if i.assists { 0.8 } else { 1. };
    let demand = lateral * lateral + longitudinal * longitudinal;
    let target_slip =
        ((demand - if i.assists { 1.30 } else { 1.17 }) * 2.4).clamp(0., 1.) * speed_gate;
    let beta = angle(s.yaw - s.travel_yaw);
    let counter = if beta.abs() > 0.12 && target * beta < 0. {
        lateral
    } else {
        0.
    };
    let response = if target_slip > s.rear_slip {
        0.65
    } else if i.assists {
        0.36
    } else {
        0.52
    };
    s.rear_slip += (target_slip - s.rear_slip) * (1. - (-dt / response).exp());
    if counter > 0. && i.throttle < 0.5 {
        s.rear_slip *= (-dt * counter * 1.8).exp();
    }
    let direction = if beta.abs() > 0.15 {
        beta.signum()
    } else {
        target.signum()
    };
    let extra_yaw = direction * s.rear_slip.powf(1.35) * 1.8 * speed_gate * (1. - counter * 0.75);
    let yaw_target = target + extra_yaw;
    let yaw_time = if i.classic { 0.12 } else { 0.065 };
    s.yaw_rate += (yaw_target - s.yaw_rate) * (1. - (-dt / yaw_time).exp());
    if s.speed < 0.5 {
        s.yaw_rate *= (-dt * 12.).exp();
    }
    s.yaw += s.yaw_rate * dt;
    // Ground velocity cannot rotate with the spinning chassis. Its heading is
    // limited by remaining tyre force; removing the old body-yaw clamp alone
    // would merely make a tighter arcade turn instead of producing a spin.
    let follow = angle(s.yaw - s.travel_yaw) * (9. - s.rear_slip * 6.5);
    let velocity_limit = max_yaw * (1. - s.rear_slip * 0.40);
    s.travel_yaw += follow.clamp(-velocity_limit, velocity_limit) * dt;
    let beta = angle(s.yaw - s.travel_yaw);
    let sliding = beta.sin().abs();
    s.speed *= (-dt * sliding * (0.32 + s.rear_slip * 0.9)).exp();
    s.lateral = -s.speed * beta.sin();
    s.slip = ((i.desired_yaw.abs() - max_yaw).max(0.) * 1.5)
        .max(s.rear_slip)
        .max(sliding)
        .min(1.);
}
#[cfg(test)]
mod tests {
    use super::*;
    fn scenario(classic: bool, assists: bool, brake: f32, throttle: f32, seconds: f32) -> State {
        let mut s = State {
            speed: 32.,
            ..State::default()
        };
        let mut m = RearMemory::default();
        for _ in 0..(seconds * 120.) as usize {
            s.speed = 32.;
            advance(
                &mut s,
                &mut m,
                RearInput {
                    grip: 16.,
                    desired_yaw: 0.8,
                    raw_accel: throttle * 24.,
                    throttle,
                    brake,
                    previous_throttle: throttle,
                    classic,
                    assists,
                },
                1. / 120.,
            );
        }
        s
    }
    #[test]
    fn straight_acceleration_and_normal_corners_never_trigger_rear_loss() {
        for classic in [false, true] {
            for assists in [false, true] {
                let mut s = State {
                    speed: 35.,
                    ..State::default()
                };
                let mut m = RearMemory::default();
                for _ in 0..1200 {
                    advance(
                        &mut s,
                        &mut m,
                        RearInput {
                            grip: 20.,
                            desired_yaw: 0.24,
                            raw_accel: 6.,
                            throttle: 0.35,
                            brake: 0.,
                            previous_throttle: 0.35,
                            classic,
                            assists,
                        },
                        1. / 120.,
                    );
                    s.speed = 35.;
                }
                assert!(s.rear_slip < 0.001);
                assert!(angle(s.yaw - s.travel_yaw).abs() < 0.06);
                s.yaw = 0.;
                s.travel_yaw = 0.;
                s.yaw_rate = 0.;
                for _ in 0..600 {
                    advance(
                        &mut s,
                        &mut m,
                        RearInput {
                            grip: 20.,
                            desired_yaw: 0.,
                            raw_accel: 35.,
                            throttle: 1.,
                            brake: 0.,
                            previous_throttle: 1.,
                            classic,
                            assists,
                        },
                        1. / 120.,
                    );
                }
                assert_eq!(s.rear_slip, 0.);
                assert_eq!(s.yaw, 0.);
            }
        }
    }
    #[test]
    fn sustained_compound_mistakes_can_spin_but_a_brief_input_cannot() {
        let brief = scenario(true, false, 0.8, 1., 0.1);
        assert!(brief.rear_slip < 0.15);
        assert!(angle(brief.yaw - brief.travel_yaw).abs() < 0.1);
        for classic in [false, true] {
            let sustained = scenario(classic, false, 0.8, 1., 2.0);
            assert!(
                angle(sustained.yaw - sustained.travel_yaw).abs() > 1.2,
                "{}",
                angle(sustained.yaw - sustained.travel_yaw)
            );
        }
    }
    #[test]
    fn assists_reduce_but_do_not_magic_away_compound_mistakes() {
        let off = scenario(false, false, 0.6, 0.8, 1.5);
        let on = scenario(false, true, 0.6, 0.8, 1.5);
        assert!(on.rear_slip < off.rear_slip * 0.7);
        let severe = scenario(false, true, 1., 1., 2.5);
        assert!(angle(severe.yaw - severe.travel_yaw).abs() > 1.2);
    }
    #[test]
    fn lifting_and_countersteering_catch_a_developing_slide() {
        let initial = scenario(true, false, 0.65, 1., 0.8);
        let mut recovered = initial.clone();
        let mut neglected = initial;
        let mut mr = RearMemory::default();
        let mut mn = RearMemory::default();
        for _ in 0..120 {
            for (s, m, recover) in [
                (&mut recovered, &mut mr, true),
                (&mut neglected, &mut mn, false),
            ] {
                s.speed = 32.;
                let steer = if recover {
                    -angle(s.yaw - s.travel_yaw).clamp(-0.5, 0.5)
                } else {
                    0.8
                };
                advance(
                    s,
                    m,
                    RearInput {
                        grip: 16.,
                        desired_yaw: steer,
                        raw_accel: if recover { 0. } else { 24. },
                        throttle: if recover { 0. } else { 1. },
                        brake: 0.,
                        previous_throttle: 0.,
                        classic: true,
                        assists: false,
                    },
                    1. / 120.,
                );
            }
        }
        assert!(recovered.rear_slip < 0.05);
        assert!(
            angle(recovered.yaw - recovered.travel_yaw).abs()
                < angle(neglected.yaw - neglected.travel_yaw).abs() * 0.55
        );
    }
    #[test]
    fn breakaway_is_consistent_at_public_api_frame_rates() {
        let mut angles = Vec::new();
        for hz in [20, 30, 60, 120, 240] {
            let mut s = State {
                speed: 32.,
                ..State::default()
            };
            let mut m = RearMemory::default();
            for _ in 0..hz * 2 {
                s.speed = 32.;
                advance(
                    &mut s,
                    &mut m,
                    RearInput {
                        grip: 16.,
                        desired_yaw: 0.8,
                        raw_accel: 24.,
                        throttle: 1.,
                        brake: 0.8,
                        previous_throttle: 1.,
                        classic: true,
                        assists: false,
                    },
                    1. / hz as f32,
                );
            }
            angles.push(angle(s.yaw - s.travel_yaw).abs());
        }
        let min = angles.iter().copied().fold(f32::INFINITY, f32::min);
        let max = angles.iter().copied().fold(0.0_f32, f32::max);
        assert!(max - min < 0.12, "{angles:?}");
    }
    #[test]
    fn wet_grip_builds_more_rear_loss_for_the_same_inputs() {
        let mut dry = State {
            speed: 25.,
            ..State::default()
        };
        let mut wet = dry.clone();
        let (mut md, mut mw) = (RearMemory::default(), RearMemory::default());
        for _ in 0..120 {
            for (s, m, grip) in [(&mut dry, &mut md, 22.), (&mut wet, &mut mw, 15.)] {
                s.speed = 25.;
                advance(
                    s,
                    m,
                    RearInput {
                        grip,
                        desired_yaw: 1.,
                        raw_accel: 20.,
                        throttle: 1.,
                        brake: 0.3,
                        previous_throttle: 1.,
                        classic: true,
                        assists: false,
                    },
                    1. / 120.,
                );
            }
        }
        assert!(wet.rear_slip > dry.rear_slip + 0.15);
    }
}

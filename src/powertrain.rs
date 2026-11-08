//! Automatic ratios and continuous RPM for drivetrain response and audio telemetry.
use crate::State;
pub fn peak_rpm(gears: u32) -> f32 {
    match gears {
        5 => 10000.,
        7 => 19000.,
        _ => 12500.,
    }
}
pub fn idle_rpm(gears: u32) -> f32 {
    match gears {
        5 => 2400.,
        6 => 3600.,
        7 => 4600.,
        _ => 3500.,
    }
}
pub fn gear_tops(gears: u32) -> &'static [f32] {
    match gears {
        5 => &[88., 133., 174., 218., 270.],
        6 => &[95., 143., 190., 235., 281., 329.],
        7 => &[89., 130., 169., 208., 246., 287., 335.],
        _ => &[85., 122., 158., 197., 234., 270., 308., 350.],
    }
}
pub fn update_engine(s: &mut State, gears: u32, shift_timer: &mut f32, dt: f32) {
    let peak = peak_rpm(gears);
    let idle = idle_rpm(gears);
    let tops = gear_tops(gears);
    let kmh = s.speed * 3.6;
    *shift_timer = (*shift_timer - dt).max(0.);
    let g = s.gear.max(1).min(gears) as usize - 1;
    let wheel_rpm = kmh / tops[g] * peak;
    if *shift_timer == 0. {
        if wheel_rpm > peak * 0.965 && s.gear < gears {
            s.gear += 1;
            *shift_timer = if gears == 5 { 0.19 } else { 0.095 };
        } else if wheel_rpm < peak * 0.46 && s.gear > 1 {
            s.gear -= 1;
            *shift_timer = 0.11;
        }
    }
    let wheel_rpm = kmh / tops[s.gear as usize - 1] * peak;
    // A little unloaded clutch rev at launch; continuous within each physical gear.
    let clutch_slip = (1. - s.speed / 10.).clamp(0., 1.);
    let free_rev = idle + s.throttle * peak * 0.30;
    let target = wheel_rpm
        .max(idle + (free_rev - idle) * clutch_slip)
        .min(peak);
    let rpm = if s.rpm > 0. { s.rpm } else { idle };
    s.rpm = rpm
        + (target - rpm)
            * (1.
                - (-dt
                    / if gears == 5 {
                        0.075
                    } else if gears == 7 {
                        0.028
                    } else {
                        0.045
                    })
                .exp());
    s.shift_cut = (*shift_timer / 0.04).clamp(0., 1.);
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rpm_is_continuous_at_old_artificial_speed_boundary() {
        let mut s = State {
            speed: 46.8 / 3.6,
            gear: 1,
            rpm: 10000.,
            ..State::default()
        };
        let mut timer = 0.;
        for _ in 0..100 {
            update_engine(&mut s, 7, &mut timer, 0.008333);
        }
        let rpm = s.rpm;
        s.speed = 47.2 / 3.6;
        update_engine(&mut s, 7, &mut timer, 0.008333);
        assert!((s.rpm - rpm).abs() < 100.);
        assert_eq!(s.gear, 1);
    }
    #[test]
    fn upshift_drops_rpm_and_cuts_torque() {
        let mut s = State {
            speed: 88. / 3.6,
            gear: 1,
            rpm: 18700.,
            throttle: 1.,
            ..State::default()
        };
        let mut timer = 0.;
        update_engine(&mut s, 7, &mut timer, 0.008333);
        assert_eq!(s.gear, 2);
        assert!(s.shift_cut > 0.);
        let before = s.rpm;
        for _ in 0..30 {
            update_engine(&mut s, 7, &mut timer, 0.008333);
        }
        assert!(s.rpm < before - 2000.);
        assert_eq!(s.shift_cut, 0.);
    }
    #[test]
    fn idle_is_stable() {
        let mut s = State {
            gear: 1,
            ..State::default()
        };
        let mut timer = 0.;
        for _ in 0..120 {
            update_engine(&mut s, 5, &mut timer, 0.008333);
        }
        assert!((s.rpm - idle_rpm(5)).abs() < 1.);
    }
    #[test]
    fn launch_revs_respond_to_throttle_and_shifts_do_not_hunt() {
        for gears in [5, 6, 7] {
            let mut s = State {
                gear: 1,
                throttle: 1.,
                ..State::default()
            };
            let mut timer = 0.;
            for _ in 0..120 {
                update_engine(&mut s, gears, &mut timer, 1. / 120.);
            }
            assert!(s.rpm > idle_rpm(gears) + 1500.);
            s.speed = gear_tops(gears)[0] / 3.6;
            for _ in 0..30 {
                update_engine(&mut s, gears, &mut timer, 1. / 120.);
            }
            assert_eq!(s.gear, 2);
            for _ in 0..120 {
                update_engine(&mut s, gears, &mut timer, 1. / 120.);
                assert_eq!(s.gear, 2);
            }
        }
    }
}

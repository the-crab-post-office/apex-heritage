//! Brake-priority longitudinal allocation. Gameplay estimates, not telemetry.
//! Previously engine thrust opposed the brake when both pedals were held, and
//! a near-saturated corner could reduce braking to only 20% indefinitely.
//! Braking now takes a tyre-force share first; the remaining lateral budget
//! widens the line rather than making the brake pedal disappear in a corner.
#[derive(Debug)]
pub struct Forces {
    pub drive: f32,
    pub brake: f32,
    pub lateral_grip: f32,
}
pub fn allocate(
    raw_drive: f32,
    pedal: f32,
    hardware: f32,
    grip: f32,
    aero: f32,
    lateral: f32,
    traction_factor: f32,
) -> Forces {
    let pedal = pedal.clamp(0., 1.);
    let grip = grip.max(0.01);
    // Aero-supported normal load should improve braking, not be discarded by
    // the old speed-independent spec.brake cap. Hardware remains era-specific.
    let brake = pedal * (hardware + aero * 0.85).min(grip * 0.96);
    let lateral_grip = (grip * grip - brake * brake).max(0.).sqrt();
    let drive_budget = crate::tyres::combined_budget(lateral, grip) * grip * traction_factor;
    Forces {
        drive: raw_drive.min(drive_budget),
        brake,
        lateral_grip,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn braking_keeps_authority_at_the_cornering_limit_and_releases_lateral_grip() {
        let straight = allocate(0., 1., 32., 40., 22., 0., 0.97);
        let corner = allocate(0., 1., 32., 40., 22., 40., 0.97);
        assert_eq!(straight.brake, corner.brake);
        assert!(corner.brake > 35.);
        assert!(corner.lateral_grip < 15.);
        assert!(corner.brake.hypot(corner.lateral_grip) <= 40.001);
    }
    #[test]
    fn partial_pedals_are_progressive_and_aero_improves_high_speed_stopping() {
        let force = |p| allocate(0., p, 32., 40., 22., 0., 0.97);
        assert_eq!(force(0.).brake, 0.);
        assert!((force(0.5).brake * 2. - force(1.).brake).abs() < 1e-5);
        assert!(force(1.).brake > allocate(0., 1., 32., 19., 0., 0., 0.97).brake);
    }
}

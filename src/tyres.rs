//! Bounded quasi-static tyre load sensitivity and combined-slip force budget.
//! Approximate handling model, not measured Pacejka coefficients or full suspension.
//! Rapier is not used: rigid-body contacts would not supply these tyre forces.
pub fn effective_grip(mechanical: f32, aero: f32) -> f32 {
    let mechanical = mechanical.max(0.1);
    let aero = aero.max(0.);
    (mechanical + aero) / (1. + aero / mechanical).powf(0.075)
}
pub fn combined_budget(lateral_acceleration: f32, grip: f32) -> f32 {
    let usage = (lateral_acceleration.abs() / grip.max(0.1)).clamp(0., 0.995);
    (1. - usage * usage).sqrt()
}
pub fn rear_load_factor(braking: f32, acceleration: f32, speed: f32, wheelbase: f32) -> f32 {
    // 0.31 m representative CoG, 54% static rear load; aero progressively
    // reduces the fraction of total normal load transferred at higher speeds.
    let transfer = (acceleration - braking) * 0.31 / (wheelbase.max(2.) * 9.81);
    (1. + transfer / (0.54 + speed * speed * 0.00009)).clamp(0.70, 1.20)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn load_sensitivity_is_monotonic_but_sublinear() {
        let a = effective_grip(18., 20.);
        let b = effective_grip(18., 40.);
        assert!(a > 18. && b > a);
        assert!(a < 38. && b < 58.);
    }
    #[test]
    fn trail_braking_and_power_share_lateral_grip() {
        assert!((combined_budget(0., 20.) - 1.).abs() < 0.0001);
        assert!((combined_budget(12., 20.) - 0.8).abs() < 0.0001);
        assert!(combined_budget(20., 20.) < 0.11);
        assert_eq!(combined_budget(-12., 20.), combined_budget(12., 20.));
    }
    #[test]
    fn braking_unloads_rear_and_high_speed_aero_moderates_transfer() {
        assert!(rear_load_factor(12., 0., 20., 3.6) < 1.);
        assert!(rear_load_factor(12., 0., 80., 3.6) > rear_load_factor(12., 0., 20., 3.6));
        assert!(rear_load_factor(0., 8., 20., 3.6) > 1.);
    }
    #[test]
    fn season_2021_has_its_own_spec_contacts_and_2021_surface_label() {
        let modern = crate::car_spec(3, 0);
        let hybrid = crate::car_spec(4, 0);
        assert_eq!(hybrid.mass, 752.);
        assert_eq!(modern.mass, 798.);
        assert_eq!(hybrid.gears, 8);
        assert!(hybrid.aero > 3.);
        let wheels = crate::contact::wheels(4);
        assert!((wheels[0].radius - 0.335).abs() < 0.0001);
        assert!((wheels[0].longitudinal - wheels[1].longitudinal - 3.6).abs() < 0.0001);
        let t = &crate::tracks()[1];
        assert_eq!(crate::corner::Details::new(t, 4).year, 2021);
    }
    #[test]
    fn five_era_braking_rig_remains_stable_and_wet_stops_are_longer() {
        fn stop(era: usize, wet: bool) -> f32 {
            let mut sim = crate::Simulation::new(0, era, 0, wet, true);
            let p = sim.track.points[0];
            let yaw = sim.state.yaw;
            sim.state.speed = 100. / 3.6;
            let mut distance = 0.;
            for _ in 0..2400 {
                sim.state.x = p[0];
                sim.state.z = p[1];
                sim.state.yaw = yaw;
                sim.state.travel_yaw = yaw;
                sim.nearest = 0;
                sim.step(0., 1., 0., 1. / 120.);
                distance += sim.state.speed / 120.;
                assert!(sim.state.speed.is_finite());
                if sim.state.speed < 0.1 {
                    return distance;
                }
            }
            panic!("failed stopping rig era {era}");
        }
        for era in 0..6 {
            assert!(stop(era, true) > stop(era, false) * 1.10, "era {era}");
        }
    }
}

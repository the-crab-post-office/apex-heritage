//! Full shared simulation rigs, with position reset to a fixed road station so
//! steering, runoff, collisions or changing track gradients cannot fake a stopping gain.
use crate::Simulation;
fn rig(era: usize, wet: bool, overlap: bool, start: f32, pedal: f32, steer: f32) -> (f32, f32) {
    let mut sim = Simulation::new(2, era, 0, wet, true);
    let p = sim.track.points[0];
    let yaw = sim.state.yaw;
    sim.state.speed = start / 3.6;
    let (mut distance, mut time) = (0., 0.);
    for _ in 0..4800 {
        sim.state.x = p[0];
        sim.state.z = p[1];
        sim.state.yaw = yaw;
        sim.state.travel_yaw = yaw;
        let before = sim.state.speed;
        sim.step(if overlap { 1. } else { 0. }, pedal, steer, 1. / 120.);
        assert!(
            sim.state.speed <= before + 0.001,
            "braking must not accelerate, era {era}"
        );
        distance += (before + sim.state.speed) * 0.5 / 120.;
        time += 1. / 120.;
        if sim.state.speed < 0.1 {
            return (distance, time);
        }
    }
    panic!("failed stopping rig era {era}")
}
#[test]
fn stops_have_absolute_distance_bounds_not_just_less_than_starting_speed() {
    for era in 0..5 {
        let (d, t) = rig(era, false, false, 100., 1., 0.);
        eprintln!("era {era}: 100–0 km/h = {d:.2} m / {t:.2} s");
        assert!(
            d > 8. && d < if era == 0 { 40. } else { 30. },
            "era {era}: {d} m"
        );
        assert!(t < if era == 0 { 3. } else { 2.5 });
        let high = rig(era, false, false, 250., 1., 0.).0;
        assert!(
            high < if era == 0 { 220. } else { 150. },
            "era {era}: {high} m from 250"
        );
    }
}
#[test]
fn full_brake_overrides_held_accelerator_on_all_five_eras() {
    for era in 0..5 {
        let a = rig(era, false, false, 100., 1., 0.);
        let b = rig(era, false, true, 100., 1., 0.);
        assert!((a.0 - b.0).abs() < 0.01);
        let (_, t) = rig(era, false, true, 30., 1., 0.);
        assert!(t < 1.);
    }
}
#[test]
fn wet_is_longer_partial_pedal_is_progressive_and_turning_keeps_brake_authority() {
    for era in 0..5 {
        let dry = rig(era, false, false, 100., 1., 0.).0;
        assert!(rig(era, true, false, 100., 1., 0.).0 > dry * 1.15);
        assert!(rig(era, false, false, 100., 0.5, 0.).0 > dry * 1.5);
        assert!(rig(era, false, true, 100., 1., 1.).0 < dry * 1.3);
    }
}

#[test]
fn banked_road_support_matches_the_rendered_cross_slope_and_rolls_the_car() {
    let t = crate::tracks().remove(11);
    for i in [166, 780] {
        let a = t.points[i];
        let b = t.points[i + 1];
        let yaw = (b[0] - a[0]).atan2(b[1] - a[1]);
        for offset in [-4., 0., 4.] {
            let p = crate::surface_mesh::road_point(&t, i, offset, 0.);
            let surface = t.surface_at(p[0] as f32, p[2] as f32, i, yaw);
            assert!((surface.height - p[1] as f32).abs() < 0.13, "station {i}");
        }
        let mut sim = Simulation::new(11, 3, 0, false, true);
        sim.state.x = a[0];
        sim.state.z = a[1];
        sim.state.yaw = yaw;
        sim.state.travel_yaw = yaw;
        for _ in 0..60 {
            crate::corner::update_contact(&t, &sim.details, &mut sim.state, i, 3, 1. / 120.);
        }
        assert!(sim.state.body_roll.abs() > 0.25);
        assert!((sim.state.wheel_heights[0] - sim.state.wheel_heights[2]).abs() > 0.4);
        assert_eq!(sim.state.wheels_on_track, 4);
    }
}

#[test]
fn full_brake_preserves_matched_speed_turn_in_across_all_eras() {
    // Hold station/speed/heading to measure steering authority, not the natural
    // reduction in yaw rate as the car slows, or collisions on a tight road.
    for era in 0..5 {
        for wet in [false, true] {
            let turn = |brake| {
                let mut sim = Simulation::new(2, era, 0, wet, true);
                let p = sim.track.points[0];
                let yaw = sim.state.yaw;
                for _ in 0..60 {
                    sim.state.x = p[0];
                    sim.state.z = p[1];
                    sim.state.yaw = yaw;
                    sim.state.travel_yaw = yaw;
                    sim.state.speed = 30.;
                    sim.step(0., brake, 1., 1. / 120.);
                    assert!(sim.state.steering > 0.);
                }
                (sim.state.yaw_rate.abs(), sim.state.speed)
            };
            let coast = turn(0.);
            let brake = turn(1.);
            assert!(coast.0 > 0.1);
            assert!(
                brake.0 >= coast.0 * 0.95,
                "era {era}, wet {wet}: coast {}, brake {}",
                coast.0,
                brake.0
            );
            assert!(
                brake.1 < coast.1,
                "steering fix must not weaken deceleration"
            );
        }
    }
}

//! Native hot-plug gamepads through gilrs (Linux evdev / Windows / macOS).
use gilrs::{Axis, Button, EventType, GamepadId, Gilrs};
use std::collections::HashSet;
pub fn steering_axis(value: f32) -> f32 {
    let value = if value.is_finite() {
        value.clamp(-1., 1.)
    } else {
        0.
    };
    let a = value.abs();
    if a <= 0.12 {
        0.
    } else {
        value.signum() * ((a - 0.12) / 0.88).powf(1.3)
    }
}
#[derive(Default)]
pub struct Controls {
    pub steer: f32,
    pub throttle: f32,
    pub brake: f32,
    pub pressed: HashSet<Button>,
    pub connected: bool,
    pub lost: bool,
}
pub struct Controller {
    input: Option<Gilrs>,
    active: Option<GamepadId>,
    connected: bool,
}
impl Controller {
    pub fn new() -> Self {
        let input = Gilrs::new()
            .map_err(|e| eprintln!("Controller unavailable: {e}; keyboard is active"))
            .ok();
        Self {
            input,
            active: None,
            connected: false,
        }
    }
    pub fn poll(&mut self) -> Controls {
        let mut c = Controls::default();
        let Some(input) = self.input.as_mut() else {
            return c;
        };
        while let Some(e) = input.next_event() {
            match e.event {
                EventType::ButtonPressed(b, _) => {
                    self.active = Some(e.id);
                    c.pressed.insert(b);
                }
                EventType::AxisChanged(_, _, _) | EventType::Connected => self.active = Some(e.id),
                _ => {}
            }
        }
        let id = self
            .active
            .filter(|id| input.gamepad(*id).is_connected())
            .or_else(|| {
                input
                    .gamepads()
                    .find(|(_, g)| g.is_connected())
                    .map(|(id, _)| id)
            });
        if let Some(id) = id {
            self.active = Some(id);
            let p = input.gamepad(id);
            c.connected = true;
            c.steer = -steering_axis(p.value(Axis::LeftStickX));
            c.throttle = p
                .button_data(Button::RightTrigger2)
                .map(|b| b.value())
                .unwrap_or(0.);
            c.brake = p
                .button_data(Button::LeftTrigger2)
                .map(|b| b.value())
                .unwrap_or(0.);
            if p.is_pressed(Button::DPadLeft) {
                c.steer = 1.;
            }
            if p.is_pressed(Button::DPadRight) {
                c.steer = -1.;
            }
        } else {
            c.pressed.clear();
        }
        c.lost = self.connected && !c.connected;
        self.connected = c.connected;
        c
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rescaled_deadzone_and_progressive_full_lock() {
        assert_eq!(steering_axis(0.1), 0.);
        assert_eq!(steering_axis(-1.), -1.);
        assert_eq!(steering_axis(1.), 1.);
        assert!(steering_axis(0.5) > 0.2 && steering_axis(0.5) < 0.5);
        assert_eq!(steering_axis(f32::NAN), 0.);
    }
}

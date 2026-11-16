//! Native camera input and local preferences. Smoke checks never touch user settings.
use apex_heritage::cameras::{rigs, Tuning};
use macroquad::prelude::*;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, path::PathBuf};
#[derive(Deserialize, Serialize)]
struct Preferences {
    schema: u8,
    selected: String,
    views: BTreeMap<String, Tuning>,
}
impl Default for Preferences {
    fn default() -> Self {
        Self {
            schema: 1,
            selected: "chase".into(),
            views: BTreeMap::new(),
        }
    }
}
pub struct Controls {
    prefs: Preferences,
    path: Option<PathBuf>,
    pub look: [f32; 2],
    pub saved: bool,
    last_mouse: (f32, f32),
    last_mode: usize,
}
impl Controls {
    pub fn new(smoke: bool) -> Self {
        let path = if smoke { None } else { preferences_path() };
        let prefs = path
            .as_ref()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str::<Preferences>(&s).ok())
            .filter(|p| p.schema == 1)
            .unwrap_or_default();
        let mode = rigs()
            .iter()
            .position(|r| r.id == prefs.selected)
            .unwrap_or(0);
        Self {
            prefs,
            path,
            look: [0., 0.],
            saved: true,
            last_mouse: mouse_position(),
            last_mode: mode,
        }
    }
    pub fn selected(&self) -> usize {
        self.last_mode
    }
    pub fn tuning(&self, mode: usize) -> Tuning {
        self.prefs
            .views
            .get(&rigs()[mode].id)
            .copied()
            .unwrap_or_default()
            .normalized()
    }
    pub fn update(&mut self, mode: usize, active: bool) {
        let mut changed = false;
        if self.last_mode != mode {
            self.last_mode = mode;
            self.look = [0., 0.];
            self.prefs.selected = rigs()[mode].id.clone();
            changed = true;
        }
        let mouse = mouse_position();
        if active {
            if is_mouse_button_down(MouseButton::Right)
                && !is_mouse_button_pressed(MouseButton::Right)
            {
                self.look[0] = (self.look[0] - (mouse.0 - self.last_mouse.0) * 0.006)
                    .clamp(-std::f32::consts::PI, std::f32::consts::PI);
                self.look[1] =
                    (self.look[1] - (mouse.1 - self.last_mouse.1) * 0.006).clamp(-1.1, 1.1);
            }
            if is_key_pressed(KeyCode::Backspace) {
                self.look = [0., 0.];
            }
            let mut t = self.tuning(mode);
            let previous = t;
            if is_key_pressed(KeyCode::LeftBracket) {
                t.fov = Some(t.fov.unwrap_or(rigs()[mode].fov) - 2.);
            }
            if is_key_pressed(KeyCode::RightBracket) {
                t.fov = Some(t.fov.unwrap_or(rigs()[mode].fov) + 2.);
            }
            if !rigs()[mode].attached {
                let (_, wheel) = mouse_wheel();
                t.distance += distance_delta(
                    is_key_pressed(KeyCode::PageDown),
                    is_key_pressed(KeyCode::PageUp),
                    wheel,
                );
            }
            t = t.normalized();
            if t != previous {
                self.prefs.views.insert(rigs()[mode].id.clone(), t);
                changed = true;
            }
            if is_key_pressed(KeyCode::Home) {
                self.prefs.views.remove(&rigs()[mode].id);
                self.look = [0., 0.];
                changed = true;
            }
        }
        self.last_mouse = mouse;
        if changed {
            self.save();
        }
    }
    fn save(&mut self) {
        // Canonicalize only supported rig entries and reject out-of-range file values.
        self.prefs.views = rigs()
            .iter()
            .map(|r| {
                (
                    r.id.clone(),
                    self.prefs
                        .views
                        .get(&r.id)
                        .copied()
                        .unwrap_or_default()
                        .normalized(),
                )
            })
            .collect();
        self.saved = self.path.as_ref().is_some_and(|path| {
            let Some(parent) = path.parent() else {
                return false;
            };
            if !parent.as_os_str().is_empty() && std::fs::create_dir_all(parent).is_err() {
                return false;
            }
            let Ok(data) = serde_json::to_vec_pretty(&self.prefs) else {
                return false;
            };
            std::fs::write(path, data).is_ok()
        });
    }
}
fn distance_delta(farther: bool, closer: bool, wheel: f32) -> f32 {
    // Rust's signum(+0.0) is +1, unlike JavaScript Math.sign(0).
    let scroll = if wheel.is_finite() && wheel != 0.0 {
        wheel.signum() * 0.05
    } else {
        0.0
    };
    (farther as i8 - closer as i8) as f32 * 0.05 - scroll
}
fn preferences_path() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("APEX_CAMERA_PREFS") {
        return Some(PathBuf::from(path));
    }
    let base = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
        .or_else(|| std::env::var_os("HOME").map(|p| PathBuf::from(p).join(".config")))?;
    Some(base.join("apex-heritage/cameras.json"))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn idle_mouse_wheel_never_changes_camera_distance() {
        for wheel in [0.0, -0.0, f32::NAN] {
            assert_eq!(distance_delta(false, false, wheel), 0.0);
        }
        assert_eq!(distance_delta(false, false, 1.0), -0.05);
        assert_eq!(distance_delta(false, false, -1.0), 0.05);
        assert_eq!(distance_delta(true, false, 0.0), 0.05);
        assert_eq!(distance_delta(false, true, 0.0), -0.05);
    }
    #[test]
    fn preferences_round_trip_preserves_independent_camera_tuning() {
        let mut p = Preferences::default();
        p.selected = "cockpit".into();
        p.views.insert(
            "chase".into(),
            Tuning {
                distance: 1.5,
                fov: Some(65.),
            },
        );
        p.views.insert(
            "cockpit".into(),
            Tuning {
                distance: 1.,
                fov: Some(90.),
            },
        );
        let out: Preferences = serde_json::from_slice(&serde_json::to_vec(&p).unwrap()).unwrap();
        assert_eq!(out.selected, "cockpit");
        assert_eq!(out.views["chase"].fov, Some(65.));
        assert_eq!(out.views["cockpit"].fov, Some(90.));
    }
}

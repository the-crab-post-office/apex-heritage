//! Authored modern Piscine scenery shared by both renderers, never a physics overlay.
use serde::Deserialize;
use std::sync::OnceLock;
#[derive(Deserialize)]
pub struct Facet {
    pub p: [[f32; 3]; 3],
    pub color: String,
}
#[derive(Deserialize)]
pub struct Object {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub sx: f32,
    pub sy: f32,
    pub sz: f32,
    pub yaw: f32,
    pub color: String,
}
#[derive(Deserialize)]
pub struct Scenery {
    pub facets: Vec<Facet>,
    pub objects: Vec<Object>,
    pub terrain_mask: Vec<[[f64; 2]; 3]>,
    pub yachts: usize,
}
pub fn data() -> &'static Scenery {
    static DATA: OnceLock<Scenery> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(include_str!("../data/monaco-piscine.json"))
            .expect("offline Piscine scenery")
    })
}
pub fn terrain_mask(t: &crate::Track) -> crate::surface_mesh::RoadMask {
    let triangles = if t.name == "Monaco" {
        data()
            .terrain_mask
            .iter()
            .map(|tri| tri.map(|p| [p[0], 0., p[1]]))
            .collect()
    } else {
        vec![]
    };
    crate::surface_mesh::RoadMask::from_triangles(triangles)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn all_four_eras_clear_both_piscine_chicanes_at_driving_speed() {
        for era in 0..6 {
            let mut sim = crate::Simulation::new(1, era, 0, false, true);
            for i in 497..556 {
                let p = sim.track.points[i];
                let q = sim.track.points[i + 1];
                sim.nearest = i;
                sim.state.x = p[0];
                sim.state.z = p[1];
                sim.state.yaw = (q[0] - p[0]).atan2(q[1] - p[1]);
                sim.state.travel_yaw = sim.state.yaw;
                sim.state.yaw_rate = 0.;
                sim.state.speed = 20.;
                sim.step(0.2, 0., 0., 1. / 120.);
                assert!(sim.state.impact < 0.01, "era {era} station {i}");
                assert!(sim.state.speed > 19., "era {era} station {i}");
            }
        }
    }
    #[test]
    fn water_and_boats_are_shared_but_not_physics_facets() {
        let t = crate::tracks().remove(1);
        let s = data();
        assert!(s.yachts >= 12);
        assert!(s.facets.len() > 100);
        for era in 0..6 {
            let d = crate::corner::Details::new(&t, era);
            assert!(d
                .kerbs
                .iter()
                .filter(|k| k.name.starts_with("Piscine"))
                .all(|k| k.stripe_length > 0.));
        }
    }
}

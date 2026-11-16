//! Shared, original reference-guided chassis meshes. Generated offline, no photo pixels.
use serde::Deserialize;
use std::{collections::HashMap, sync::OnceLock};
#[derive(Deserialize)]
pub struct Batch {
    pub material: String,
    pub wheel: Option<String>,
    #[serde(default)]
    pub head: bool,
    #[serde(default)]
    pub cockpit_ghost: bool,
    pub positions: Vec<[f32; 3]>,
    pub indices: Vec<u16>,
    pub uvs: Vec<[f32; 2]>,
    pub components: Vec<String>,
}
#[derive(Deserialize)]
pub struct Layout {
    pub half: f32,
    pub front: f32,
    pub rear: f32,
    pub front_width: f32,
    pub rear_width: f32,
    pub radius: f32,
}
#[derive(Deserialize)]
struct Database {
    models: HashMap<String, Vec<Batch>>,
}
fn database() -> &'static Database {
    static DB: OnceLock<Database> = OnceLock::new();
    DB.get_or_init(|| {
        serde_json::from_str(include_str!("../data/car-shapes.json"))
            .expect("valid authored chassis")
    })
}
pub fn model(era: usize) -> Option<&'static Vec<Batch>> {
    database().models.get(&era.to_string())
}
pub fn layout(era: usize) -> Option<&'static Layout> {
    static LAYOUTS: OnceLock<HashMap<String, Layout>> = OnceLock::new();
    LAYOUTS
        .get_or_init(|| {
            serde_json::from_str(include_str!("../data/car-layouts.json"))
                .expect("valid shared wheel layout")
        })
        .get(&era.to_string())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reference_meshes_are_finite_indexed_and_have_the_distinguishing_components() {
        for era in 0..4 {
            let m = model(era).unwrap();
            let names = m
                .iter()
                .flat_map(|b| b.components.iter())
                .cloned()
                .collect::<Vec<_>>();
            assert!(names.iter().any(|n| n.contains(if era == 0 {
                "radiator cavity"
            } else {
                match era {
                    1 => "low turbo",
                    2 => "high-nose",
                    _ => "halo centre",
                }
            })));
            for b in m {
                assert_eq!(b.positions.len(), b.uvs.len());
                assert!(b.positions.len() < 10000);
                assert!(b.indices.len() <= 32768);
                assert!(b.positions.iter().flatten().all(|v| v.is_finite()));
                assert!(b.indices.iter().all(|i| (*i as usize) < b.positions.len()));
                assert_eq!(b.indices.len() % 3, 0);
            }
        }
    }
}

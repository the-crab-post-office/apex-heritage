//! Original photo-guided scenery shared by the native and web renderers.
//! Over-road architecture is explicit overhead geometry, never a ground-level
//! building exemption that could silently obstruct an unrelated road branch.
use serde::Deserialize;
use std::sync::OnceLock;
#[derive(Deserialize)]
pub struct Facet {
    pub p: [[f32; 3]; 3],
    pub color: String,
    pub tag: String,
}
#[derive(Deserialize)]
pub struct Scene {
    pub track: String,
    pub eras: Vec<usize>,
    pub facets: Vec<Facet>,
}
pub fn scenes() -> &'static Vec<Scene> {
    #[derive(Deserialize)]
    struct Database {
        scenes: Vec<Scene>,
    }
    static DATA: OnceLock<Database> = OnceLock::new();
    &DATA
        .get_or_init(|| {
            serde_json::from_str(include_str!("../data/reference-scenes.json"))
                .expect("offline reference scenes")
        })
        .scenes
}
pub fn for_track(name: &str, era: usize) -> Option<&'static Scene> {
    scenes()
        .iter()
        .find(|s| s.track == name && s.eras.contains(&era))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn overhead_hotel_spans_the_road_but_never_blocks_vehicle_clearance() {
        let t = crate::tracks().remove(1);
        let s = for_track("Monaco", 0).unwrap();
        let floors: Vec<_> = s
            .facets
            .iter()
            .filter(|f| f.tag == "hotel-overhead-floor")
            .collect();
        assert!(!floors.is_empty());
        let mut covered = 0;
        for i in 303..340 {
            let p = t.points[i];
            for f in &floors {
                if let Some(y) = crate::corner::height(f.p, p[0], p[1]) {
                    assert!(y - t.heights[i] >= 4.64, "station {i} clearance");
                    covered += 1;
                    break;
                }
            }
        }
        assert!(
            covered >= 25,
            "hotel must span the tunnel, not just sit beside it: {covered}"
        );
        assert!(s
            .facets
            .iter()
            .filter(|f| f.tag != "retaining-wall")
            .all(|f| f.p.iter().all(|p| p[1] >= 10.99)));
        assert!((0..5).all(|era| for_track("Monaco", era).is_some()));
        assert!(for_track("Spa-Francorchamps", 2).is_none());
        assert!(for_track("Spa-Francorchamps", 4).is_some());
    }
}

/// Remove terrain beneath the explicit approximate water polygons in both clients.
pub fn ground_mask(track: &crate::Track) -> crate::surface_mesh::RoadMask {
    let triangles = scenes()
        .iter()
        .filter(|s| s.track == track.name)
        .flat_map(|s| s.facets.iter())
        .filter(|f| f.tag == "water")
        .map(|f| f.p.map(|p| [p[0] as f64, 0., p[2] as f64]))
        .collect();
    crate::surface_mesh::RoadMask::from_triangles(triangles)
}

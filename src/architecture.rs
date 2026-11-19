//! Photo-guided venue materials; original artwork, not photographic textures.
use serde::Deserialize;
use std::sync::OnceLock;
#[derive(Deserialize)]
pub struct Appearance {
    pub osm_id: u64,
    pub height: f32,
    pub facade: usize,
    pub floors: usize,
    pub roof: u8,
    pub roof_rise: f32,
    #[serde(default)]
    pub roof_facets: Vec<[[f32; 3]; 3]>,
    #[serde(default)]
    pub detail: String,
    #[serde(default)]
    pub safe_footprints: Option<Vec<Vec<[f32; 2]>>>,
}
#[derive(Deserialize)]
pub struct Venue {
    pub id: String,
    pub name: String,
    pub buildings: Vec<Appearance>,
}
#[derive(Deserialize)]
struct Data {
    tracks: Vec<Venue>,
}
pub fn venues() -> &'static [Venue] {
    static DATA: OnceLock<Data> = OnceLock::new();
    &DATA
        .get_or_init(|| {
            serde_json::from_str(include_str!("../data/building-appearance.json"))
                .expect("building appearance")
        })
        .tracks
}
pub fn appearance(track: &str, osm: u64) -> &'static Appearance {
    let v = venues()
        .iter()
        .find(|v| v.id == track || v.name == track)
        .expect("venue appearance");
    &v.buildings[v
        .buildings
        .binary_search_by_key(&osm, |b| b.osm_id)
        .expect("mapped building appearance")]
}
#[cfg(test)]
mod tests {
    #[test]
    fn every_mapped_building_has_an_explicit_nonrandom_style() {
        let all = crate::scenery::buildings();
        assert_eq!(super::venues().len(), all.len());
        for t in all {
            for b in t.buildings {
                let a = super::appearance(&t.id, b.osm_id);
                assert!(a.height > 0. && a.height <= 150.);
                assert!(a.facade < 6);
                assert!(a.floors >= 1);
                assert!(a.roof <= 2);
            }
        }
    }
}

//! Real Sentinel-2 photographic ground context, not scanned road geometry.
use serde::Deserialize;
#[derive(Clone, Deserialize)]
pub struct Area {
    pub id: String,
    pub bounds: [f32; 4],
    pub forest_grid_size: usize,
    pub forest_mask: String,
}
#[derive(Deserialize)]
struct Manifest {
    tracks: Vec<Area>,
}
pub fn areas() -> Vec<Area> {
    serde_json::from_str::<Manifest>(include_str!("../data/imagery.json"))
        .unwrap()
        .tracks
}
pub fn forest_at(a: &Area, x: f32, z: f32) -> bool {
    let [x0, z0, x1, z1] = a.bounds;
    let u = (x - x0) / (x1 - x0);
    let v = (z - z0) / (z1 - z0);
    if !(0. ..1.).contains(&u) || !(0. ..1.).contains(&v) {
        return false;
    }
    let n = a.forest_grid_size;
    a.forest_mask.as_bytes()[(v * n as f32) as usize * n + (u * n as f32) as usize] == b'1'
}
pub const PHOTOS: [&[u8]; 10] = [
    include_bytes!("../web/assets/imagery/be-1925.jpg"),
    include_bytes!("../web/assets/imagery/mc-1929.jpg"),
    include_bytes!("../web/assets/imagery/it-1922.jpg"),
    include_bytes!("../web/assets/imagery/gb-1948.jpg"),
    include_bytes!("../web/assets/imagery/jp-1962.jpg"),
    include_bytes!("../web/assets/imagery/br-1940.jpg"),
    include_bytes!("../web/assets/imagery/it-1953.jpg"),
    include_bytes!("../web/assets/imagery/de-1927.jpg"),
    include_bytes!("../web/assets/imagery/ca-1978.jpg"),
    include_bytes!("../web/assets/imagery/de-1932.jpg"),
];
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn source_masks_and_images_cover_all_ten_tracks() {
        let a = areas();
        assert_eq!(a.len(), 10);
        for (i, area) in a.iter().enumerate() {
            assert_eq!(area.forest_mask.len(), 64 * 64);
            assert!(PHOTOS[i].starts_with(&[255, 216]));
            assert!(area.bounds[2] > area.bounds[0] && area.bounds[3] > area.bounds[1]);
        }
    }
}

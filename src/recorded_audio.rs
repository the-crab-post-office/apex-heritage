//! CC BY-SA 3.0 Edvvc recordings. Asset provenance: web/assets/audio/recordings.json.
//! The source recordings are trackside references, not exact era/car replicas.
const PCM: [[&[u8]; 2]; 3] = [
    [
        include_bytes!("../web/assets/audio/classic-low.pcm"),
        include_bytes!("../web/assets/audio/classic-high.pcm"),
    ],
    [
        include_bytes!("../web/assets/audio/turbo-low.pcm"),
        include_bytes!("../web/assets/audio/turbo-high.pcm"),
    ],
    [
        include_bytes!("../web/assets/audio/v10-low.pcm"),
        include_bytes!("../web/assets/audio/v10-high.pcm"),
    ],
];
const REFERENCES: [[f32; 2]; 3] = [[4000., 8000.], [5000., 10000.], [6500., 12500.]];
pub struct RecordedLayer {
    data: [Vec<f32>; 2],
    heads: [f64; 2],
    references: [f32; 2],
    sr: f32,
}
impl RecordedLayer {
    pub fn new(era: usize, sr: f32) -> Option<Self> {
        if era >= 3 {
            return None;
        }
        Some(Self {
            data: PCM[era].map(|bytes| {
                bytes
                    .chunks_exact(2)
                    .map(|b| i16::from_le_bytes([b[0], b[1]]) as f32 / 32768.)
                    .collect()
            }),
            heads: [0.; 2],
            references: REFERENCES[era],
            sr,
        })
    }
    pub fn sample(&mut self, rpm: f32) -> f32 {
        let u =
            ((rpm - self.references[0]) / (self.references[1] - self.references[0])).clamp(0., 1.);
        let blend = u * u * (3. - 2. * u);
        let mut value = 0.;
        for k in 0..2 {
            let data = &self.data[k];
            let rate = (rpm / self.references[k]).clamp(0.3, 2.4);
            self.heads[k] = (self.heads[k]
                + rate as f64 * 24000. / (self.sr as f64 * data.len() as f64))
                .fract();
            let p = self.heads[k] * data.len() as f64;
            let i = p as usize;
            let t = (p - i as f64) as f32;
            let x = data[i] + (data[(i + 1) % data.len()] - data[i]) * t;
            value += x * if k == 0 { 1. - blend } else { blend };
        }
        value
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn real_assets_are_present_nonzero_and_seamless() {
        for bank in PCM {
            for bytes in bank {
                let pcm: Vec<f32> = bytes
                    .chunks_exact(2)
                    .map(|b| i16::from_le_bytes([b[0], b[1]]) as f32 / 32768.)
                    .collect();
                assert!(pcm.len() > 10000);
                let rms = (pcm.iter().map(|x| x * x).sum::<f32>() / pcm.len() as f32).sqrt();
                assert!(rms > 0.03);
                assert!(rms < 0.3);
                assert!((pcm[0] - pcm[pcm.len() - 1]).abs() < 0.3);
            }
        }
    }
    #[test]
    fn recorded_layer_tracks_rpm_and_unsupported_modern_is_explicit() {
        assert!(RecordedLayer::new(3, 48000.).is_none());
        for era in 0..3 {
            let mut a = RecordedLayer::new(era, 48000.).unwrap();
            let mut b = RecordedLayer::new(era, 48000.).unwrap();
            let mut difference = 0.;
            for _ in 0..96000 {
                let x = a.sample(4500.);
                let y = b.sample(10000.);
                assert!(x.is_finite() && y.is_finite());
                assert!(x.abs() < 0.9 && y.abs() < 0.9);
                difference += (x - y).abs();
            }
            assert!(difference > 100.);
        }
    }
}

//! Hybrid recorded/synthesized streaming audio; embedded CC BY-SA PCM loops.
//! CPAL device errors degrade to silent gameplay rather than preventing launch.
use crate::State;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{
    atomic::{AtomicU32, Ordering::Relaxed},
    Arc,
};
const TAU: f32 = std::f32::consts::TAU;
const SIZE: usize = 2048;
const HARMONICS: [[f32; 12]; 4] = [
    [
        1., 0.78, 0.32, 0.38, 0.22, 0.12, 0.10, 0.08, 0.04, 0.03, 0.02, 0.02,
    ],
    [
        1., 0.50, 0.67, 0.30, 0.36, 0.18, 0.22, 0.12, 0.12, 0.07, 0.04, 0.03,
    ],
    [
        1., 0.70, 0.48, 0.38, 0.22, 0.27, 0.18, 0.14, 0.10, 0.065, 0.045, 0.03,
    ],
    [
        1., 0.41, 0.60, 0.20, 0.30, 0.11, 0.15, 0.08, 0.06, 0.045, 0.03, 0.02,
    ],
];
#[derive(Default)]
struct Params {
    rpm: AtomicU32,
    load: AtomicU32,
    boost: AtomicU32,
    speed: AtomicU32,
    slip: AtomicU32,
    bottoming: AtomicU32,
    era: AtomicU32,
    gain: AtomicU32,
    gear: AtomicU32,
    cut: AtomicU32,
}
struct EngineTone {
    on: Vec<f32>,
    off: Vec<f32>,
    era: usize,
    phase: f32,
    crank: f32,
    whine: f32,
    rpm: f32,
    load: f32,
    gain: f32,
    target_rpm: f32,
    target_load: f32,
    target_gain: f32,
    boost: f32,
    slip: f32,
    bottoming: f32,
    speed: f32,
    filter: f32,
    seed: u32,
    sr: f32,
    gear: u32,
    cut: f32,
    target_cut: f32,
    recording: Option<crate::recorded_audio::RecordedLayer>,
}
impl EngineTone {
    fn new(era: usize, sr: f32) -> Self {
        let era = era.min(3);
        let mut on = vec![0.; SIZE + 1];
        let mut off = on.clone();
        for i in 0..SIZE {
            for h in 1..=12 {
                let phase = if h == 1 {
                    0.
                } else {
                    (h as f32 * 1.73).sin() * 0.55
                };
                let v = (TAU * i as f32 * h as f32 / SIZE as f32 + phase).sin()
                    * HARMONICS[era][h - 1]
                    * 0.46;
                on[i] += v;
                off[i] += v * 0.75_f32.powi(h as i32 - 1);
            }
        }
        on[SIZE] = on[0];
        off[SIZE] = off[0];
        Self {
            on,
            off,
            era,
            phase: 0.,
            crank: 0.,
            whine: 0.,
            rpm: 4000.,
            load: 0.,
            gain: 0.,
            target_rpm: 4000.,
            target_load: 0.,
            target_gain: 0.,
            boost: 0.,
            slip: 0.,
            bottoming: 0.,
            speed: 0.,
            filter: 0.,
            seed: 71831,
            sr,
            gear: 1,
            cut: 0.,
            target_cut: 0.,
            recording: crate::recorded_audio::RecordedLayer::new(era, sr),
        }
    }
    fn read(table: &[f32], phase: f32) -> f32 {
        let f = phase * SIZE as f32;
        let i = f as usize;
        table[i] + (table[i + 1] - table[i]) * (f - i as f32)
    }
    fn sample(&mut self) -> f32 {
        let a = 1. - (-1. / (self.sr * 0.032)).exp();
        self.rpm += (self.target_rpm - self.rpm) * a;
        self.load += (self.target_load - self.load) * a;
        self.gain += (self.target_gain - self.gain) * a;
        let cyl = [8., 6., 10., 6.][self.era];
        self.phase = (self.phase + self.rpm * cyl / (120. * self.sr)).fract();
        self.crank = (self.crank + self.rpm / (60. * self.sr)).fract();
        self.whine =
            (self.whine + (1700. + self.boost * 4200. + self.rpm * 0.05) / self.sr).fract();
        self.seed ^= self.seed << 13;
        self.seed ^= self.seed >> 17;
        self.seed ^= self.seed << 5;
        let noise = self.seed as f32 / 2147483648. - 1.;
        self.filter += 0.16 * (noise - self.filter);
        self.cut += (self.target_cut - self.cut) * a * 2.;
        let cut = 1. - self.cut * 0.82;
        let load = self.load * cut;
        let rough = [0.17, 0.09, 0.035, 0.065][self.era];
        let irregular = 1. + rough * (TAU * self.crank).sin() * (TAU * self.crank * 2.).sin();
        let off = Self::read(&self.off, self.phase);
        let exhaust = (off + (Self::read(&self.on, self.phase) - off) * load)
            * (0.11 + 0.14 * load)
            * irregular;
        let body = (TAU * self.crank * 2.).sin()
            * [0.085, 0.06, 0.026, 0.065][self.era]
            * (0.4 + 0.6 * load);
        let turbo = (TAU * self.whine).sin() * [0., 0.043, 0., 0.024][self.era] * self.boost * load;
        let texture = (noise - self.filter) * (0.007 + 0.017 * load)
            + self.filter * self.slip * self.slip * 0.11
            + (noise - self.filter) * self.bottoming * (self.speed / 12.).min(1.) * 0.16
            + self.filter * (self.speed / 100.).min(1.).powi(2) * 0.035;
        let recorded = self
            .recording
            .as_mut()
            .map(|r| r.sample(self.rpm) * (0.27 + 0.3 * load) * cut);
        let value = if let Some(real) = recorded {
            (exhaust * 0.28 + body * 0.4 + real + turbo + texture) * self.gain
        } else {
            (exhaust + body + turbo + texture) * self.gain
        };
        value / (1. + value.abs() * 0.75)
    }
}
pub struct NativeAudio {
    _stream: cpal::Stream,
    params: Arc<Params>,
}
impl NativeAudio {
    pub fn new() -> Option<Self> {
        if std::env::var("APEX_NO_AUDIO").is_ok() || std::env::var("APEX_SMOKE").is_ok() {
            return None;
        }
        let result = (|| -> Result<Self, String> {
            let host = cpal::default_host();
            let device = host.default_output_device().ok_or("No output device")?;
            let supported = device.default_output_config().map_err(|e| e.to_string())?;
            let params = Arc::new(Params::default());
            let config: cpal::StreamConfig = supported.clone().into();
            let stream = match supported.sample_format() {
                cpal::SampleFormat::F32 => build::<f32>(&device, &config, params.clone()),
                cpal::SampleFormat::I16 => build::<i16>(&device, &config, params.clone()),
                cpal::SampleFormat::U16 => build::<u16>(&device, &config, params.clone()),
                _ => return Err("Unsupported audio sample format".into()),
            }
            .map_err(|e| e.to_string())?;
            stream.play().map_err(|e| e.to_string())?;
            Ok(Self {
                _stream: stream,
                params,
            })
        })();
        match result {
            Ok(s) => Some(s),
            Err(e) => {
                eprintln!("Engine audio disabled: {e}. Gameplay is available.");
                None
            }
        }
    }
    pub fn update(&self, s: &State, era: usize, muted: bool) {
        let p = &self.params;
        p.rpm.store(s.rpm.to_bits(), Relaxed);
        p.load.store(s.throttle.to_bits(), Relaxed);
        p.boost.store(s.boost.to_bits(), Relaxed);
        p.speed.store(s.speed.to_bits(), Relaxed);
        p.slip.store(s.slip.to_bits(), Relaxed);
        p.bottoming.store(s.bottoming.to_bits(), Relaxed);
        p.era.store(era as u32, Relaxed);
        p.gear.store(s.gear, Relaxed);
        p.cut.store(s.shift_cut.to_bits(), Relaxed);
        p.gain
            .store((if muted { 0_f32 } else { 0.55_f32 }).to_bits(), Relaxed);
    }
}
fn build<T: cpal::SizedSample + cpal::FromSample<f32>>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    params: Arc<Params>,
) -> Result<cpal::Stream, cpal::BuildStreamError> {
    let channels = config.channels as usize;
    let sr = config.sample_rate.0 as f32;
    let mut tone = EngineTone::new(2, sr);
    device.build_output_stream(
        config,
        move |data: &mut [T], _| {
            let era = (params.era.load(Relaxed) as usize).min(3);
            if era != tone.era {
                tone = EngineTone::new(era, sr);
            }
            tone.target_rpm = f32::from_bits(params.rpm.load(Relaxed)).clamp(1800., 19500.);
            tone.target_load = f32::from_bits(params.load.load(Relaxed));
            tone.target_gain = f32::from_bits(params.gain.load(Relaxed));
            tone.boost = f32::from_bits(params.boost.load(Relaxed));
            tone.slip = f32::from_bits(params.slip.load(Relaxed));
            tone.bottoming = f32::from_bits(params.bottoming.load(Relaxed)).clamp(0., 1.);
            tone.speed = f32::from_bits(params.speed.load(Relaxed));
            tone.target_cut = f32::from_bits(params.cut.load(Relaxed)).clamp(0., 1.);
            let gear = params.gear.load(Relaxed);
            if gear != tone.gear {
                tone.gear = gear;
            }
            for frame in data.chunks_mut(channels) {
                let value = tone.sample();
                for sample in frame {
                    *sample = T::from_sample(value);
                }
            }
        },
        |error| eprintln!("Engine audio stream: {error}"),
        None,
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_native_engine_is_finite_audible_and_bounded() {
        for era in 0..4 {
            let mut t = EngineTone::new(era, 48000.);
            t.target_rpm = 9000.;
            t.target_load = 1.;
            t.target_gain = 0.55;
            let mut energy = 0.;
            let mut peak = 0_f32;
            for i in 0..48000 {
                let x = t.sample();
                assert!(x.is_finite());
                if i > 24000 {
                    energy += x * x;
                    peak = peak.max(x.abs());
                }
            }
            assert!(energy / 24000. > 0.0001);
            assert!(peak < 0.8);
        }
    }
    #[test]
    fn native_engine_mutes_without_a_sample_discontinuity() {
        let mut t = EngineTone::new(2, 48000.);
        t.target_load = 1.;
        t.target_gain = 0.55;
        for _ in 0..24000 {
            t.sample();
        }
        t.target_gain = 0.;
        let mut last = 0.;
        for _ in 0..48000 {
            last = t.sample();
        }
        assert!(last.abs() < 0.00001);
    }
}

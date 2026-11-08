// Licensed trackside recordings, RPM-transposed with continuous fractional heads.
// Source files / attribution / processing are listed in assets/audio/recordings.json.
export function decodePCM(buffer) {
  const view = new DataView(buffer),
    out = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}
export class RecordedLayer {
  constructor(bank, sampleRate, phase = 0) {
    this.bank = bank;
    this.sampleRate = sampleRate;
    this.phase = phase;
  }
  sample(rpm, doppler = 1) {
    const layers = this.bank.layers;
    const u = Math.max(
      0,
      Math.min(
        1,
        (rpm - layers[0].reference_rpm) /
          (layers[1].reference_rpm - layers[0].reference_rpm),
      ),
    );
    const blend = u * u * (3 - 2 * u);
    // Both timbres share one firing phase: no beating, pitch sweep or clip restart.
    const cylinders = this.bank.cylinders || [8, 6, 10][this.bank.era] || 8;
    this.phase =
      (this.phase +
        (Math.max(0, rpm) * cylinders * doppler) / (120 * this.sampleRate)) %
      1;
    let value = 0;
    for (let k = 0; k < 2; k++) {
      const data = layers[k].data,
        n = data.length / (this.bank.wave_cycles || 16);
      const position = this.phase * n,
        i = Math.floor(position),
        t = position - i;
      const x = data[i] + (data[(i + 1) % Math.round(n)] - data[i]) * t;
      value += x * (k ? blend : 1 - blend);
    }
    return value;
  }
}

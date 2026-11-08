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
    this.heads = [phase, phase];
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
    let value = 0;
    for (let k = 0; k < 2; k++) {
      const layer = layers[k],
        data = layer.data;
      const rate = Math.max(
        0.3,
        Math.min(2.4, (rpm / layer.reference_rpm) * doppler),
      );
      this.heads[k] =
        (this.heads[k] +
          (rate * this.bank.sample_rate) / (this.sampleRate * data.length)) %
        1;
      const position = this.heads[k] * data.length,
        i = Math.floor(position),
        t = position - i;
      const x = data[i] + (data[(i + 1) % data.length] - data[i]) * t;
      value += x * (k ? blend : 1 - blend);
    }
    return value;
  }
}

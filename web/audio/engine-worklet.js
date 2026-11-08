import { EngineDSP } from "./engine-dsp.js";
class HeritageEngineProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.dsp = new EngineDSP(sampleRate);
    this.port.onmessage = (e) => {
      if (e.data.type === "telemetry") this.dsp.setTelemetry(e.data);
    };
  }
  process(inputs, outputs) {
    const output = outputs[0];
    if (output?.length >= 2) this.dsp.render(output[0], output[1]);
    return true;
  }
}
registerProcessor("heritage-engine", HeritageEngineProcessor);

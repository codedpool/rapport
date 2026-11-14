// Converts microphone audio to 16 kHz mono PCM16 and posts 20 ms frames.
class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.out = new Int16Array(320);
    this.n = 0;
    this.level = 0;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let peak = 0;
    // Linear-interpolation resampling to 16 kHz.
    while (this.pos < ch.length - 1) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      const s = ch[i] * (1 - f) + ch[i + 1] * f;
      const c = Math.max(-1, Math.min(1, s));
      if (Math.abs(c) > peak) peak = Math.abs(c);
      this.out[this.n++] = c < 0 ? c * 0x8000 : c * 0x7fff;
      if (this.n === this.out.length) {
        this.port.postMessage({ pcm: this.out.buffer, level: peak }, [this.out.buffer]);
        this.out = new Int16Array(320);
        this.n = 0;
        peak = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    if (this.pos < 0) this.pos = 0;
    return true;
  }
}

registerProcessor("mic-processor", MicProcessor);

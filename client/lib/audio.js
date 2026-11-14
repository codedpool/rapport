// Microphone capture (16 kHz PCM16 out) and gapless playback of 24 kHz PCM16 in.

export async function startMic({ onFrame, onLevel }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.audioWorklet.addModule("/worklets/mic-processor.js");
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "mic-processor");
  node.port.onmessage = (e) => {
    onFrame?.(e.data.pcm);
    onLevel?.(e.data.level);
  };
  src.connect(node);
  // The worklet must be pulled by the graph; route it through a muted gain.
  const sink = ctx.createGain();
  sink.gain.value = 0;
  node.connect(sink).connect(ctx.destination);
  if (ctx.state === "suspended") await ctx.resume();
  return {
    stream,
    stop() {
      try { node.port.onmessage = null; } catch {}
      try { src.disconnect(); node.disconnect(); } catch {}
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    },
  };
}

export class PcmPlayer {
  constructor(sampleRate = 24000) {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    this.sampleRate = sampleRate;
    this.playAt = 0;
    this.sources = new Set();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.ctx.destination);
    this._carry = null;
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  push(arrayBuffer) {
    let bytes = new Uint8Array(arrayBuffer);
    if (this._carry) {
      const merged = new Uint8Array(this._carry.length + bytes.length);
      merged.set(this._carry);
      merged.set(bytes, this._carry.length);
      bytes = merged;
      this._carry = null;
    }
    if (bytes.length % 2) {
      this._carry = bytes.slice(bytes.length - 1);
      bytes = bytes.slice(0, bytes.length - 1);
    }
    if (!bytes.length) return;
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    const buf = this.ctx.createBuffer(1, pcm.length, this.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.analyser);
    const now = this.ctx.currentTime;
    this.playAt = Math.max(this.playAt, now + 0.05);
    src.start(this.playAt);
    this.playAt += buf.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  // Barge-in: drop everything queued.
  flush() {
    for (const s of this.sources) {
      try { s.stop(); } catch {}
    }
    this.sources.clear();
    this.playAt = this.ctx.currentTime;
    this._carry = null;
  }

  level() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
    return peak / 128;
  }

  get playing() {
    return this.sources.size > 0;
  }

  close() {
    this.flush();
    this.ctx.close().catch(() => {});
  }
}

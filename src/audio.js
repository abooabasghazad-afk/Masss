/**
 * صداها به‌صورت زنده با WebAudio ساخته می‌شوند؛ هیچ فایل صوتی لازم نیست.
 */
class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noise = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.03);
    }
  }

  _noiseBuffer() {
    if (!this._noise) {
      const len = this.ctx.sampleRate * 1.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this._noise = buf;
    }
    return this._noise;
  }

  _noiseBurst({ duration = 0.2, gain = 0.2, type = 'lowpass', freq = 800, q = 0.7, sweep = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + duration);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  _tone({ freq = 440, to = freq, duration = 0.2, gain = 0.15, type = 'sine', delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  launch() {
    this._noiseBurst({ duration: 0.32, gain: 0.22, type: 'bandpass', freq: 1400, q: 0.9, sweep: -1100 });
    this._tone({ freq: 520, to: 140, duration: 0.28, gain: 0.09, type: 'triangle' });
  }

  stretch() {
    this._tone({ freq: 180, to: 300, duration: 0.08, gain: 0.04, type: 'sawtooth' });
  }

  thud(strength = 1) {
    this._noiseBurst({ duration: 0.16, gain: 0.1 * Math.min(strength, 2), type: 'lowpass', freq: 420 });
    this._tone({ freq: 150, to: 60, duration: 0.13, gain: 0.07, type: 'sine' });
  }

  woodBreak() {
    this._noiseBurst({ duration: 0.3, gain: 0.24, type: 'bandpass', freq: 900, q: 1.2, sweep: -500 });
    this._tone({ freq: 220, to: 70, duration: 0.25, gain: 0.1, type: 'square' });
  }

  stoneBreak() {
    this._noiseBurst({ duration: 0.42, gain: 0.28, type: 'lowpass', freq: 700, sweep: -450 });
    this._tone({ freq: 120, to: 45, duration: 0.35, gain: 0.12, type: 'sawtooth' });
  }

  iceBreak() {
    this._noiseBurst({ duration: 0.3, gain: 0.22, type: 'highpass', freq: 2200 });
    this._tone({ freq: 1500, to: 900, duration: 0.18, gain: 0.07, type: 'triangle' });
    this._tone({ freq: 2100, to: 1600, duration: 0.14, gain: 0.05, type: 'sine', delay: 0.03 });
  }

  pigPop() {
    this._tone({ freq: 760, to: 180, duration: 0.16, gain: 0.16, type: 'square' });
    this._tone({ freq: 420, to: 120, duration: 0.22, gain: 0.1, type: 'triangle', delay: 0.05 });
    this._noiseBurst({ duration: 0.12, gain: 0.12, type: 'bandpass', freq: 800 });
  }

  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this._tone({ freq: f, to: f, duration: 0.28, gain: 0.12, type: 'triangle', delay: i * 0.11 }));
    this._tone({ freq: 1046, to: 1046, duration: 0.5, gain: 0.08, type: 'sine', delay: 0.5 });
  }

  lose() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this._tone({ freq: f, to: f * 0.98, duration: 0.3, gain: 0.12, type: 'triangle', delay: i * 0.14 }));
  }

  click() {
    this._tone({ freq: 720, to: 900, duration: 0.06, gain: 0.06, type: 'sine' });
  }

  star(index = 0) {
    this._tone({ freq: 880 + index * 160, to: 1200 + index * 160, duration: 0.2, gain: 0.1, type: 'triangle' });
  }
}

export const sfx = new Audio();

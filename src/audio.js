/* ═══════════════════════════════════════════════
   موتور صوتی — همه‌ی صداها با Web Audio API ساخته می‌شوند
   ═══════════════════════════════════════════════ */

const MUTE_KEY = 'ab3d_muted'

class AudioSys {
  constructor() {
    this.ctx = null
    this.master = null
    this.musicGain = null
    this.sfxGain = null
    this.muted = localStorage.getItem(MUTE_KEY) === '1'
    this.musicTimer = null
    this.musicStep = 0
    this.birdTimer = null
  }

  /** باید از یک رویداد کاربر صدا زده شود */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.55
      this.master.connect(this.ctx.destination)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 1
      this.sfxGain.connect(this.master)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.16
      this.musicGain.connect(this.master)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  setMuted(m) {
    this.muted = m
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05)
    return this.muted
  }
  toggleMute() { return this.setMuted(!this.muted) }

  now() { return this.ctx ? this.ctx.currentTime : 0 }

  /* ── ابزارهای پایه ─────────────────────────── */
  tone({ freq = 440, type = 'sine', dur = 0.3, vol = 0.5, when = 0, slideTo = null, attack = 0.008, curve = 'exp' }) {
    const ctx = this.ensure(); if (!ctx) return
    const t0 = ctx.currentTime + when
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (slideTo) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
      else o.frequency.linearRampToValueAtTime(slideTo, t0 + dur)
    }
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(this.sfxGain)
    o.start(t0); o.stop(t0 + dur + 0.05)
  }

  noise({ dur = 0.3, vol = 0.4, when = 0, freq = 1000, q = 0.8, type = 'bandpass', slideTo = null }) {
    const ctx = this.ensure(); if (!ctx) return
    const t0 = ctx.currentTime + when
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(f); f.connect(g); g.connect(this.sfxGain)
    src.start(t0)
  }

  /* ── افکت‌ها ────────────────────────────────── */
  click() { this.tone({ freq: 660, type: 'triangle', dur: 0.07, vol: 0.25 }) }

  launch() {
    this.noise({ dur: 0.4, vol: 0.5, freq: 500, slideTo: 2600, type: 'bandpass', q: 1.4 })
    this.tone({ freq: 220, type: 'sine', dur: 0.35, vol: 0.35, slideTo: 660 })
  }

  birdSelect() { this.tone({ freq: 880, type: 'square', dur: 0.06, vol: 0.12 }) }

  birdCry() {
    // جیر-جیر خشمگین پرنده
    this.tone({ freq: 1400, type: 'square', dur: 0.09, vol: 0.14, slideTo: 1900 })
    this.tone({ freq: 1500, type: 'square', dur: 0.08, vol: 0.12, when: 0.1, slideTo: 1100 })
  }

  chirpFast() {
    this.tone({ freq: 1700, type: 'square', dur: 0.07, vol: 0.16, slideTo: 2400 })
    this.tone({ freq: 2100, type: 'square', dur: 0.07, vol: 0.14, when: 0.06, slideTo: 2800 })
  }

  hitWood(intensity = 1) {
    const v = Math.min(1, 0.3 + intensity * 0.5)
    this.noise({ dur: 0.12, vol: v, freq: 900, q: 1.2, type: 'bandpass' })
    this.tone({ freq: 180, type: 'triangle', dur: 0.14, vol: v * 0.8, slideTo: 90 })
  }

  hitStone(intensity = 1) {
    const v = Math.min(1, 0.3 + intensity * 0.5)
    this.noise({ dur: 0.1, vol: v, freq: 2400, q: 2.5, type: 'highpass' })
    this.tone({ freq: 95, type: 'square', dur: 0.16, vol: v * 0.55, slideTo: 60 })
  }

  hitIce(intensity = 1) {
    const v = Math.min(1, 0.3 + intensity * 0.5)
    this.noise({ dur: 0.22, vol: v, freq: 5200, q: 3.5, type: 'highpass' })
    this.tone({ freq: 2400 + Math.random() * 800, type: 'sine', dur: 0.28, vol: v * 0.4, slideTo: 3200 })
  }

  crack() {
    this.noise({ dur: 0.16, vol: 0.7, freq: 1300, q: 0.9 })
    this.tone({ freq: 140, type: 'triangle', dur: 0.18, vol: 0.5, slideTo: 70 })
  }

  pigHurt() { this.tone({ freq: 720, type: 'square', dur: 0.09, vol: 0.18, slideTo: 500 }) }

  pigPop() {
    this.noise({ dur: 0.2, vol: 0.55, freq: 800, slideTo: 300, type: 'bandpass' })
    this.tone({ freq: 500, type: 'sine', dur: 0.28, vol: 0.5, slideTo: 900 })
    this.tone({ freq: 1050, type: 'triangle', dur: 0.2, vol: 0.3, when: 0.09, slideTo: 1500 })
  }

  explosion() {
    this.noise({ dur: 1.15, vol: 1.0, freq: 300, slideTo: 60, type: 'lowpass', q: 0.6 })
    this.tone({ freq: 82, type: 'sine', dur: 1.0, vol: 0.9, slideTo: 34 })
    this.noise({ dur: 0.4, vol: 0.5, freq: 1800, when: 0.03, type: 'bandpass' })
  }

  tntBeep() { this.tone({ freq: 1850, type: 'square', dur: 0.08, vol: 0.2 }) }

  win() {
    const seq = [523.25, 659.25, 783.99, 1046.5]
    seq.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.34, vol: 0.5, when: i * 0.17 }))
    this.tone({ freq: 1318.5, type: 'triangle', dur: 0.7, vol: 0.5, when: 0.7 })
    this.noise({ dur: 0.8, vol: 0.15, freq: 6000, when: 0.7, type: 'highpass' })
  }

  lose() {
    const seq = [392, 349.23, 311.13, 233.08]
    seq.forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.4, vol: 0.22, when: i * 0.24 }))
  }

  starDing(i = 0) {
    this.tone({ freq: 1320 + i * 320, type: 'sine', dur: 0.5, vol: 0.4 })
    this.tone({ freq: 2640 + i * 640, type: 'sine', dur: 0.35, vol: 0.18, when: 0.05 })
  }

  /* ── موسیقی متن ملایم (آرپژ) ───────────────── */
  startMusic() {
    const ctx = this.ensure(); if (!ctx || this.musicTimer) return
    const scale = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63] // C E G C G E
    this.musicStep = 0
    this.musicTimer = setInterval(() => {
      if (this.muted) return
      const f = scale[this.musicStep % scale.length]
      const t0 = this.ctx.currentTime
      const o = this.ctx.createOscillator()
      const o2 = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.type = 'triangle'; o.frequency.value = f
      o2.type = 'sine'; o2.frequency.value = f * 2
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9)
      const g2 = this.ctx.createGain(); g2.gain.value = 0.35
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.musicGain)
      o.start(t0); o.stop(t0 + 2); o2.start(t0); o2.stop(t0 + 2)
      this.musicStep++
    }, 620)
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null }
  }

  /** چکاچک تصادفی پرنده‌ها در پس‌زمینه منو */
  startAmbientBirds() {
    const ctx = this.ensure(); if (!ctx || this.birdTimer) return
    this.birdTimer = setInterval(() => {
      if (this.muted || Math.random() < 0.4) return
      const base = 1800 + Math.random() * 1400
      this.tone({ freq: base, type: 'sine', dur: 0.06, vol: 0.05, slideTo: base * 1.35 })
      this.tone({ freq: base * 1.1, type: 'sine', dur: 0.05, vol: 0.04, when: 0.12, slideTo: base * 0.8 })
    }, 2600)
  }

  stopAmbientBirds() {
    if (this.birdTimer) { clearInterval(this.birdTimer); this.birdTimer = null }
  }
}

export const audio = new AudioSys()

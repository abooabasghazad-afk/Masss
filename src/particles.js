/* ═══════════════════════════════════════════════
   سیستم ذرات با ShaderMaterial — چیپس چوب، یخ،
   پُف خوک، پر پرنده، آتش و دود
   ═══════════════════════════════════════════════ */
import * as THREE from 'three'

const MAX = 900

const VERT = /* glsl */`
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (260.0 / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.1, d) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

export class Particles {
  constructor(scene) {
    this.scene = scene
    this.positions = new Float32Array(MAX * 3)
    this.colors = new Float32Array(MAX * 3)
    this.sizes = new Float32Array(MAX)
    this.alphas = new Float32Array(MAX)
    // وضعیت‌های داخلی
    this.vel = new Float32Array(MAX * 3)
    this.life = new Float32Array(MAX)
    this.maxLife = new Float32Array(MAX)
    this.grav = new Float32Array(MAX)
    this.drag = new Float32Array(MAX)
    this.baseSize = new Float32Array(MAX)
    this.count = 0

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage))
    geo.setDrawRange(0, 0)

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    })
    this.points = new THREE.Points(geo, mat)
    this.points.frustumCulled = false
    this.points.renderOrder = 20
    scene.add(this.points)
    this.geo = geo
  }

  spawn(x, y, z, opts = {}) {
    const {
      count = 12,
      colors = ['#ffffff'],
      speed = 6,
      speedSpread = 0.6,
      up = 3.5,
      gravity = 12,
      size = 1.4,
      sizeSpread = 0.8,
      life = 1.1,
      lifeSpread = 0.6,
      drag = 1.6,
      direction = null,      // اگر داده شود، ذرات به آن سو متمایل می‌شوند
      dirStrength = 0,
    } = opts

    for (let n = 0; n < count; n++) {
      if (this.count >= MAX) return
      const i = this.count++
      const i3 = i * 3
      this.positions[i3] = x; this.positions[i3 + 1] = y; this.positions[i3 + 2] = z

      // جهت تصادفی کروی
      let dx = Math.random() * 2 - 1
      let dy = Math.random() * 2 - 1
      let dz = Math.random() * 2 - 1
      const len = Math.hypot(dx, dy, dz) || 1
      dx /= len; dy /= len; dz /= len
      dy = Math.abs(dy) * 0.6 + 0.4 // کمی رو به بالا

      // ترکیب با جهت اصلی
      let vx = dx * speed + (direction ? direction.x * dirStrength : 0)
      let vy = dy * speed * up * 0.45 + (direction ? direction.y * dirStrength : 0)
      let vz = dz * speed + (direction ? direction.z * dirStrength : 0)
      const sp = 1 + (Math.random() - 0.5) * speedSpread
      vx *= sp; vy *= sp; vz *= sp
      this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz

      const c = new THREE.Color(colors[(Math.random() * colors.length) | 0])
      this.colors[i3] = c.r; this.colors[i3 + 1] = c.g; this.colors[i3 + 2] = c.b

      const L = Math.max(0.15, life + (Math.random() - 0.5) * lifeSpread)
      this.life[i] = L
      this.maxLife[i] = L
      this.grav[i] = gravity
      this.drag[i] = drag
      this.baseSize[i] = Math.max(0.3, size + (Math.random() - 0.5) * sizeSpread)
      this.sizes[i] = this.baseSize[i]
      this.alphas[i] = 1
    }
  }

  update(dt) {
    if (this.count === 0) return
    let i = 0
    while (i < this.count) {
      this.life[i] -= dt
      if (this.life[i] <= 0) {
        // حذف با جابجایی آخرین ذره
        const last = this.count - 1
        if (i !== last) this._copy(last, i)
        this.count--
        continue
      }
      const i3 = i * 3
      this.vel[i3 + 1] -= this.grav[i] * dt
      const d = Math.max(0, 1 - this.drag[i] * dt)
      this.vel[i3] *= d; this.vel[i3 + 1] *= d; this.vel[i3 + 2] *= d
      this.positions[i3] += this.vel[i3] * dt
      this.positions[i3 + 1] += this.vel[i3 + 1] * dt
      this.positions[i3 + 2] += this.vel[i3 + 2] * dt
      if (this.positions[i3 + 1] < 0.05) { // برخورد با زمین
        this.positions[i3 + 1] = 0.05
        this.vel[i3 + 1] *= -0.4
        this.vel[i3] *= 0.7; this.vel[i3 + 2] *= 0.7
      }
      const t = this.life[i] / this.maxLife[i]
      this.alphas[i] = t < 0.6 ? t / 0.6 : 1
      this.sizes[i] = this.baseSize[i] * (0.5 + t * 0.7)
      i++
    }
    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.aColor.needsUpdate = true
    this.geo.attributes.aSize.needsUpdate = true
    this.geo.attributes.aAlpha.needsUpdate = true
    this.geo.setDrawRange(0, this.count)
  }

  _copy(from, to) {
    const f3 = from * 3, t3 = to * 3
    this.positions[t3] = this.positions[f3]; this.positions[t3 + 1] = this.positions[f3 + 1]; this.positions[t3 + 2] = this.positions[f3 + 2]
    this.colors[t3] = this.colors[f3]; this.colors[t3 + 1] = this.colors[f3 + 1]; this.colors[t3 + 2] = this.colors[f3 + 2]
    this.vel[t3] = this.vel[f3]; this.vel[t3 + 1] = this.vel[f3 + 1]; this.vel[t3 + 2] = this.vel[f3 + 2]
    this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from]
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from]
    this.baseSize[to] = this.baseSize[from]; this.sizes[to] = this.sizes[from]; this.alphas[to] = this.alphas[from]
  }

  clear() { this.count = 0; this.geo.setDrawRange(0, 0) }

  dispose() {
    this.scene.remove(this.points)
    this.geo.dispose()
    this.points.material.dispose()
  }
}

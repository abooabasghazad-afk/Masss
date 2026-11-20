/* ═══════════════════════════════════════════════
   کارخانه‌ی مش‌ها: آسمان، زمین، پرنده‌ها، خوک‌ها،
   بلوک‌ها، منجنیق و دکور — همه با تکسچرهای Canvas
   ═══════════════════════════════════════════════ */
import * as THREE from 'three'

/* ── ابزار ساخت تکسچر از کانواس ─────────────── */
function makeTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat[0], repeat[1]) }
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
const rand = (a, b) => a + Math.random() * (b - a)

/* ── تکسچرهای رویه‌ای ───────────────────────── */
const grassTex = () => makeTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#58a83e'; ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${rand(40, 90) | 0}, ${rand(120, 175) | 0}, ${rand(35, 70) | 0}, ${rand(0.35, 0.8)})`
    ctx.fillRect(rand(0, w), rand(0, h), rand(2, 5), rand(2, 6))
  }
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath(); ctx.moveTo(rand(0, w), rand(0, h)); ctx.lineTo(rand(0, w), rand(0, h)); ctx.stroke()
  }
}, { repeat: [10, 10] })

const woodTex = () => makeTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += rand(14, 26)) {
    ctx.fillStyle = `rgba(${rand(70, 110) | 0}, ${rand(42, 66) | 0}, ${rand(18, 32) | 0}, ${rand(0.5, 0.9)})`
    ctx.fillRect(0, y, w, rand(4, 9))
  }
  for (let i = 0; i < 26; i++) { // رگه‌های طولی
    ctx.strokeStyle = `rgba(60, 36, 14, ${rand(0.25, 0.55)})`
    ctx.lineWidth = rand(1, 2.4)
    ctx.beginPath()
    const y = rand(0, h)
    ctx.moveTo(0, y)
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 4)
    ctx.stroke()
  }
  // گره چوب
  ctx.fillStyle = 'rgba(62,38,16,0.85)'
  ctx.beginPath(); ctx.ellipse(rand(60, 190), rand(60, 190), 9, 6, rand(0, 3), 0, Math.PI * 2); ctx.fill()
})

const stoneTex = () => makeTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#828a99'; ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 700; i++) {
    const v = rand(90, 175) | 0
    ctx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 12}, ${rand(0.4, 0.9)})`
    const s = rand(2, 9)
    ctx.fillRect(rand(0, w), rand(0, h), s, s)
  }
  ctx.strokeStyle = 'rgba(45,50,62,0.6)'; ctx.lineWidth = 3
  for (let i = 0; i < 6; i++) { // ترک‌ها
    ctx.beginPath(); let x = rand(0, w), y = rand(0, h)
    ctx.moveTo(x, y)
    for (let s = 0; s < 5; s++) { x += rand(-38, 38); y += rand(-38, 38); ctx.lineTo(x, y) }
    ctx.stroke()
  }
})

const dirtTex = () => makeTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#7c5a33'; ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(${rand(80, 150) | 0}, ${rand(55, 105) | 0}, ${rand(25, 60) | 0}, ${rand(0.4, 0.85)})`
    ctx.fillRect(rand(0, w), rand(0, h), rand(2, 6), rand(2, 6))
  }
}, { repeat: [3, 3] })

const tntTex = () => makeTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#c0392b'; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#8e2418'; ctx.fillRect(0, h * 0.14, w, h * 0.1); ctx.fillRect(0, h * 0.76, w, h * 0.1)
  ctx.fillStyle = '#f5efe0'
  ctx.font = '900 84px Arial Black, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('TNT', w / 2, h / 2 + 4)
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, w, h)
})

const skyTex = () => makeTexture(64, 512, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0.0, '#1c6dd9')
  g.addColorStop(0.35, '#3f8fe0')
  g.addColorStop(0.66, '#79bdf0')
  g.addColorStop(0.85, '#bce3f7')
  g.addColorStop(1.0, '#ffe9c4')
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
})

const glowTex = () => makeTexture(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2)
  g.addColorStop(0, 'rgba(255,255,235,1)')
  g.addColorStop(0.28, 'rgba(255,244,180,0.95)')
  g.addColorStop(0.62, 'rgba(255,228,130,0.35)')
  g.addColorStop(1, 'rgba(255,228,130,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
}, { srgb: false })

/* ── آسمان و خورشید ──────────────────────────── */
export function createSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(320, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false })
  )
  scene.add(sky)

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, depthTest: false, fog: false }))
  sun.scale.set(120, 120, 1)
  sun.position.set(70, 95, -190)
  scene.add(sun)

  const sunCore = new THREE.Mesh(
    new THREE.CircleGeometry(13, 32),
    new THREE.MeshBasicMaterial({ color: '#fffbe0', fog: false })
  )
  sunCore.position.copy(sun.position).z = -195
  sunCore.lookAt(0, 8, 0)
  scene.add(sunCore)
  return sky
}

export function createClouds(scene) {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#cfd8e2', emissiveIntensity: 0.35, flatShading: true })
  const clouds = []
  for (let i = 0; i < 8; i++) {
    const cloud = new THREE.Group()
    const puffs = 4 + (Math.random() * 3 | 0)
    for (let j = 0; j < puffs; j++) {
      const s = rand(1.6, 3.4)
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), mat)
      puff.position.set(j * rand(1.5, 2.1) - puffs, rand(-0.4, 0.6), rand(-1, 1))
      puff.scale.y = 0.72
      cloud.add(puff)
    }
    cloud.position.set(rand(-70, 90), rand(14, 24), rand(-48, 28))
    cloud.scale.setScalar(rand(0.9, 1.7))
    group.add(cloud)
    clouds.push({ node: cloud, speed: rand(0.25, 0.6) })
  }
  scene.add(group)
  return {
    update(dt) {
      for (const c of clouds) {
        c.node.position.x += c.speed * dt
        if (c.node.position.x > 110) c.node.position.x = -110
      }
    },
  }
}

/* ── زمین و دکور ─────────────────────────────── */
export function createGround(scene) {
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(150, 48),
    new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 1 })
  )
  grass.rotation.x = -Math.PI / 2
  grass.receiveShadow = true
  scene.add(grass)

  // زمین خاکی زیر منجنیق و قلعه
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 28),
    new THREE.MeshStandardMaterial({ map: dirtTex(), roughness: 1, transparent: true, opacity: 0.9 })
  )
  dirt.rotation.x = -Math.PI / 2
  dirt.position.set(-12, 0.01, 0)
  dirt.scale.set(1.35, 1.1, 1)
  dirt.receiveShadow = true
  scene.add(dirt)

  const dirt2 = dirt.clone(); dirt2.position.set(10.5, 0.012, 0); dirt2.scale.set(2.5, 1.6, 1); scene.add(dirt2)

  // تپه‌ها
  const hillMat = new THREE.MeshStandardMaterial({ color: '#3e7d33', roughness: 1, flatShading: true })
  const hillMat2 = new THREE.MeshStandardMaterial({ color: '#2f6130', roughness: 1, flatShading: true })
  const hillsData = [
    [-52, -38, 26, 10], [-20, -55, 34, 13], [22, -48, 30, 11], [62, -30, 22, 9],
    [-70, -8, 18, 7], [78, 6, 20, 8], [0, -70, 44, 15],
  ]
  for (const [x, z, r, h] of hillsData) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), Math.random() < 0.5 ? hillMat : hillMat2)
    hill.position.set(x, h / 2 - 0.4, z)
    scene.add(hill)
  }

  // درخت‌های کم‌پولی
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5d3f1e', roughness: 1 })
  const leafMat = new THREE.MeshStandardMaterial({ color: '#2f7a3d', roughness: .95, flatShading: true })
  const leafMat2 = new THREE.MeshStandardMaterial({ color: '#3f9148', roughness: .95, flatShading: true })
  const treeSpots = [
    [-19, -4], [-16, 5.5], [-23, 3], [18.5, -6], [23, -3.5], [25.5, 4], [4, -9], [-6, -8], [30, -8],
    [-28, -9], [14, 7.5], [-9, 8.5],
  ]
  for (const [x, z] of treeSpots) {
    const t = new THREE.Group()
    const s = rand(0.75, 1.3)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.36 * s, 1.6 * s, 7), trunkMat)
    trunk.position.y = 0.8 * s; trunk.castShadow = true
    t.add(trunk)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.55 * s, 3.1 * s, 8), Math.random() < 0.5 ? leafMat : leafMat2)
    cone.position.y = (1.6 + 1.55) * s; cone.castShadow = true
    t.add(cone)
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.05 * s, 2.1 * s, 8), leafMat2)
    cone2.position.y = (1.6 + 3.1) * s; cone2.castShadow = true
    t.add(cone2)
    t.position.set(x, 0, z)
    t.rotation.y = rand(0, Math.PI * 2)
    scene.add(t)
  }

  // گل‌ها
  const petalCols = ['#ff8ab3', '#ffd54a', '#ffffff', '#c99df0']
  for (let i = 0; i < 46; i++) {
    const f = new THREE.Group()
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), new THREE.MeshStandardMaterial({ color: '#3f9148' }))
    stem.position.y = 0.25; f.add(stem)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), new THREE.MeshStandardMaterial({ color: petalCols[(Math.random() * petalCols.length) | 0], roughness: .6 }))
    head.position.y = 0.55; f.add(head)
    let fx = rand(-26, 30), fz = rand(-12, 12)
    if (Math.abs(fx + 12) < 3 || (fx > 5 && fx < 17 && Math.abs(fz) < 3.5)) { fx += fx < 0 ? -4 : 4 } // خارج از محدوده‌ی بازی
    f.position.set(fx, 0, fz)
    scene.add(f)
  }

  // صخره‌ها
  const rockMat = new THREE.MeshStandardMaterial({ color: '#6f7684', roughness: 1, flatShading: true })
  for (const [x, z, s] of [[-15, -7, 1.1], [21, 2, 0.9], [-3, 6, 0.7], [28, -5, 1.4]]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat)
    rock.position.set(x, s * 0.55, z)
    rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3))
    rock.castShadow = true
    scene.add(rock)
  }
}

/* ── منجنیق ─────────────────────────────────── */
export const SLINGSHOT = {
  base: new THREE.Vector3(-12, 0, 0),
  anchor: new THREE.Vector3(-12, 3.55, 0),
  tipA: new THREE.Vector3(-12, 4.15, 0.66),
  tipB: new THREE.Vector3(-12, 4.15, -0.66),
  maxPull: 4.15,
  power: 6.4,
}

export function createSlingshot() {
  const group = new THREE.Group()
  const barkMat = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .9, color: '#a97b4f' })
  const darkMat = new THREE.MeshStandardMaterial({ color: '#4a2e14', roughness: .95 })

  // تنه
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 2.6, 9), barkMat)
  trunk.position.set(SLINGSHOT.base.x, 1.3, 0)
  trunk.castShadow = true
  group.add(trunk)

  // شاخه‌ها
  const branchLen = 2.35
  for (const side of [1, -1]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, branchLen, 8), barkMat)
    const from = new THREE.Vector3(SLINGSHOT.base.x, 2.15, 0)
    const to = side === 1 ? SLINGSHOT.tipA : SLINGSHOT.tipB
    const mid = from.clone().add(to).multiplyScalar(0.5)
    branch.position.copy(mid)
    const dir = to.clone().sub(from).normalize()
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    branch.castShadow = true
    group.add(branch)
    // نوار چرمی دور نوک شاخه
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.075, 8, 14), darkMat)
    wrap.position.copy(to)
    wrap.quaternion.copy(branch.quaternion)
    wrap.rotateX(Math.PI / 2)
    group.add(wrap)
  }

  // ریشه‌ها
  for (const [dx, dz, tilt] of [[-0.8, 0.35, 0.7], [0.75, -0.4, -0.65], [0.1, 0.85, 1.1]]) {
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.15, 6), darkMat)
    root.position.set(SLINGSHOT.base.x + dx, 0.32, dz)
    root.rotation.set(tilt * 0.6, 0, tilt)
    group.add(root)
  }
  return group
}

/** کش منجنیق — یک استوانه‌ی واحد که بین دو نقطه کشیده می‌شود */
export function createBandMesh() {
  const tex = makeTexture(16, 64, (ctx, w, h) => {
    ctx.fillStyle = '#5d2b16'; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(w * 0.3, 0, w * 0.16, h)
  })
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .95 })
  const geo = new THREE.CylinderGeometry(0.055, 0.055, 1, 6)
  // محور استوانه روی Y است؛ با quaternion بین دو نقطه قرار می‌گیرد
  const mesh = new THREE.Mesh(geo, mat)
  mesh.visible = false
  return mesh
}
export function stretchBand(mesh, from, to) {
  const dir = to.clone().sub(from)
  const len = dir.length()
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.scale.set(1, len, 1)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
}

/* ── پرنده‌ها ────────────────────────────────── */
export const BIRD_SPECS = {
  red:    { r: 0.55, color: '#e63b2e', belly: '#f8e3bd', dark: '#7e1710', crest: '#b3241b', stretch: 1.0 },
  yellow: { r: 0.50, color: '#ffd83d', belly: '#fff3b0', dark: '#7a5200', crest: '#f0b429', stretch: 1.28 },
  black:  { r: 0.58, color: '#2b2b33', belly: '#454550', dark: '#0d0d12', crest: '#e63b2e', stretch: 1.06 },
}

export function createBirdMesh(type) {
  const spec = BIRD_SPECS[type]
  const R = spec.r
  const g = new THREE.Group()

  const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: .42, metalness: .05 })
  const bellyMat = new THREE.MeshStandardMaterial({ color: spec.belly, roughness: .7 })
  const darkMat = new THREE.MeshStandardMaterial({ color: spec.dark, roughness: .6 })

  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 26, 20), bodyMat)
  body.scale.set(spec.stretch, 1, 1)
  body.castShadow = true
  g.add(body)

  // شکم
  const belly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.74, 18, 14), bellyMat)
  belly.scale.set(0.78, 0.66, 0.8)
  belly.position.set(R * 0.34, -R * 0.36, 0)
  g.add(belly)

  // چشم‌ها (رو به +x)
  const eyeWhite = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .25 })
  const pupilMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: .2 })
  for (const side of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.26, 12, 10), eyeWhite)
    eye.position.set(R * (spec.stretch - 0.12), R * 0.24, side * R * 0.33)
    g.add(eye)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(R * 0.125, 8, 8), pupilMat)
    pupil.position.set(R * (spec.stretch + 0.09), R * 0.24, side * R * 0.33)
    g.add(pupil)
    // ابروی خشمگین
    const brow = new THREE.Mesh(new THREE.BoxGeometry(R * 0.16, R * 0.09, R * 0.42), darkMat)
    brow.position.set(R * (spec.stretch - 0.02), R * 0.52, side * R * 0.33)
    brow.rotation.x = side * 0.48
    g.add(brow)
  }

  // نوک
  const beak = new THREE.Mesh(new THREE.ConeGeometry(R * 0.235, R * (type === 'yellow' ? 0.78 : 0.52), 12), new THREE.MeshStandardMaterial({ color: '#f6a21e', roughness: .5 }))
  beak.rotation.z = -Math.PI / 2
  beak.position.set(R * (spec.stretch + 0.22), -R * 0.06, 0)
  beak.castShadow = true
  g.add(beak)

  // دم
  for (const dz of [-0.2, 0, 0.2]) {
    const feather = new THREE.Mesh(new THREE.BoxGeometry(R * 0.62, R * 0.15, R * 0.075), type === 'red' ? darkMat : new THREE.MeshStandardMaterial({ color: '#141418', roughness: .6 }))
    feather.position.set(-R * spec.stretch * 0.92, R * 0.22 + Math.abs(dz) * -0.25, dz * R * 1.35)
    feather.rotation.z = 0.62
    g.add(feather)
  }

  // کاکل
  for (const dz of [-0.09, 0.09]) {
    const crest = new THREE.Mesh(new THREE.ConeGeometry(R * 0.075, R * 0.42, 6), new THREE.MeshStandardMaterial({ color: spec.crest, roughness: .6 }))
    crest.position.set(-R * 0.05, R * 1.12, dz * R)
    crest.rotation.z = 0.38
    g.add(crest)
  }

  // جزئیات ویژه
  if (type === 'black') {
    // فتیله‌ی بمب
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.05, R * 0.05, R * 0.34, 6), new THREE.MeshStandardMaterial({ color: '#111', roughness: .8 }))
    fuse.position.set(0, R * 1.13, 0); fuse.rotation.z = 0.4
    g.add(fuse)
    const spark = new THREE.Mesh(new THREE.SphereGeometry(R * 0.075, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffd23d' }))
    spark.position.set(R * 0.13, R * 1.28, 0)
    spark.name = 'spark'
    g.add(spark)
  } else if (type === 'red') {
    // لکه‌ی سفید گونه
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(R * 0.12, 8, 8), new THREE.MeshStandardMaterial({ color: '#ff8d7a', roughness: .6 }))
    cheek.position.set(R * (spec.stretch - 0.25), -R * 0.05, R * 0.47)
    g.add(cheek)
    const cheek2 = cheek.clone(); cheek2.position.z = -R * 0.47; g.add(cheek2)
  }
  return { group: g, radius: R }
}

/* ── خوک‌ها ──────────────────────────────────── */
export const PIG_SPECS = {
  small:  { r: 0.42, color: '#79c94f' },
  normal: { r: 0.55, color: '#69c24a' },
  king:   { r: 0.78, color: '#4fae3d' },
}

export function createPigMesh(size) {
  const spec = PIG_SPECS[size]
  const R = spec.r
  const g = new THREE.Group()
  const green = new THREE.MeshStandardMaterial({ color: spec.color, roughness: .5 })
  const lightGreen = new THREE.MeshStandardMaterial({ color: '#93dd6c', roughness: .55 })

  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 22, 16), green)
  body.scale.y = 0.94
  body.castShadow = true
  g.add(body)

  // گوش‌ها
  for (const side of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(R * 0.24, R * 0.34, 7), green)
    ear.position.set(0, R * 0.95, side * R * 0.42)
    ear.rotation.x = side * 0.35
    g.add(ear)
  }

  // دماغ (رو به -x، یعنی رو به پرنده‌ها)
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.34, R * 0.34, R * 0.22, 14), lightGreen)
  snout.rotation.z = Math.PI / 2
  snout.position.set(-R * 0.93, -R * 0.05, 0)
  g.add(snout)
  const nostrilMat = new THREE.MeshStandardMaterial({ color: '#2d5a1e', roughness: .7 })
  for (const side of [1, -1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(R * 0.062, 6, 6), nostrilMat)
    n.position.set(-R * 1.045, -R * 0.05, side * R * 0.13)
    g.add(n)
  }

  // چشم‌ها (رو به -x)
  const white = new THREE.MeshStandardMaterial({ color: '#fff', roughness: .25 })
  const pupil = new THREE.MeshStandardMaterial({ color: '#141814', roughness: .2 })
  for (const side of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(R * (size === 'king' ? 0.21 : 0.19), 10, 8), white)
    eye.position.set(-R * 0.66, R * 0.34, side * R * 0.37)
    g.add(eye)
    const p = new THREE.Mesh(new THREE.SphereGeometry(R * 0.095, 8, 8), pupil)
    p.position.set(-R * 0.8, R * 0.35, side * R * 0.37)
    g.add(p)
  }

  if (size === 'king') {
    // ابروهای اخمو
    for (const side of [1, -1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(R * 0.3, R * 0.085, R * 0.3), new THREE.MeshStandardMaterial({ color: '#1e3d15' }))
      brow.position.set(-R * 0.68, R * 0.58, side * R * 0.37)
      brow.rotation.x = -side * 0.5
      g.add(brow)
    }
    // تاج طلایی
    const gold = new THREE.MeshStandardMaterial({ color: '#ffd23d', roughness: .3, metalness: .75, emissive: '#5a3d00', emissiveIntensity: .5 })
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.42, R * 0.46, R * 0.28, 10), gold)
    band.position.set(0, R * 1.02, 0)
    g.add(band)
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2
      const spike = new THREE.Mesh(new THREE.ConeGeometry(R * 0.09, R * 0.3, 6), gold)
      spike.position.set(Math.cos(ang) * R * 0.4, R * 1.26, Math.sin(ang) * R * 0.4)
      g.add(spike)
    }
  }
  return { group: g, radius: R }
}

/* ── بلوک‌ها ─────────────────────────────────── */
export function createBlockMesh(mat, sx, sy, sz) {
  const tex = mat === 'wood' ? woodTex() : mat === 'stone' ? stoneTex() : null
  const material = mat === 'ice'
    ? new THREE.MeshStandardMaterial({ color: '#b7e6f5', roughness: .08, metalness: .05, transparent: true, opacity: .8, emissive: '#4d6b78', emissiveIntensity: .35 })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: mat === 'stone' ? .95 : .82 })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  // لبه‌های کارتونی
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: mat === 'ice' ? 0x2d5a6b : 0x1d1208, transparent: true, opacity: .35 })
  )
  mesh.add(edges)
  return mesh
}

export function createTNTMesh(sx, sy, sz) {
  const tex = tntTex()
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ map: tex, roughness: .6, emissive: '#3d0d06', emissiveIntensity: .6 })
  )
  mesh.castShadow = true
  // فتیله
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), new THREE.MeshStandardMaterial({ color: '#151515' }))
  fuse.position.set(0, sy / 2 + 0.12, 0)
  mesh.add(fuse)
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffd23d' }))
  spark.position.set(0, sy / 2 + 0.3, 0)
  spark.name = 'spark'
  mesh.add(spark)
  return mesh
}

/* ── نقاط مسیر پیش‌بینی ──────────────────────── */
export function createTrajectoryDots(scene, count = 18) {
  const group = new THREE.Group()
  const dots = []
  const geo = new THREE.SphereGeometry(0.09, 8, 8)
  for (let i = 0; i < count; i++) {
    const t = 1 - i / count
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25 + t * 0.6, depthWrite: false }))
    m.scale.setScalar(0.6 + t * 0.9)
    m.visible = false
    group.add(m)
    dots.push(m)
  }
  scene.add(group)
  return { group, dots }
}

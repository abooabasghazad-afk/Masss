/* تست دود بدون مرورگر: اجرای منطق ساخت مش‌ها و ذرات با بوم جعلی */
const gradient = { addColorStop() {} }
function fakeCtx() {
  const t = {}
  return new Proxy(t, {
    get(t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => gradient
      if (prop === 'measureText') return () => ({ width: 10 })
      if (prop in t) return t[prop]
      return () => undefined
    },
    set(t, prop, value) { t[prop] = value; return true },
  })
}
const fakeCanvas = () => ({ width: 300, height: 300, style: {}, getContext: () => fakeCtx(), addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {} })
globalThis.document = { createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : {}), createElementNS: (ns, tag) => fakeCanvas(), body: { appendChild() {} } }
globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, innerHeight: 810, addEventListener() {} }
globalThis.localStorage = { getItem: () => null, setItem() {} }
globalThis.performance = { now: () => Date.now() }

const THREE = await import('three')
const B = await import('../src/builders.js')
const { Particles } = await import('../src/particles.js')
const LEVELS = (await import('../src/levels.js')).LEVELS

const scene = new THREE.Scene()
B.createSky(scene)
B.createGround(scene)
B.createClouds(scene)
scene.add(B.createSlingshot())
for (const type of ['red', 'yellow', 'black']) { const b = B.createBirdMesh(type); console.log('bird', type, 'radius', b.radius, 'children', b.group.children.length) }
for (const size of ['small', 'normal', 'king']) { const p = B.createPigMesh(size); console.log('pig', size, 'radius', p.radius, 'children', p.group.children.length) }
for (const mat of ['wood', 'ice', 'stone']) { B.createBlockMesh(mat, 1.2, 2, 0.8); console.log('block', mat, 'ok') }
B.createTNTMesh(1.15, 1.15, 1.15); console.log('tnt ok')
const band = B.createBandMesh(); B.stretchBand(band, B.SLINGSHOT.tipA, B.SLINGSHOT.anchor); console.log('band ok, tipA', B.SLINGSHOT.tipA.toArray().join(','))
B.createTrajectoryDots(scene, 20); console.log('trajectory ok')

// تعداد آبجکت‌ها برای همه‌ی مراحل بسازیم
for (const level of LEVELS) {
  for (const item of level.items) {
    if (item.k === 'block') B.createBlockMesh(item.mat, item.sx, item.sy, item.sz)
    else if (item.k === 'pig') B.createPigMesh(item.size)
    else if (item.k === 'tnt') B.createTNTMesh(item.sx ?? 1.15, item.sy ?? 1.15, item.sz ?? 1.15)
  }
}
console.log('ساخت مش همه‌ی مراحل ✓')

// ذرات: ساخت، بروزرسانی، پاک‌سازی
const particles = new Particles(scene)
particles.spawn(0, 3, 0, { count: 200, colors: ['#ff0000', '#00ff00'], speed: 8 })
for (let i = 0; i < 120; i++) particles.update(1 / 60)
console.log('particles alive after 2s:', particles.count)

// جمع‌آوری موقعیت گرهٔ میدان برای اطمینان از عدم خطای NaN
let nan = 0
scene.traverse((o) => { if (o.position && (Number.isNaN(o.position.x) || Number.isNaN(o.position.y) || Number.isNaN(o.position.z))) nan++ })
console.log('NaN positions:', nan)
console.log('scene children:', scene.children.length)
console.log('SMOKE OK')

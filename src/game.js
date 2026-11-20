/* ═══════════════════════════════════════════════
   هسته‌ی بازی «پرندگان خشمگین سه‌بعدی»
   رندر: Three.js  |  فیزیک: cannon-es
   ═══════════════════════════════════════════════ */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as CANNON from 'cannon-es'
import * as B from './builders.js'
import { LEVELS, MATERIALS, PIG_TYPES, TNT, BIRD_INFO } from './levels.js'
import { Particles } from './particles.js'
import { audio } from './audio.js'

const GRAVITY = 20
const faNum = (n) => Math.round(n).toLocaleString('fa-IR')
const OVERVIEW_POS = new THREE.Vector3(1.5, 6.4, 21.5)
const OVERVIEW_TGT = new THREE.Vector3(0.2, 2.1, 0)

export class Game {
  /**
   * @param canvas canvas HTML
   * @param ui     اتصال‌دهنده به رابط کاربری (کال‌بک‌ها)
   */
  constructor(canvas, ui) {
    this.canvas = canvas
    this.ui = ui
    this.state = 'menu' // menu | aim | flying | resolving | won | lost
    this.paused = false
    this.levelIndex = 0
    this.score = 0
    this.birdsAll = []
    this.birdsUsed = 0
    this.birdQueue = []
    this.pigsLeft = 0
    this.activeBird = null
    this.dragging = false
    this.dragPlane = new THREE.Plane()
    this.shake = 0
    this.camGoal = OVERVIEW_TGT.clone()
    this.lastBirdX = -12
    this.time = 0
    this.resolveTimer = -1
    this.winTimer = -1
    this.structure = []   // {body, mesh, kind, mat?, hp, maxHp, score}
    this.effects = []     // موج انفجار
    this._deferQueue = [] // توابعی که باید بعد از world.step اجرا شوند
    this._tmp = new THREE.Vector3()

    this._initRenderer()
    this._initScene()
    this._initPhysics()
    this._initInput()
    this._loop = this._loop.bind(this)
    requestAnimationFrame(this._loop)
  }

  /* ══════════ راه‌اندازی ══════════ */
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 500)
    this.camera.position.set(-6, 8.5, 17)

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  _initScene() {
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0xbfe0f2, 60, 165)

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3d6b34, 0.95)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xfff3dd, 1.9)
    sun.position.set(14, 26, 15)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -24; sun.shadow.camera.right = 24
    sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -18
    sun.shadow.camera.near = 2; sun.shadow.camera.far = 70
    sun.shadow.bias = -0.0006
    sun.shadow.normalBias = 0.03
    this.scene.add(sun)
    const fill = new THREE.DirectionalLight(0xa8c8ff, 0.5)
    fill.position.set(-18, 10, -12)
    this.scene.add(fill)

    B.createSky(this.scene)
    B.createGround(this.scene)
    this.clouds = B.createClouds(this.scene)
    this.scene.add(B.createSlingshot())

    this.structureGroup = new THREE.Group()
    this.scene.add(this.structureGroup)

    this.bandA = B.createBandMesh(); this.scene.add(this.bandA)
    this.bandB = B.createBandMesh(); this.scene.add(this.bandB)

    this.traj = B.createTrajectoryDots(this.scene, 20)
    this.particles = new Particles(this.scene)

    // کنترل دوربین
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.07
    this.controls.enablePan = false
    this.controls.minDistance = 9
    this.controls.maxDistance = 36
    this.controls.minPolarAngle = 0.45
    this.controls.maxPolarAngle = 1.5
    this.controls.target.copy(OVERVIEW_TGT)
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.8
  }

  _initPhysics() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVITY, 0) })
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.allowSleep = true
    this.world.solver.iterations = 14
    this.world.defaultContactMaterial.friction = 0.45
    this.world.defaultContactMaterial.restitution = 0.15

    this.matGround = new CANNON.Material('ground')
    this.matBody = new CANNON.Material('body')
    this.matBird = new CANNON.Material('bird')
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.matGround, this.matBody, { friction: 0.5, restitution: 0.12 }))
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.matGround, this.matBird, { friction: 0.35, restitution: 0.2 }))
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.matBird, this.matBody, { friction: 0.3, restitution: 0.28 }))

    const ground = new CANNON.Body({ type: CANNON.Body.STATIC, material: this.matGround })
    ground.addShape(new CANNON.Plane())
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.world.addBody(ground)
    this.groundBody = ground
  }

  /* ══════════ مدیریت مراحل ══════════ */
  loadLevel(index, { toMenu = false } = {}) {
    this.levelIndex = index
    const level = LEVELS[index]
    this._clearStructure()
    this.score = 0
    this.birdsAll = [...level.birds]
    this.birdsUsed = 0
    this.birdQueue = [...level.birds]
    this.pigsLeft = 0
    this.effects.forEach((e) => this.scene.remove(e.mesh))
    this.effects = []
    this.particles.clear()
    this.resolveTimer = -1
    this.winTimer = -1
    this.activeBird = null
    this.dragging = false

    // ساخت دکور مرحله
    for (const item of level.items) this._buildItem(item)

    this.ui.onLevel(`مرحله ${faNum(level.id)} — ${level.name}`)
    this.ui.onScore(0)
    this.ui.onBirds(this.birdsAll, 0, false)
    this.ui.onPigsLeft(this.pigsLeft)
    this.paused = false
    this.controls.autoRotate = toMenu
    this.camGoal.copy(OVERVIEW_TGT)
    if (!toMenu) {
      this.camera.position.copy(OVERVIEW_POS)
      this.controls.target.copy(OVERVIEW_TGT)
      this.spawnBird()
      this.ui.toast(level.hint)
    } else {
      this.state = 'menu'
    }
  }

  backToMenu() {
    this.loadLevel(2, { toMenu: true }) // دکور زیبا برای منو (مرحله ۳)
    this.camera.position.set(-2, 8.2, 16.5)
    this.controls.target.set(-1, 2.4, 0)
    this.camGoal.set(-1, 2.4, 0)
  }

  _clearStructure() {
    for (const it of this.structure) {
      this.world.removeBody(it.body)
      this.structureGroup.remove(it.mesh)
    }
    this.structure = []
    if (this.activeBird) {
      this.world.removeBody(this.activeBird.body)
      this.scene.remove(this.activeBird.mesh)
      this.activeBird = null
    }
    this.birdsAll = []
    this.birdQueue = []
    this.bandA.visible = false
    this.bandB.visible = false
  }

  _buildItem(item) {
    if (item.k === 'block') {
      const mat = MATERIALS[item.mat]
      const { sx, sy, sz } = item
      const mesh = B.createBlockMesh(item.mat, sx, sy, sz)
      mesh.position.set(item.x, item.y0 + sy / 2, item.z)
      this.structureGroup.add(mesh)
      const body = new CANNON.Body({
        mass: Math.max(0.7, sx * sy * sz * mat.density),
        material: this.matBody,
        allowSleep: true,
        sleepSpeedLimit: 0.35,
        sleepTimeLimit: 0.6,
      })
      body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)))
      body.position.set(item.x, item.y0 + sy / 2 + 0.002, item.z)
      const ref = { body, mesh, kind: 'block', hp: mat.hp, maxHp: mat.hp, score: mat.score, mat: item.mat, flash: 0 }
      body.gameRef = ref
      body.addEventListener('collide', (e) => this._onCollide(body, e))
      this.structure.push(ref)
      this.world.addBody(body)
    } else if (item.k === 'pig') {
      const spec = PIG_TYPES[item.size]
      const { group } = B.createPigMesh(item.size)
      const cy = item.y0 + spec.r
      group.position.set(item.x, cy, item.z)
      this.structureGroup.add(group)
      const body = new CANNON.Body({
        mass: item.size === 'king' ? 3.2 : item.size === 'normal' ? 1.15 : 0.55,
        material: this.matBody,
        allowSleep: true,
        sleepSpeedLimit: 0.35,
        sleepTimeLimit: 0.6,
      })
      body.addShape(new CANNON.Sphere(spec.r * 0.92))
      body.position.set(item.x, cy + 0.002, item.z)
      const ref = { body, mesh: group, kind: 'pig', hp: spec.hp, maxHp: spec.hp, score: spec.score, sizeKey: item.size, flash: 0, wobble: 0, phase: Math.random() * Math.PI * 2 }
      body.gameRef = ref
      body.addEventListener('collide', (e) => this._onCollide(body, e))
      this.structure.push(ref)
      this.pigsLeft++
      this.world.addBody(body)
    } else if (item.k === 'tnt') {
      const sx = item.sx ?? TNT.size.x, sy = item.sy ?? TNT.size.y, sz = item.sz ?? TNT.size.z
      const mesh = B.createTNTMesh(sx, sy, sz)
      mesh.position.set(item.x, item.y0 + sy / 2, item.z)
      this.structureGroup.add(mesh)
      const body = new CANNON.Body({
        mass: 1.7,
        material: this.matBody,
        allowSleep: true,
        sleepSpeedLimit: 0.35,
        sleepTimeLimit: 0.6,
      })
      body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)))
      body.position.set(item.x, item.y0 + sy / 2 + 0.002, item.z)
      const ref = { body, mesh, kind: 'tnt', hp: TNT.hp, maxHp: TNT.hp, score: TNT.score, flash: 0 }
      body.gameRef = ref
      body.addEventListener('collide', (e) => this._onCollide(body, e))
      this.structure.push(ref)
      this.world.addBody(body)
    }
  }

  /** اجرای تعویقی توابعی که بدن‌ها را از world حذف می‌کنند (هرگز داخل collide صدا زده نمی‌شوند) */
  _defer(fn) { this._deferQueue.push(fn) }

  /** مصرف پرنده‌ی سیاه: انفجار + حذف پرنده + ادامه‌ی چرخه */
  _consumeBlackBird(b) {
    if (!b) return
    const pos = b.mesh.position.clone()
    this._explode(pos, { radius: 4.8, damage: 95, impulse: 17, birdType: 'black' })
    this.world.removeBody(b.body)
    this.scene.remove(b.mesh)
    if (this.activeBird === b) this.activeBird = null
    this.birdQueue.shift()
    this.ui.abilityHint(false)
    this._afterBirdGone()
  }

  /* ══════════ چرخه‌ی پرنده ══════════ */
  spawnBird() {
    if (this.birdQueue.length === 0) return
    const type = this.birdQueue[0]
    const info = BIRD_INFO[type]
    const { group, radius } = B.createBirdMesh(type)
    group.position.copy(B.SLINGSHOT.anchor)
    this.scene.add(group)
    const body = new CANNON.Body({
      mass: info.mass,
      type: CANNON.Body.STATIC,
      material: this.matBird,
      allowSleep: false,
    })
    body.addShape(new CANNON.Sphere(radius * 0.92))
    body.position.set(B.SLINGSHOT.anchor.x, B.SLINGSHOT.anchor.y, B.SLINGSHOT.anchor.z)
    body.gameRef = { kind: 'bird' }
    body.addEventListener('collide', (e) => this._onCollide(body, e))
    this.world.addBody(body)

    this.activeBird = {
      type, body, mesh: group, r: radius,
      stopped: 0, launchTime: -1, abilityUsed: false, pulling: B.SLINGSHOT.anchor.clone(),
    }
    this.state = 'aim'
    this.ui.onBirds(this.birdsAll, this.birdsUsed, false)
    this.ui.abilityHint(type !== 'red')
    this._updateBands(B.SLINGSHOT.anchor)
    audio.birdCry()
  }

  launch() {
    const b = this.activeBird
    if (!b) return
    const v = B.SLINGSHOT.anchor.clone().sub(b.pulling).multiplyScalar(B.SLINGSHOT.power)
    b.body.type = CANNON.Body.DYNAMIC
    b.body.updateMassProperties()
    b.body.wakeUp()
    b.body.velocity.set(v.x, v.y, v.z)
    b.body.angularVelocity.set(0, 0, randSpin(v))
    b.launchTime = this.time
    this.state = 'flying'
    this.birdsUsed++
    this.ui.onBirds(this.birdsAll, this.birdsUsed, true)
    this.ui.abilityHint(b.type !== 'red')
    this.traj.dots.forEach((d) => (d.visible = false))
    this.bandA.visible = false
    this.bandB.visible = false
    audio.launch()
    // پُف گرد و غبار پشت منجنیق
    this.particles.spawn(B.SLINGSHOT.base.x, 1, 0, { count: 14, colors: ['#c9a26b', '#8a5a2b'], speed: 3, up: 1.4, size: 1.6, life: 0.7, gravity: 5 })
  }

  endBird() {
    const b = this.activeBird
    if (!b) return
    // پرها بپاشند!
    const cols = b.type === 'red' ? ['#e63b2e', '#b3241b', '#ffb3a6'] : b.type === 'yellow' ? ['#ffd83d', '#f0b429', '#fff3b0'] : ['#2b2b33', '#454550', '#8a8a99']
    this.particles.spawn(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, {
      count: 26, colors: cols, speed: 6.5, up: 2, size: 1.5, life: 1.0, gravity: 9,
    })
    this.world.removeBody(b.body)
    this.scene.remove(b.mesh)
    this.activeBird = null
    this.birdQueue.shift()
    this.camGoal.copy(OVERVIEW_TGT)
    if (this.pigsLeft === 0) { this._beginWin(); return }
    if (this.birdQueue.length === 0) { this._beginLose(); return }
    this.state = 'resolving'
    this.resolveTimer = 0.9
  }

  /* ══════════ ورودی ══════════ */
  _initInput() {
    const el = this.renderer.domElement
    const ndc = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()

    const setNDC = (e) => {
      const rect = el.getBoundingClientRect()
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    const rayFromEvent = (e) => {
      setNDC(e)
      raycaster.setFromCamera(ndc, this.camera)
      return raycaster.ray
    }
    const distRayPoint = (ray, p) => {
      const t = Math.max(0, this._tmp.copy(p).sub(ray.origin).dot(ray.direction))
      const closest = ray.origin.clone().addScaledVector(ray.direction, t)
      return closest.distanceTo(p)
    }
    const planePoint = (e, plane) => {
      const ray = rayFromEvent(e)
      const pt = new THREE.Vector3()
      return ray.intersectPlane(plane, pt) ? pt : null
    }

    el.addEventListener('pointerdown', (e) => {
      audio.ensure()
      if (this.state === 'aim' && this.activeBird) {
        const ray = rayFromEvent(e)
        const birdPos = this.activeBird.body.position
        const d = distRayPoint(ray, new THREE.Vector3(birdPos.x, birdPos.y, birdPos.z))
        if (d < 1.35) {
          this.dragging = true
          this.controls.enabled = false
          el.style.cursor = 'grabbing'
          try { el.setPointerCapture(e.pointerId) } catch { /* بدون کپچر هم کار می‌کند */ }
          const normal = new THREE.Vector3()
          this.camera.getWorldDirection(normal)
          this.dragPlane.setFromNormalAndCoplanarPoint(normal, B.SLINGSHOT.anchor)
          this._updatePull(e, planePoint)
          audio.birdSelect()
        }
      } else if (this.state === 'flying') {
        this._tapInfo = { x: e.clientX, y: e.clientY, t: performance.now() }
      }
    }, { capture: true })

    el.addEventListener('pointermove', (e) => {
      if (this.dragging) { this._updatePull(e, planePoint); return }
      // نشانگر دست روی پرنده
      if (this.state === 'aim' && this.activeBird) {
        const ray = rayFromEvent(e)
        const p = this.activeBird.body.position
        el.style.cursor = distRayPoint(ray, new THREE.Vector3(p.x, p.y, p.z)) < 1.35 ? 'grab' : 'default'
      }
    })

    const release = (e) => {
      if (this.dragging) {
        this.dragging = false
        this.controls.enabled = true
        el.style.cursor = 'default'
        try { el.releasePointerCapture(e.pointerId) } catch { /* noop */ }
        const pull = this.activeBird.pulling.clone().sub(B.SLINGSHOT.anchor)
        if (pull.length() > 1.05) this.launch()
        else {
          this.activeBird.body.position.set(B.SLINGSHOT.anchor.x, B.SLINGSHOT.anchor.y, B.SLINGSHOT.anchor.z)
          this.activeBird.pulling.copy(B.SLINGSHOT.anchor)
          this._hideTrajectory()
          this._updateBands(B.SLINGSHOT.anchor)
          audio.click()
        }
        return
      }
      // ضربه برای توانایی پرنده در هوا
      if (this.state === 'flying' && this._tapInfo) {
        const dx = e.clientX - this._tapInfo.x, dy = e.clientY - this._tapInfo.y
        if (Math.hypot(dx, dy) < 14 && performance.now() - this._tapInfo.t < 450) this._triggerAbility()
        this._tapInfo = null
      }
    }
    el.addEventListener('pointerup', release)
    el.addEventListener('pointercancel', release)
  }

  _updatePull(e, planePoint) {
    const pt = planePoint(e, this.dragPlane)
    if (!pt || !this.activeBird) return
    const pull = pt.clone().sub(B.SLINGSHOT.anchor)
    const max = B.SLINGSHOT.maxPull
    if (pull.length() > max) pull.setLength(max)
    const pos = B.SLINGSHOT.anchor.clone().add(pull)
    pos.y = Math.max(pos.y, 0.75) // زیر زمین نرود
    this.activeBird.pulling.copy(pos)
    this.activeBird.body.position.set(pos.x, pos.y, pos.z)
    this.activeBird.mesh.position.copy(pos)
    this._updateBands(pos)
    this._updateTrajectory(pos)
  }

  _updateBands(birdPos) {
    B.stretchBand(this.bandA, B.SLINGSHOT.tipA, birdPos)
    B.stretchBand(this.bandB, B.SLINGSHOT.tipB, birdPos)
    this.bandA.visible = true
    this.bandB.visible = true
  }

  _updateTrajectory(from) {
    const v = B.SLINGSHOT.anchor.clone().sub(from).multiplyScalar(B.SLINGSHOT.power)
    const p = B.SLINGSHOT.anchor.clone()
    const vel = v.clone()
    const dt = 0.085
    for (let i = 0; i < this.traj.dots.length; i++) {
      p.addScaledVector(vel, dt)
      vel.y -= GRAVITY * dt
      if (p.y < 0.06) { this.traj.dots[i].visible = false; continue }
      this.traj.dots[i].position.copy(p)
      this.traj.dots[i].visible = from.distanceTo(B.SLINGSHOT.anchor) > 0.6
    }
  }
  _hideTrajectory() { this.traj.dots.forEach((d) => (d.visible = false)) }

  _triggerAbility() {
    const b = this.activeBird
    if (!b || b.abilityUsed) return
    if (b.type === 'yellow') {
      b.body.velocity.scale(1.85)
      if (b.body.velocity.length() > 38) b.body.velocity.setLength(38)
      b.abilityUsed = true
      audio.chirpFast()
      this.particles.spawn(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, {
        count: 18, colors: ['#ffe94a', '#fffbe0', '#f0b429'], speed: 4, size: 1.3, life: 0.5, gravity: 1, up: 0.4,
      })
      this.ui.abilityHint(false)
    } else if (b.type === 'black') {
      b.abilityUsed = true
      this._consumeBlackBird(b) // خارج از مرحله‌ی فیزیک صدا زده می‌شود؛ امن
    } else {
      audio.birdCry()
    }
  }

  /* ══════════ برخورد و آسیب ══════════ */
  _onCollide(body, e) {
    const impact = Math.abs(e.contact.getImpactVelocityAlongNormal())
    if (impact < 3.2) return
    const other = e.body
    const effMass = other.type === CANNON.Body.STATIC || other.mass === 0 ? 1.25 : other.mass
    const dmg = Math.max(0, impact - 1.6) * (1.0 + 0.55 * Math.min(effMass, 10))
    const ref = body.gameRef

    // صدای ضربه بر اساس جنس قربانی
    if (ref && (ref.kind === 'block' || ref.kind === 'tnt')) {
      const inten = Math.min(1, impact / 18)
      if (ref.mat === 'wood' || ref.kind === 'tnt') audio.hitWood(inten); else if (ref.mat === 'ice') audio.hitIce(inten); else audio.hitStone(inten)
    } else if (ref && ref.kind === 'pig') {
      audio.pigHurt()
    } else if (ref && ref.kind === 'bird') {
      // پرنده فقط شدت ضربه را پخش می‌کند
    }

    if (dmg <= 0.5 || !ref || ref.kind === 'bird') {
      // پرنده‌ی سیاه با هر برخورد محکم (حتی با زمین) منفجر می‌شود
      const birdIsBlack = this.activeBird && this.activeBird.type === 'black' && !this.activeBird.abilityUsed
      if (ref && ref.kind === 'bird' && birdIsBlack && impact > 6) {
        const b = this.activeBird
        b.abilityUsed = true
        this._defer(() => this._consumeBlackBird(b))
      }
      return
    }
    ref.flash = 1
    if (ref.kind === 'pig') ref.wobble = 1
    this._applyDamage(ref, dmg)

    // پرنده‌ی سیاه هنگام برخورد با هر چیزی منفجر می‌شود
    const birdIsBlack = this.activeBird && this.activeBird.type === 'black' && !this.activeBird.abilityUsed
    if (other.gameRef && other.gameRef.kind === 'bird' && birdIsBlack && impact > 6) {
      const b = this.activeBird
      b.abilityUsed = true
      this._defer(() => this._consumeBlackBird(b))
    }
  }

  _applyDamage(ref, dmg) {
    if (ref._dead) return
    ref.hp -= dmg
    if (ref.hp <= 0) {
      ref._dead = true
      if (ref.kind === 'tnt') this._defer(() => this._detonate(ref))
      else this._defer(() => this._destroyRef(ref))
    }
  }

  _destroyRef(ref) {
    const idx = this.structure.indexOf(ref)
    if (idx >= 0) this.structure.splice(idx, 1)
    this.world.removeBody(ref.body)
    this.structureGroup.remove(ref.mesh)

    const p = ref.mesh.position
    if (ref.kind === 'pig') {
      audio.pigPop()
      this.pigsLeft--
      this.particles.spawn(p.x, p.y, p.z, { count: 30, colors: ['#79c94f', '#93dd6c', '#3f7a26', '#d8ffb0'], speed: 7, up: 2.6, size: 1.6, life: 1.0, gravity: 10 })
      this._addScore(ref.score, p)
      this.ui.onPigsLeft(this.pigsLeft)
      this._wakeNearby(p, 6)
      if (this.pigsLeft === 0) this._beginWin()
    } else {
      const colors = ref.mat === 'wood' ? ['#8a5a2b', '#6b4423', '#c9a26b', '#54371c']
        : ref.mat === 'ice' ? ['#b7e6f5', '#dff4fa', '#7fc4dd', '#ffffff']
        : ['#828a99', '#5d6470', '#a9b1c0', '#3f444f']
      audio.crack()
      this.particles.spawn(p.x, p.y, p.z, { count: 22, colors, speed: 8, up: 2.2, size: 1.7, life: 1.15, gravity: 13 })
      this._addScore(ref.score, p)
      this._wakeNearby(p, 5)
    }
  }

  _detonate(ref) {
    const idx = this.structure.indexOf(ref)
    if (idx >= 0) this.structure.splice(idx, 1)
    this.world.removeBody(ref.body)
    this.structureGroup.remove(ref.mesh)
    this._addScore(ref.score, ref.mesh.position)
    this._explode(ref.mesh.position.clone(), { radius: 6.2, damage: 135, impulse: 21, birdType: null })
  }

  /** انهدام همه‌ی آیتم‌های مشخص‌شده به‌عنوان مرده (بعد از انفجار) */
  _reapDead() {
    for (const victim of [...this.structure]) {
      if (victim._dead) {
        if (victim.kind === 'tnt') this._detonate(victim)
        else this._destroyRef(victim)
      }
    }
  }

  _explode(pos, { radius, damage, impulse }) {
    audio.explosion()
    this.shake = Math.max(this.shake, 1.0)

    // گوی آتش + دود + جرقه
    this.particles.spawn(pos.x, pos.y, pos.z, { count: 34, colors: ['#ff9a1f', '#ffd23d', '#ff5a1f', '#fff3b0'], speed: 11, up: 1.1, size: 3.4, life: 0.75, lifeSpread: 0.4, gravity: 3, drag: 2.6 })
    this.particles.spawn(pos.x, pos.y, pos.z, { count: 22, colors: ['#3a3a3a', '#575757', '#222'], speed: 5.5, up: 1.6, size: 4.2, life: 1.5, gravity: -2.2, drag: 2.2 })

    // موج ضربه (حلقه‌ی نورانی)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.8, 48),
      new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
    )
    ring.position.copy(pos)
    this.scene.add(ring)
    this.effects.push({ mesh: ring, t: 0, dur: 0.55, radius })

    // فلش نوری
    const light = new THREE.PointLight(0xffb03a, 90, radius * 3, 1.8)
    light.position.copy(pos)
    this.scene.add(light)
    this.effects.push({ mesh: light, t: 0, dur: 0.5, isLight: true })

    // نیرو به همه‌ی اجرام پویا در شعاع
    const bodies = [...this.structure.map((s) => s.body)]
    if (this.activeBird) bodies.push(this.activeBird.body)
    for (const body of bodies) {
      const d = body.position.distanceTo(new CANNON.Vec3(pos.x, pos.y, pos.z))
      if (d > radius) continue
      const fall = Math.pow(1 - d / radius, 1.6)
      const dir = new CANNON.Vec3(body.position.x - pos.x, body.position.y - pos.y + 0.8, body.position.z - pos.z)
      dir.normalize()
      const J = impulse * fall * Math.pow(Math.max(0.6, body.mass), 0.72)
      body.wakeUp()
      body.applyImpulse(new CANNON.Vec3(dir.x * J, dir.y * J + J * 0.32, dir.z * J), body.position)
    }
    // آسیب به اجرام در شعاع (حذف‌ها به فریم بعد موکول می‌شوند)
    for (const victim of this.structure) {
      if (victim._dead) continue
      const d = victim.body.position.distanceTo(new CANNON.Vec3(pos.x, pos.y, pos.z))
      if (d > radius) continue
      const fall = 1 - d / radius
      victim.flash = 1
      if (victim.kind === 'tnt') victim.hp -= damage * fall * 0.7 // احتمال زنجیره‌ای
      else victim.hp -= damage * fall
      if (victim.hp <= 0) victim._dead = true
      else if (victim.wobble !== undefined) victim.wobble = 1
    }
    this._reapDead()
  }

  _wakeNearby(p, radius) {
    for (const s of this.structure) {
      const d = Math.hypot(s.body.position.x - p.x, s.body.position.y - p.y, s.body.position.z - p.z)
      if (d < radius) s.body.wakeUp()
    }
  }

  _addScore(n, worldPos) {
    this.score += n
    this.ui.onScore(this.score)
    if (worldPos) this._scorePop(worldPos, `+${faNum(n)}`)
  }

  _scorePop(worldPos, text) {
    const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
    v.project(this.camera)
    if (v.z > 1) return
    const el = document.createElement('div')
    el.className = 'score-pop'
    el.textContent = text
    el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`
    el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1150)
  }

  /* ══════════ پایان مرحله ══════════ */
  _afterBirdGone() {
    if (this.state === 'won' || this.state === 'lost') return
    if (this.pigsLeft === 0) { this._beginWin(); return }
    if (this.birdQueue.length === 0) { this._beginLose(); return }
    this.state = 'resolving'
    this.resolveTimer = 0.9
  }

  _beginWin() {
    if (this.state === 'won') return
    this.state = 'won'
    this.resolveTimer = -1
    // پاداش پرنده‌های پرتاب‌نشده (پرنده‌ی در حال پرواز حساب نمی‌شود)
    const remaining = Math.max(0, this.birdQueue.length - (this.activeBird ? 1 : 0))
    const bonus = remaining * 3000
    if (bonus > 0) this.score += bonus
    const level = LEVELS[this.levelIndex]
    const stars = this.score >= level.star3 ? 3 : this.score >= level.star2 ? 2 : 1
    this.camGoal.copy(OVERVIEW_TGT)
    audio.win()
    // کنفتی
    const base = new THREE.Vector3(10, 3, 0)
    for (let i = 0; i < 4; i++) {
      this.particles.spawn(base.x + (Math.random() - 0.5) * 10, base.y + Math.random() * 5 + 2, base.z + (Math.random() - 0.5) * 6, {
        count: 36, colors: ['#ffd54a', '#ff6b9d', '#7ae0ff', '#9dff70', '#c99df0', '#ffffff'],
        speed: 7, up: 3.4, gravity: 7, size: 1.7, life: 1.6, drag: 1.1,
      })
    }
    this.ui.onScore(this.score)
    this.ui.onWin({ score: this.score, stars, level })
  }

  _beginLose() {
    if (this.state === 'lost') return
    this.state = 'lost'
    this.resolveTimer = -1
    this.camGoal.copy(OVERVIEW_TGT)
    audio.lose()
    this.ui.onLose({ score: this.score })
  }

  retryLevel() { this.loadLevel(this.levelIndex) }
  nextLevel() { if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1); else this.backToMenu() }
  resetCamera() { this.camGoal.copy(OVERVIEW_TGT) }
  setPaused(p) { this.paused = p }
  canPause() { return ['aim', 'flying', 'resolving'].includes(this.state) }

  /* ══════════ حلقه‌ی اصلی ══════════ */
  _loop(tms) {
    requestAnimationFrame(this._loop)
    const dt = Math.min(0.05, (tms - (this._lastTms ?? tms)) / 1000) || 0.016
    this._lastTms = tms
    this.time += dt
    const t = this.time

    // فیزیک
    if (!this.paused) this.world.step(1 / 120, dt, 10)
    // اجرای کارهای تعویقی (حذف بدن‌ها) — هرگز داخل collide اجرا نمی‌شوند
    if (this._deferQueue.length) {
      const q = this._deferQueue
      this._deferQueue = []
      for (const fn of q) fn()
    }

    // همگام‌سازی مش‌ها با اجرام
    for (const s of this.structure) {
      s.mesh.position.copy(s.body.position)
      s.mesh.quaternion.copy(s.body.quaternion)
      // فلاش برخورد
      if (s.flash > 0) {
        s.flash = Math.max(0, s.flash - dt * 3.2)
        this._setFlash(s.mesh, s.flash)
        s._flashOn = s.flash > 0
      } else if (s._flashOn) {
        this._setFlash(s.mesh, 0)
        s._flashOn = false
      }
      if (s.wobble !== undefined && s.wobble > 0) {
        s.wobble = Math.max(0, s.wobble - dt * 1.6)
        s.mesh.rotation.z = Math.sin(t * 26) * 0.14 * s.wobble
      }
      // نفس‌کشیدن خوک‌ها
      if (s.kind === 'pig') {
        const breathe = 1 + Math.sin(t * 2.6 + (s.phase ?? 0)) * 0.035
        s.mesh.scale.set(1, breathe, 1)
      }
      // جرقه‌ی دینامیت
      const spark = s.mesh.getObjectByName?.('spark')
      if (spark) spark.scale.setScalar(1 + Math.sin(t * 17 + s.mesh.position.x) * 0.45)
    }
    if (this.activeBird) {
      this.activeBird.mesh.position.copy(this.activeBird.body.position)
      if (this.state === 'flying') {
        this.activeBird.mesh.rotation.z = Math.atan2(this.activeBird.body.velocity.y, Math.max(1, Math.abs(this.activeBird.body.velocity.x))) * 0.5
        const spark = this.activeBird.mesh.getObjectByName('spark')
        if (spark) spark.scale.setScalar(1 + Math.sin(t * 21) * 0.5)
      } else {
        // تکان خوردن روی منجنیق
        this.activeBird.mesh.position.y += Math.sin(t * 2.1) * 0.05
        this.activeBird.mesh.rotation.y = Math.sin(t * 1.3) * 0.1
      }
    }

    // بررسی توقف پرنده هنگام پرواز
    if (this.state === 'flying' && this.activeBird) {
      const b = this.activeBird
      const speed = b.body.velocity.length()
      const onGround = b.body.position.y < b.r + 0.1
      if (speed < 0.65 || (onGround && speed < 1.6)) b.stopped += dt * (onGround ? 1.8 : 1)
      else b.stopped = 0
      const elapsed = this.time - b.launchTime
      if (b.stopped > 1.05 || elapsed > 7.5 || b.body.position.x > 48 || b.body.position.y < -4) this.endBird()
      else this.lastBirdX = b.body.position.x
      this.camGoal.set(THREE.MathUtils.clamp(b.body.position.x + 1.6, -9, 7), THREE.MathUtils.clamp(b.body.position.y * 0.35 + 1.7, 1.9, 4.6), 0)
    }

    // شمارنده‌ی تأخیر بین پرتاب‌ها
    if (this.resolveTimer > 0) {
      this.resolveTimer -= dt
      if (this.resolveTimer <= 0) {
        this.resolveTimer = -1
        if (this.pigsLeft === 0) this._beginWin()
        else if (this.birdQueue.length > 0) { this.state = 'aim'; this.spawnBird() }
        else this._beginLose()
      }
    }

    // افکت‌ها (موج انفجار)
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i]
      fx.t += dt
      const k = fx.t / fx.dur
      if (k >= 1) {
        this.scene.remove(fx.mesh)
        if (!fx.isLight) { fx.mesh.geometry?.dispose(); fx.mesh.material?.dispose() }
        this.effects.splice(i, 1)
        continue
      }
      if (fx.isLight) {
        fx.mesh.intensity = 90 * (1 - k)
      } else {
        const s = 0.6 + k * fx.radius * 2.1
        fx.mesh.scale.set(s, s, s)
        fx.mesh.lookAt(this.camera.position)
        fx.mesh.material.opacity = 0.95 * (1 - k)
      }
    }

    // ذرات
    if (!this.paused) this.particles.update(dt)

    // حرکت ابری و آرامش صحنه
    this.clouds.update(dt)

    // دنبال‌کردن نرم دوربین
    if (this.state === 'menu') {
      this.camGoal.set(-1, 2.35, 0)
    }
    const delta = this._tmp.copy(this.camGoal).sub(this.controls.target)
    const step = delta.multiplyScalar(Math.min(1, dt * 2.6))
    this.camera.position.add(step)
    this.controls.target.add(step)
    this.controls.update()

    // لرزش دوربین هنگام انفجار
    if (this.shake > 0.002) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.9
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.7
      this.camera.position.z += (Math.random() - 0.5) * this.shake * 0.4
      this.shake *= Math.exp(-3.4 * dt)
    }

    this.renderer.render(this.scene, this.camera)
  }

  _setFlash(mesh, k) {
    mesh.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissive) {
        if (!o.userData._origEm) {
          o.userData._origEm = { r: o.material.emissive.r, g: o.material.emissive.g, b: o.material.emissive.b, i: o.material.emissiveIntensity ?? 1 }
        }
        if (k <= 0.001) {
          const o0 = o.userData._origEm
          o.material.emissive.setRGB(o0.r, o0.g, o0.b)
          o.material.emissiveIntensity = o0.i
        } else {
          o.material.emissive.setRGB(k * 0.9, k * 0.85, k * 0.75)
          o.material.emissiveIntensity = 1
        }
      }
    })
  }

  /** ویران‌سازی کامل برای خروج */
  dispose() {
    this.world.bodies.slice().forEach((b) => this.world.removeBody(b))
    this.particles.dispose()
    this.renderer.dispose()
  }
}

function randSpin(v) {
  return THREE.MathUtils.clamp(v.x * 0.08, 2, 9) * (Math.random() < 0.5 ? 1 : -1)
}

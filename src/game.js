import * as THREE from 'three';
import { PhysWorld, MATERIALS } from './physics.js';
import { LEVELS, levelStars } from './levels.js';
import {
  createRenderer,
  createWorld,
  buildEnvironment,
  Slingshot,
  Trajectory,
  Debris,
  makeBlockMesh,
  makePigMesh,
  makeBirdMesh,
  SLING_ANCHOR,
} from './scene.js';
import { sfx } from './audio.js';

/* ------------------------------------------------------------------ */
/*  ثابت‌ها و ابزارها                                                  */
/* ------------------------------------------------------------------ */

const MAX_PULL = 3.1;
const POWER = 7.6;
const STORAGE_KEY = 'angry3d.progress.v1';
const faNum = new Intl.NumberFormat('fa-IR');
const fmt = (n) => faNum.format(Math.round(n));
const clamp = THREE.MathUtils.clamp;
const urlParams = new URLSearchParams(window.location.search);
// پارامترهای اختیاری برای تست: ?level=2&cam=dist,yaw,pitch,tx,ty,tz
const camOverride = (urlParams.get('cam') || '')
  .split(',')
  .map(Number)
  .filter((n) => Number.isFinite(n));

const $ = (id) => document.getElementById(id);
const els = {
  hud: $('hud'),
  levelNumber: $('level-number'),
  levelTitle: $('level-title'),
  score: $('score-value'),
  birds: $('birds-left'),
  power: $('power'),
  powerFill: $('power-fill'),
  hint: $('hint'),
  popups: $('popups'),
  menu: $('screen-menu'),
  menuLevels: $('menu-levels'),
  totalBest: $('total-best'),
  result: $('screen-result'),
  resultTitle: $('result-title'),
  resultStars: $('result-stars'),
  resultScore: $('result-score'),
  resultSub: $('result-sub'),
  help: $('screen-help'),
  loading: $('loading'),
  btnNext: $('btn-next'),
  btnSound: $('btn-sound'),
  btnRetry: $('btn-retry'),
};

/* ------------------------------------------------------------------ */
/*  پیشرفت بازیکن                                                      */
/* ------------------------------------------------------------------ */

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        unlocked: p.unlocked || 1,
        stars: p.stars || {},
        best: p.best || {},
        muted: !!p.muted,
      };
    }
  } catch {
    /* ignore */
  }
  return { unlocked: 1, stars: {}, best: {}, muted: false };
}

let progress = loadProgress();

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  راه‌اندازی صحنه                                                     */
/* ------------------------------------------------------------------ */

const canvas = $('game');
const renderer = createRenderer(canvas);
const { scene, camera } = createWorld();
const env = buildEnvironment(scene);
const slingshot = new Slingshot(scene);
const trajectory = new Trajectory(scene);
const debris = new Debris(scene);

camera.position.set(-22, 11, 23);

const rig = {
  target: new THREE.Vector3(2.5, 4, 0),
  desiredTarget: new THREE.Vector3(2.5, 4, 0),
  yaw: -0.75,
  targetYaw: -0.75,
  pitch: 0.22,
  targetPitch: 0.22,
  dist: 34,
  targetDist: 34,
  shake: 0,
};

function addShake(v) {
  rig.shake = Math.min(0.65, rig.shake + v);
}

/* ------------------------------------------------------------------ */
/*  وضعیت بازی                                                         */
/* ------------------------------------------------------------------ */

let phys = null;
const meshOf = new Map();

const state = {
  mode: 'menu', // menu | ready | aiming | flying | settling | over
  levelIndex: 0,
  score: 0,
  birdsLeft: 0,
  birdMesh: null,
  aimPull: new THREE.Vector3(),
  flightTime: 0,
  stillTimer: 0,
  settleTimer: 0,
  winTimer: -1,
  hasLaunched: false,
};

let aimPointerId = null;
let orbitPointerId = null;
let lastX = 0;
let lastY = 0;
let lastThud = 0;

const currentLevel = () => LEVELS[state.levelIndex];

/* ------------------------------------------------------------------ */
/*  مدیریت مش‌ها                                                        */
/* ------------------------------------------------------------------ */

function bindMesh(ent, mesh) {
  meshOf.set(ent, mesh);
  scene.add(mesh);
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

function removeMesh(ent) {
  const mesh = meshOf.get(ent);
  if (!mesh) return;
  scene.remove(mesh);
  disposeTree(mesh);
  meshOf.delete(ent);
}

function syncMeshes() {
  for (const [ent, mesh] of meshOf) {
    if (!ent.alive) continue;
    mesh.position.copy(ent.body.position);
    mesh.quaternion.copy(ent.body.quaternion);
    if (ent.kind === 'pig') {
      const s = 1 + (ent.hurtFlash || 0) * 0.13;
      mesh.scale.setScalar(s);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  صدا و امتیاز                                                       */
/* ------------------------------------------------------------------ */

function popup(worldPos, text, cls = '') {
  if (!worldPos) return;
  const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera);
  if (v.z > 1.2) return;
  const el = document.createElement('div');
  el.className = `popup ${cls}`;
  el.textContent = text;
  el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
  els.popups.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function handleBlockBroken(ent) {
  const pos = { x: ent.body.position.x, y: ent.body.position.y, z: ent.body.position.z };
  removeMesh(ent);
  state.score += ent.score;
  debris.spawn(pos, MATERIALS[ent.type].debris, 12, 0.3, 6.5);
  if (ent.type === 'stone') sfx.stoneBreak();
  else if (ent.type === 'ice') sfx.iceBreak();
  else sfx.woodBreak();
  popup(pos, `+${fmt(ent.score)}`);
  addShake(0.16);
  updateHUD();
}

function handlePigKilled(ent) {
  const pos = { x: ent.body.position.x, y: ent.body.position.y, z: ent.body.position.z };
  removeMesh(ent);
  state.score += ent.score;
  debris.spawn(pos, 0x7ed03f, 16, 0.32, 6);
  sfx.pigPop();
  popup(pos, `+${fmt(ent.score)}`, 'pig');
  addShake(0.3);
  updateHUD();
  if (phys.pigsAlive.length === 0 && state.mode !== 'over' && state.winTimer < 0) {
    state.winTimer = 0.9;
  }
}

function handleImpact(ent, speed) {
  addShake(Math.min(0.18, Math.max(0, (speed - 5) * 0.012)));
  const now = performance.now();
  if (speed > 5 && now - lastThud > 70) {
    lastThud = now;
    sfx.thud(speed / 9);
  }
}

/* ------------------------------------------------------------------ */
/*  رابط کاربری                                                        */
/* ------------------------------------------------------------------ */

function updateHUD() {
  const level = currentLevel();
  if (!level) return;
  els.levelNumber.textContent = `مرحله ${fmt(level.id)}`;
  els.levelTitle.textContent = level.name;
  els.score.textContent = fmt(state.score);

  els.birds.innerHTML = '';
  for (let i = 0; i < level.birds; i++) {
    const chip = document.createElement('span');
    chip.className = 'bird-chip' + (i < state.birdsLeft ? '' : ' used');
    els.birds.appendChild(chip);
  }
}

function buildMenu() {
  els.menuLevels.innerHTML = '';
  LEVELS.forEach((level, i) => {
    const unlocked = level.id <= progress.unlocked;
    const stars = progress.stars[level.id] || 0;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `level-card${unlocked ? '' : ' locked'}`;
    card.innerHTML = `
      <span class="num">${fmt(level.id)}</span>
      <span class="nm">${level.name}</span>
      <span class="stars-mini">
        ${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}">★</span>`).join('')}
      </span>`;
    card.addEventListener('click', () => {
      if (unlocked) startGame(i);
      else {
        card.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 240 },
        );
      }
    });
    els.menuLevels.appendChild(card);
  });

  const total = Object.values(progress.best).reduce((a, b) => a + b, 0);
  els.totalBest.textContent = fmt(total);
}

function showScreen(name) {
  els.menu.classList.toggle('hidden', name !== 'menu');
  els.result.classList.toggle('hidden', name !== 'result');
  els.help.classList.toggle('hidden', name !== 'help');
}

function openMenu() {
  state.mode = 'menu';
  aimPointerId = null;
  orbitPointerId = null;
  trajectory.hide();
  els.power.classList.add('hidden');
  els.hint.classList.add('hidden');
  els.hud.classList.add('hidden');
  buildMenu();
  showScreen('menu');
}

/* ------------------------------------------------------------------ */
/*  بارگذاری مرحله                                                     */
/* ------------------------------------------------------------------ */

function clearLevel() {
  for (const ent of [...meshOf.keys()]) removeMesh(ent);
  meshOf.clear();
  if (state.birdMesh) {
    scene.remove(state.birdMesh);
    disposeTree(state.birdMesh);
    state.birdMesh = null;
  }
  if (phys) {
    phys.clear();
    phys = null;
  }
  state.winTimer = -1;
  trajectory.hide();
}

function loadLevel(index) {
  const level = LEVELS[index];
  if (!level) return;

  clearLevel();
  showScreen(null);

  phys = new PhysWorld();
  phys.onBlockBroken = handleBlockBroken;
  phys.onPigKilled = handlePigKilled;
  phys.onImpact = handleImpact;

  state.levelIndex = index;
  state.score = 0;
  state.birdsLeft = level.birds;
  state.hasLaunched = false;
  state.flightTime = 0;
  state.stillTimer = 0;
  state.settleTimer = 0;
  state.aimPull.set(0, 0, 0);
  state.mode = 'ready';

  for (const def of level.blocks) {
    const ent = phys.addBlock(def);
    const mesh = makeBlockMesh(ent);
    mesh.position.set(def.x, def.y, def.z);
    mesh.rotation.y = def.ry || 0;
    bindMesh(ent, mesh);
  }

  for (const def of level.pigs) {
    const ent = phys.addPig(def);
    const pig = makePigMesh(def.r);
    // خوک‌ها رو به تیرکمان نگاه می‌کنند
    pig.rotation.y = Math.atan2(-(SLING_ANCHOR.z - def.z), SLING_ANCHOR.x - def.x);
    const wrapper = new THREE.Group();
    wrapper.add(pig);
    wrapper.position.set(def.x, def.y, def.z);
    bindMesh(ent, wrapper);
  }

  const portrait = window.innerWidth / Math.max(1, window.innerHeight) < 1.1;
  const [tx, ty, tz] = level.target;
  // در حالت عمودی، مرکز دید کمی به سمت تیرکمان می‌رود تا هر دو سر میدان دیده شوند
  rig.desiredTarget.set(tx - (portrait ? 3 : 0), ty, tz);
  rig.target.copy(rig.desiredTarget);
  applyFraming(true);

  els.hud.classList.remove('hidden');
  updateHUD();
  spawnBird();
}

/* ------------------------------------------------------------------ */
/*  پرنده و شلیک                                                       */
/* ------------------------------------------------------------------ */

function spawnBird() {
  if (!phys || state.birdsLeft <= 0) return;
  const mesh = makeBirdMesh();
  mesh.position.copy(SLING_ANCHOR);
  scene.add(mesh);
  state.birdMesh = mesh;
  state.aimPull.set(0, 0, 0);
  slingshot.setBirdPos(SLING_ANCHOR);
  state.mode = 'ready';
  state.stillTimer = 0;
  state.flightTime = 0;
  trajectory.hide();
  els.hint.classList.toggle('hidden', state.hasLaunched);
  updateHUD();
}

const _fwd = new THREE.Vector3();
const _side = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** جهت شلیک (از تیرکمان به سمت سازه‌ها) */
function shotForward() {
  const level = currentLevel() || LEVELS[0];
  _fwd
    .set(level.target[0], 0, level.target[2])
    .sub(new THREE.Vector3(SLING_ANCHOR.x, 0, SLING_ANCHOR.z))
    .normalize();
  return _fwd;
}

function computeLaunchVelocity() {
  const v = state.aimPull.clone().multiplyScalar(-POWER);
  const horiz = new THREE.Vector3(v.x, 0, v.z);
  const hLen = horiz.length();
  if (hLen > 0.01) {
    const fwd = shotForward();
    const hd = horiz.clone().normalize();
    if (hd.dot(fwd) < 0.22) {
      // جلوگیری از شلیک به عقب: جهت افقی را به سمت هدف می‌چرخانیم
      hd.lerp(fwd, 0.8).normalize();
      if (hd.dot(fwd) < 0.22) hd.copy(fwd);
      v.x = hd.x * hLen;
      v.z = hd.z * hLen;
    }
  }
  return v;
}

function updateAimPosition() {
  if (!state.birdMesh) return;
  const pos = SLING_ANCHOR.clone().add(state.aimPull);
  state.birdMesh.position.copy(pos);
  slingshot.setBirdPos(pos);

  const vel = computeLaunchVelocity();
  if (vel.lengthSq() > 1) {
    const dir = vel.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    state.birdMesh.quaternion.copy(q);
    trajectory.update(pos, vel);
  } else {
    trajectory.hide();
  }

  const ratio = Math.min(1, state.aimPull.length() / MAX_PULL);
  els.power.classList.remove('hidden');
  els.powerFill.style.width = `${(ratio * 100).toFixed(1)}%`;
}

function beginAim(e) {
  if (state.mode !== 'ready' || !state.birdMesh) return;
  state.mode = 'aiming';
  aimPointerId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  els.hint.classList.add('hidden');
  sfx.stretch();
}

function moveAim(e) {
  if (state.mode !== 'aiming' || e.pointerId !== aimPointerId) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  if (dx === 0 && dy === 0) return;

  // مقیاس حرکت: هر پیکسل چند متر روی صفحه‌ی کشش اثر بگذارد
  const dist = camera.position.distanceTo(SLING_ANCHOR);
  const perPx =
    (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist) / window.innerHeight;
  const k = perPx * 0.62;

  const fwd = shotForward();
  const side = _side.crossVectors(fwd, UP).normalize();

  const pullUp = Math.max(0, dy);
  const backAmount = pullUp + Math.abs(dx) * 0.35;

  // کشیدن به پایین (و کمی چپ/راست) => شلیک به جلو، بالا و جهت دلخواه
  const delta = new THREE.Vector3();
  delta.addScaledVector(fwd, -backAmount * k);
  delta.y -= pullUp * k;
  delta.addScaledVector(side, dx * 0.22 * k);

  state.aimPull.add(delta);
  if (state.aimPull.length() > MAX_PULL) state.aimPull.setLength(MAX_PULL);

  updateAimPosition();
}

function cancelAim() {
  state.mode = 'ready';
  aimPointerId = null;
  state.aimPull.set(0, 0, 0);
  if (state.birdMesh) {
    state.birdMesh.position.copy(SLING_ANCHOR);
    state.birdMesh.quaternion.identity();
  }
  slingshot.setBirdPos(SLING_ANCHOR);
  trajectory.hide();
  els.power.classList.add('hidden');
  els.hint.classList.toggle('hidden', state.hasLaunched);
}

function releaseAim() {
  if (state.mode !== 'aiming') return;
  const pull = state.aimPull.length();
  aimPointerId = null;
  els.power.classList.add('hidden');

  if (pull < 0.4 || !state.birdMesh) {
    cancelAim();
    return;
  }

  const pos = SLING_ANCHOR.clone().add(state.aimPull);
  const vel = computeLaunchVelocity();

  const ent = phys.launchBird(pos, vel);
  const mesh = state.birdMesh;
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.quaternion.identity();
  bindMesh(ent, mesh);
  state.birdMesh = null;

  state.mode = 'flying';
  state.birdsLeft = Math.max(0, state.birdsLeft - 1);
  state.hasLaunched = true;
  state.flightTime = 0;
  state.stillTimer = 0;
  state.aimPull.set(0, 0, 0);

  slingshot.setBirdPos(null);
  trajectory.hide();
  els.hint.classList.add('hidden');
  sfx.launch();
  addShake(0.1);
  updateHUD();
}

/* ------------------------------------------------------------------ */
/*  چرخه‌ی شلیک و پایان مرحله                                          */
/* ------------------------------------------------------------------ */

function endShot() {
  if (phys && phys.bird) {
    const ent = phys.bird;
    removeMesh(ent);
    phys.removeEntity(ent);
  }
  state.mode = 'settling';
  state.settleTimer = 0.9;
}

function updateFlight(dt) {
  const birdEnt = phys && phys.bird;
  if (!birdEnt || !birdEnt.alive) {
    endShot();
    return;
  }
  const p = birdEnt.body.position;
  if (p.y < -10 || Math.abs(p.x) > 110 || Math.abs(p.z) > 110) {
    endShot();
    return;
  }
  state.flightTime += dt;
  if (state.flightTime > 1.8) {
    // بعد از چند ثانیه، پرنده سریع‌تر می‌ایستد تا نوبت بعدی طول نکشد
    birdEnt.body.linearDamping = 0.45;
    birdEnt.body.angularDamping = 0.7;
  }
  const speed = birdEnt.body.velocity.length();
  if (speed < 1.0) state.stillTimer += dt;
  else state.stillTimer = 0;

  if ((state.stillTimer > 0.5 && state.flightTime > 0.4) || state.flightTime > 5) {
    endShot();
  }
}

function updateSettle(dt) {
  state.settleTimer -= dt;
  if (state.settleTimer > 0) return;

  if (phys.pigsAlive.length === 0) {
    finishLevel(true);
    return;
  }
  if (state.birdsLeft > 0) {
    spawnBird();
  } else {
    finishLevel(false);
  }
}

function finishLevel(win) {
  if (state.mode === 'over') return;
  state.mode = 'over';
  const level = currentLevel();

  let bonus = 0;
  if (win) {
    bonus = state.birdsLeft * 1000;
    state.score += bonus;
    updateHUD();

    const stars = levelStars(level, state.score);
    progress.stars[level.id] = Math.max(progress.stars[level.id] || 0, stars);
    progress.best[level.id] = Math.max(progress.best[level.id] || 0, state.score);
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, level.id + 1));
    saveProgress();

    els.resultTitle.textContent =
      state.levelIndex === LEVELS.length - 1 ? 'پایان بازی!' : 'برنده شدی!';
    els.resultSub.textContent = bonus
      ? `پاداش پرنده‌های باقی‌مانده: ${fmt(bonus)} امتیاز`
      : 'همه‌ی خوک‌ها نابود شدند.';
    setResultStars(stars);
    sfx.win();
  } else {
    els.resultTitle.textContent = 'خوک‌ها زنده ماندند!';
    els.resultSub.textContent = 'پرنده‌هایت تمام شد. با نشانه‌گیری دقیق‌تر دوباره تلاش کن.';
    setResultStars(0);
    sfx.lose();
  }

  els.resultScore.textContent = fmt(state.score);
  const hasNext = state.levelIndex < LEVELS.length - 1;
  els.btnNext.classList.toggle('hidden', !win || !hasNext);
  showScreen('result');
}

function setResultStars(count) {
  const stars = els.resultStars.querySelectorAll('.star');
  stars.forEach((el, i) => {
    el.classList.remove('on');
    el.style.transitionDelay = '0ms';
    if (i < count) {
      setTimeout(() => {
        el.classList.add('on');
        sfx.star(i);
      }, 220 + i * 260);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  ورودی‌ها                                                            */
/* ------------------------------------------------------------------ */

const isMouse = (e) => e.pointerType === 'mouse';

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  sfx.init();
  if (e.button === 2) {
    orbitPointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    return;
  }
  if (isMouse(e) && e.button !== 0) return;
  beginAim(e);
});

window.addEventListener('pointermove', (e) => {
  if (aimPointerId !== null && e.pointerId === aimPointerId) {
    moveAim(e);
  } else if (orbitPointerId !== null && e.pointerId === orbitPointerId) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    rig.targetYaw = clamp(rig.targetYaw - dx * 0.006, -2.1, 0.45);
    rig.targetPitch = clamp(rig.targetPitch + dy * 0.005, 0.07, 0.72);
  }
});

window.addEventListener('pointerup', (e) => {
  if (e.pointerId === aimPointerId) {
    releaseAim();
  }
  if (e.pointerId === orbitPointerId) {
    orbitPointerId = null;
  }
});

window.addEventListener('blur', () => {
  if (state.mode === 'aiming') {
    aimPointerId = null;
    cancelAim();
  }
  orbitPointerId = null;
});

window.addEventListener('pointercancel', (e) => {
  if (e.pointerId === aimPointerId) {
    aimPointerId = null;
    cancelAim();
  }
  if (e.pointerId === orbitPointerId) orbitPointerId = null;
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    rig.targetDist = clamp(rig.targetDist * (1 + Math.sign(e.deltaY) * 0.07), 19, 56);
  },
  { passive: false },
);

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (state.mode !== 'menu') startGame(state.levelIndex);
  } else if (e.key === 'Escape') {
    if (!els.help.classList.contains('hidden')) {
      showScreen(state.mode === 'menu' ? 'menu' : null);
    } else if (state.mode !== 'menu') {
      openMenu();
    }
  } else if (e.key === 'ArrowLeft') {
    rig.targetYaw = clamp(rig.targetYaw - 0.22, -2.1, 0.45);
  } else if (e.key === 'ArrowRight') {
    rig.targetYaw = clamp(rig.targetYaw + 0.22, -2.1, 0.45);
  }
});

document.querySelectorAll('#camera-controls button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cam;
    if (cmd === 'left') rig.targetYaw = clamp(rig.targetYaw - 0.3, -2.1, 0.45);
    if (cmd === 'right') rig.targetYaw = clamp(rig.targetYaw + 0.3, -2.1, 0.45);
    if (cmd === 'in') rig.targetDist = clamp(rig.targetDist * 0.88, 19, 56);
    if (cmd === 'out') rig.targetDist = clamp(rig.targetDist * 1.13, 19, 56);
  });
});

/* ------------------------------------------------------------------ */
/*  دکمه‌ها                                                            */
/* ------------------------------------------------------------------ */

function startGame(index) {
  sfx.init();
  sfx.click();
  if (progress.muted) sfx.setMuted(true);
  loadLevel(index);
}

$('btn-play').addEventListener('click', () => {
  startGame(state.levelIndex);
});

els.menuLevels.addEventListener('pointerdown', (e) => e.stopPropagation());

$('btn-menu').addEventListener('click', () => {
  sfx.click();
  openMenu();
});

$('btn-restart').addEventListener('click', () => {
  sfx.click();
  if (state.mode !== 'menu') startGame(state.levelIndex);
});

els.btnRetry.addEventListener('click', () => {
  sfx.click();
  startGame(state.levelIndex);
});

els.btnNext.addEventListener('click', () => {
  sfx.click();
  if (state.levelIndex < LEVELS.length - 1) startGame(state.levelIndex + 1);
  else openMenu();
});

$('btn-home').addEventListener('click', () => {
  sfx.click();
  openMenu();
});

$('btn-help').addEventListener('click', () => {
  sfx.click();
  showScreen('help');
});

$('btn-help-close').addEventListener('click', () => {
  sfx.click();
  showScreen(state.mode === 'menu' ? 'menu' : null);
  if (state.mode === 'menu') buildMenu();
});

els.btnSound.addEventListener('click', () => {
  sfx.init();
  progress.muted = !progress.muted;
  sfx.setMuted(progress.muted);
  els.btnSound.classList.toggle('muted', progress.muted);
  saveProgress();
});

/* ------------------------------------------------------------------ */
/*  دوربین و انیمیشن                                                   */
/* ------------------------------------------------------------------ */

function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 9);
  rig.yaw += (rig.targetYaw - rig.yaw) * k;
  rig.pitch += (rig.targetPitch - rig.pitch) * k;
  rig.dist += (rig.targetDist - rig.dist) * k;
  rig.target.lerp(rig.desiredTarget, k);

  const cp = Math.cos(rig.pitch);
  camera.position.set(
    rig.target.x + Math.sin(rig.yaw) * cp * rig.dist,
    rig.target.y + Math.sin(rig.pitch) * rig.dist,
    rig.target.z + Math.cos(rig.yaw) * cp * rig.dist,
  );

  if (rig.shake > 0.002) {
    camera.position.x += (Math.random() - 0.5) * rig.shake;
    camera.position.y += (Math.random() - 0.5) * rig.shake;
    camera.position.z += (Math.random() - 0.5) * rig.shake;
    rig.shake *= Math.exp(-dt * 7);
  }

  camera.lookAt(rig.target);
}

let idleTime = 0;
const _faceDir = new THREE.Vector3();
const _birdAxis = new THREE.Vector3(1, 0, 0);
const _faceQuat = new THREE.Quaternion();
function animateBirdIdle(dt) {
  idleTime += dt;
  if (state.mode === 'ready' && state.birdMesh) {
    state.birdMesh.position.copy(SLING_ANCHOR);
    state.birdMesh.position.y += Math.sin(idleTime * 3.2) * 0.05;
    // پرنده در حالت آماده‌باش رو به دوربین می‌ایستد
    _faceDir.copy(camera.position).sub(state.birdMesh.position);
    _faceDir.y = 0;
    if (_faceDir.lengthSq() > 0.001) {
      _faceDir.normalize();
      _faceQuat.setFromUnitVectors(_birdAxis, _faceDir);
      state.birdMesh.quaternion.copy(_faceQuat);
      state.birdMesh.rotateY(Math.sin(idleTime * 1.6) * 0.15);
    }
  }
}

function tickTimers(dt) {
  if (state.mode === 'flying') updateFlight(dt);
  else if (state.mode === 'settling') updateSettle(dt);

  if (state.winTimer > 0) {
    state.winTimer -= dt;
    if (state.winTimer <= 0) {
      state.winTimer = -1;
      if (phys && phys.pigsAlive.length === 0) finishLevel(true);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  حلقه اصلی                                                          */
/* ------------------------------------------------------------------ */

function framingForViewport() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const portrait = aspect < 1.1;
  const fov = portrait ? 58 : 26;
  const vHalf = THREE.MathUtils.degToRad(fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const half = Math.min(vHalf, hHalf);
  // شعاع ناحیه‌ی بازی
  const radius = portrait ? 8 : 10;
  const dist = clamp(radius / Math.sin(half), 30, 72);
  return { fov, dist, portrait };
}

/** دوربین را طوری تنظیم می‌کند که کل میدان در هر نسبت تصویری دیده شود */
function applyFraming(resetAngle) {
  const { fov, dist, portrait } = framingForViewport();
  camera.fov = fov;
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  rig.targetDist = dist;
  rig.dist = dist;
  if (resetAngle) {
    rig.targetYaw = portrait ? -1.2 : -0.85;
    rig.yaw = rig.targetYaw;
    rig.targetPitch = portrait ? 0.1 : 0.08;
    rig.pitch = rig.targetPitch;
    if (camOverride.length >= 6) {
      rig.targetDist = rig.dist = camOverride[0];
      rig.targetYaw = rig.yaw = camOverride[1];
      rig.targetPitch = rig.pitch = camOverride[2];
      rig.target.set(camOverride[3], camOverride[4], camOverride[5]);
      rig.desiredTarget.copy(rig.target);
      if (camOverride[6]) {
        camera.fov = camOverride[6];
        camera.updateProjectionMatrix();
      }
    }
  }
}

function onResize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyFraming(false);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 120));

let lastFrame = performance.now();

function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  const dt = Math.min(Math.max(0, (now - lastFrame) / 1000), 0.05);
  lastFrame = now;

  if (phys && state.mode !== 'menu' && state.mode !== 'over') {
    phys.step(dt);
    syncMeshes();
    tickTimers(dt);
  }

  env.update(dt);
  debris.update(dt);
  animateBirdIdle(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/*  شروع                                                               */
/* ------------------------------------------------------------------ */

function init() {
  els.btnSound.classList.toggle('muted', progress.muted);
  sfx.setMuted(progress.muted);
  buildMenu();
  const startLevel = clamp(Number(urlParams.get('level') || 1) - 1, 0, LEVELS.length - 1);
  loadLevel(Number.isFinite(startLevel) ? startLevel : 0);
  openMenu();
  animate();

  requestAnimationFrame(() => {
    els.loading.classList.add('done');
    setTimeout(() => els.loading.remove(), 500);
  });
}

// دسترسی برای تست‌های خودکار (بدون تأثیر روی بازی)
window.__ag3d = {
  state,
  get physics() {
    return phys;
  },
  levels: LEVELS,
};

try {
  init();
} catch (err) {
  console.error(err);
  if (els.loading) {
    els.loading.textContent = 'مرورگر شما از WebGL پشتیبانی نمی‌کند یا اجرای بازی ممکن نشد.';
  }
}

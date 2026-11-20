import * as THREE from 'three';
import { MATERIALS } from './physics.js';

/* ------------------------------------------------------------------ */
/*  ابزارهای کمکی                                                      */
/* ------------------------------------------------------------------ */

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();

/** یک استوانه بین دو نقطه می‌سازد (برای تیرک و کش‌های تیرکمان) */
export function cylinderBetween(radius, material, segments = 10) {
  const geo = new THREE.CylinderGeometry(radius, radius, 1, segments, 1, false);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.isSegment = true;
  return mesh;
}

export function setSegment(mesh, a, b) {
  _dir.subVectors(b, a);
  const len = _dir.length() || 0.0001;
  mesh.position.copy(a);
  _q.setFromUnitVectors(UP, _dir.normalize());
  mesh.quaternion.copy(_q);
  mesh.scale.set(1, len, 1);
}

/* ------------------------------------------------------------------ */
/*  بافت‌های رویه‌ای                                                     */
/* ------------------------------------------------------------------ */

function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeWoodTexture() {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#b97b41';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 42; i++) {
      const y = Math.random() * s;
      const h = 1 + Math.random() * 3;
      ctx.globalAlpha = 0.1 + Math.random() * 0.2;
      ctx.fillStyle = Math.random() > 0.5 ? '#8a5528' : '#d59a5e';
      ctx.fillRect(0, y, s, h);
    }
    for (let i = 0; i < 4; i++) {
      const x = 40 + Math.random() * (s - 80);
      const y = 40 + Math.random() * (s - 80);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#8a5528';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 10 + Math.random() * 8, 5 + Math.random() * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

function makeStoneTexture() {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#9aa0a9';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 1 + Math.random() * 3.5;
      ctx.globalAlpha = 0.12 + Math.random() * 0.25;
      ctx.fillStyle = Math.random() > 0.5 ? '#767c86' : '#c3c8cf';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function makeIceTexture() {
  return canvasTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#bfefff');
    g.addColorStop(0.5, '#96d8ee');
    g.addColorStop(1, '#c8f3ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 8; i++) {
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      const x = Math.random() * s;
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 40 + Math.random() * 80, s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/* ------------------------------------------------------------------ */
/*  رندرر، صحنه و نور                                                  */
/* ------------------------------------------------------------------ */

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd7ecff, 70, 380);

  const camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / window.innerHeight,
    0.1,
    800,
  );
  camera.position.set(-22, 11, 23);

  const hemi = new THREE.HemisphereLight(0xd9efff, 0x6f9a4e, 1.15);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4da, 2.0);
  sun.position.set(24, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -36;
  sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 36;
  sun.shadow.camera.bottom = -36;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 130;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(2, 0, 0);

  const fill = new THREE.DirectionalLight(0xbfd9ff, 0.35);
  fill.position.set(-25, 14, -18);
  scene.add(fill);

  return { scene, camera, sun, hemi };
}

/* ------------------------------------------------------------------ */
/*  محیط بازی                                                          */
/* ------------------------------------------------------------------ */

function makeSky() {
  const geo = new THREE.SphereGeometry(500, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x3f9df0) },
      midColor: { value: new THREE.Color(0x9fd8ff) },
      bottomColor: { value: new THREE.Color(0xe9f7ff) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        vec3 col = mix(bottomColor, midColor, smoothstep(-0.05, 0.32, h));
        col = mix(col, topColor, smoothstep(0.22, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a33 });
  const leafMats = [
    new THREE.MeshLambertMaterial({ color: 0x4fa83d }),
    new THREE.MeshLambertMaterial({ color: 0x59b846 }),
    new THREE.MeshLambertMaterial({ color: 0x44992f }),
  ];
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.4, 8), trunkMat);
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  g.add(trunk);

  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const r = 2.1 - i * 0.5;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 2.6, 9), leafMats[i % 3]);
    cone.position.y = 2.2 + i * 1.25;
    cone.castShadow = true;
    cone.receiveShadow = true;
    g.add(cone);
  }
  g.scale.setScalar(scale);
  return g;
}

function makeCloud() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false });
  const puffs = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < puffs; i++) {
    const r = 2.4 + Math.random() * 2.4;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    puff.position.set((i - puffs / 2) * 3.1, Math.random() * 1.6, Math.random() * 2.4);
    puff.scale.y = 0.72;
    g.add(puff);
  }
  return g;
}

// ناحیه‌ای که دوربین پیش‌فرض در آن قرار می‌گیرد؛ برای جلوگیری از قرار گرفتن
// درخت/سنگ بزرگ در نزدیکی دوربین
const CAM_XZ = { x: -31, z: 29 };

function nearCamera(x, z, radius = 22) {
  return Math.hypot(x - CAM_XZ.x, z - CAM_XZ.z) < radius;
}

// آیا این نقطه در خط دید دوربین تا تیرکمان قرار می‌گیرد؟ (تا روی پرنده نیفتد)
function onSightline(x, z, pad = 9) {
  const ax = CAM_XZ.x;
  const az = CAM_XZ.z;
  const dx = -11 - ax;
  const dz = -az;
  const len2 = dx * dx + dz * dz;
  const t = ((x - ax) * dx + (z - az) * dz) / len2;
  if (t < 0.3 || t > 2.6) return false;
  const px = ax + dx * t;
  const pz = az + dz * t;
  return Math.hypot(x - px, z - pz) < pad;
}

export function buildEnvironment(scene) {
  scene.add(makeSky());

  const groundMat = new THREE.MeshLambertMaterial({ color: 0x86c95f });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // لکه‌های تیره‌تر چمن برای تنوع
  const patchMat = new THREE.MeshLambertMaterial({ color: 0x79bb52 });
  const patchGeo = new THREE.CircleGeometry(1, 18);
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 110;
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(Math.cos(a) * dist, 0.01, Math.sin(a) * dist);
    patch.scale.setScalar(2 + Math.random() * 5);
    scene.add(patch);
  }

  // خاکِ زیر تیرکمان
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(3.1, 24),
    new THREE.MeshLambertMaterial({ color: 0xb59268 }),
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(-11, 0.02, 0);
  dirt.receiveShadow = true;
  scene.add(dirt);

  // درخت‌ها (دور از زمین بازی)
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 34 + Math.random() * 90;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (x > -24 && x < 30 && Math.abs(z) < 26) continue;
    if (nearCamera(x, z, 26) || onSightline(x, z, 10)) continue;
    const tree = makeTree(0.8 + Math.random() * 0.9);
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
  }

  // بوته‌ها
  const bushMat = new THREE.MeshLambertMaterial({ color: 0x63b447 });
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 45;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (x > -24 && x < 26 && Math.abs(z) < 15) continue;
    if (Math.hypot(x + 11, z) < 15) continue;
    if (nearCamera(x, z, 24) || onSightline(x, z, 9)) continue;
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.9, 9, 7), bushMat);
    bush.position.set(x, 0.45, z);
    bush.scale.y = 0.8;
    bush.castShadow = true;
    scene.add(bush);
  }

  // سنگ‌های پراکنده
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x9aa3a0 });
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 50;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    if (x > -24 && x < 26 && Math.abs(z) < 15) continue;
    if (Math.hypot(x + 11, z) < 15) continue;
    if (nearCamera(x, z, 24) || onSightline(x, z, 9)) continue;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.8, 0), rockMat);
    rock.position.set(x, 0.18, z);
    rock.rotation.set(Math.random(), Math.random() * 6, Math.random());
    rock.scale.y = 0.7;
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  // ابرها
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cloud = makeCloud();
    const a = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 120;
    cloud.position.set(Math.cos(a) * dist, 30 + Math.random() * 22, Math.sin(a) * dist);
    cloud.userData.speed = 0.5 + Math.random() * 0.9;
    scene.add(cloud);
    clouds.push(cloud);
  }

  // تپه‌های دور
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x6eb34c });
  const hills = [
    [-300, 0, -360, 190, 22, 140],
    [320, 0, -260, 220, 24, 150],
    [40, 0, -440, 280, 26, 190],
    [-400, 0, 60, 180, 18, 130],
    [360, 0, 200, 210, 20, 150],
  ];
  for (const [x, y, z, sx, sy, sz] of hills) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), hillMat);
    hill.position.set(x, y, z);
    hill.scale.set(sx, sy, sz);
    scene.add(hill);
  }

  return {
    update(dt) {
      for (const cloud of clouds) {
        cloud.position.x += cloud.userData.speed * dt;
        if (cloud.position.x > 220) cloud.position.x = -220;
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/*  بلوک‌ها، خوک و پرنده                                               */
/* ------------------------------------------------------------------ */

const textureCache = new Map();
function materialFor(type) {
  if (!textureCache.has(type)) {
    let map = null;
    if (type === 'wood') map = makeWoodTexture();
    else if (type === 'stone') map = makeStoneTexture();
    else if (type === 'ice') map = makeIceTexture();
    const def = MATERIALS[type] || MATERIALS.wood;
    const mat = new THREE.MeshLambertMaterial({
      color: map ? 0xffffff : def.color,
      map,
    });
    if (type === 'ice') {
      mat.transparent = true;
      mat.opacity = 0.82;
      mat.emissive = new THREE.Color(0x2a5866);
      mat.emissiveIntensity = 0.25;
    }
    textureCache.set(type, mat);
  }
  return textureCache.get(type);
}

export function makeBlockMesh(ent) {
  const geo = new THREE.BoxGeometry(ent.w, ent.h, ent.d);
  const map = materialFor(ent.type).map;
  let mat;
  if (map) {
    const tex = map.clone();
    tex.needsUpdate = true;
    tex.repeat.set(
      Math.max(1, Math.round(ent.w / 1.6)),
      Math.max(1, Math.round(ent.h / 1.6)),
    );
    const src = MATERIALS[ent.type];
    mat = new THREE.MeshLambertMaterial({
      map: tex,
      color: 0xffffff,
      transparent: ent.type === 'ice',
      opacity: ent.type === 'ice' ? 0.85 : 1,
    });
    if (ent.type === 'ice') {
      mat.emissive = new THREE.Color(0x2a5866);
      mat.emissiveIntensity = 0.22;
    }
    mat.userData.baseColor = src.color;
  } else {
    mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x3b2a1a, transparent: true, opacity: 0.25 }),
  );
  edges.scale.setScalar(1.001);
  mesh.add(edges);
  return mesh;
}

export function makePigMesh(r) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x7ed03f });
  const snoutMat = new THREE.MeshLambertMaterial({ color: 0xa9e86b });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x2a2d22 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), bodyMat);
  body.scale.set(1, 0.95, 1);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // پوزه
  const snout = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 16, 12), snoutMat);
  snout.position.set(r * 0.86, -r * 0.05, 0);
  snout.scale.set(0.75, 1, 1);
  snout.castShadow = true;
  g.add(snout);
  for (const z of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(r * 0.075, 8, 6), blackMat);
    nostril.position.set(r * 1.08, -r * 0.03, z * r * 0.12);
    g.add(nostril);
  }

  // چشم‌ها
  for (const z of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.23, 14, 10), whiteMat);
    eye.position.set(r * 0.62, r * 0.3, z * r * 0.34);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 10, 8), blackMat);
    pupil.position.set(r * 0.8, r * 0.3, z * r * 0.36);
    g.add(pupil);
    // ابروی خشمگین
    const brow = new THREE.Mesh(new THREE.BoxGeometry(r * 0.09, r * 0.07, r * 0.3), blackMat);
    brow.position.set(r * 0.72, r * 0.55, z * r * 0.32);
    brow.rotation.z = 0.35;
    brow.rotation.x = z * -0.15;
    g.add(brow);
    // گوش
    const ear = new THREE.Mesh(new THREE.ConeGeometry(r * 0.17, r * 0.3, 8), bodyMat);
    ear.position.set(r * 0.15, r * 0.9, z * r * 0.55);
    ear.rotation.z = -0.4;
    ear.rotation.x = z * 0.3;
    ear.castShadow = true;
    g.add(ear);
  }
  return g;
}

export function makeBirdMesh() {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xe2453d });
  const redDark = new THREE.MeshLambertMaterial({ color: 0xb92f2b });
  const cream = new THREE.MeshLambertMaterial({ color: 0xffe0b8 });
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const black = new THREE.MeshLambertMaterial({ color: 0x251f1f });
  const orange = new THREE.MeshLambertMaterial({ color: 0xf6a623 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), red);
  body.scale.set(1.05, 1, 1);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), cream);
  belly.position.set(0.2, -0.2, 0);
  belly.scale.set(0.9, 0.8, 0.95);
  g.add(belly);

  // چشم‌ها
  for (const z of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), white);
    eye.position.set(0.36, 0.17, z * 0.2);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), black);
    pupil.position.set(0.48, 0.18, z * 0.22);
    g.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.3), redDark);
    brow.position.set(0.34, 0.36, z * 0.19);
    brow.rotation.z = 0.25;
    brow.rotation.x = z * 0.22;
    g.add(brow);
  }

  // منقار
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 8), orange);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.64, -0.02, 0);
  beak.castShadow = true;
  g.add(beak);

  // پرهای دم
  for (const [y, z, s2] of [
    [0.14, 0, 1.1],
    [0.24, 0.16, 0.9],
    [0.02, -0.16, 0.9],
  ]) {
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42 * s2, 6), redDark);
    feather.rotation.z = Math.PI / 2 + 0.45;
    feather.position.set(-0.64, y, z);
    feather.castShadow = true;
    g.add(feather);
  }

  // کاکل روی سر
  for (const [x, z, tilt] of [
    [0.02, 0, -0.25],
    [-0.08, 0.12, 0.15],
    [-0.08, -0.12, -0.6],
  ]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 6), redDark);
    tuft.position.set(x, 0.56, z);
    tuft.rotation.z = tilt;
    tuft.castShadow = true;
    g.add(tuft);
  }

  // پاها
  for (const z of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6), orange);
    leg.position.set(0.05, -0.55, z);
    leg.rotation.x = 0.2;
    g.add(leg);
  }

  g.rotation.y = 0;
  return g;
}

/* ------------------------------------------------------------------ */
/*  تیرکمان                                                            */
/* ------------------------------------------------------------------ */

export const SLING_ANCHOR = new THREE.Vector3(-11, 3.42, 0);
export const SLING_TIPS = [
  new THREE.Vector3(-11.02, 3.46, -0.82),
  new THREE.Vector3(-11.02, 3.46, 0.82),
];

export class Slingshot {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const bandMat = new THREE.MeshLambertMaterial({ color: 0x5a2d1b });
    const bandBackMat = new THREE.MeshLambertMaterial({ color: 0x7a3c22 });

    // تنه
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 2.1, 12), woodMat);
    trunk.position.set(-11, 1.05, 0);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.group.add(trunk);

    // گره/بند دور تنه
    const wrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.28, 12),
      new THREE.MeshLambertMaterial({ color: 0x5f3a1c }),
    );
    wrap.position.set(-11, 1.95, 0);
    this.group.add(wrap);

    // دو شاخه
    for (let i = 0; i < 2; i++) {
      const z = i === 0 ? -1 : 1;
      const branch = cylinderBetween(0.2, woodMat);
      setSegment(branch, new THREE.Vector3(-11, 1.95, z * 0.1), new THREE.Vector3(-11.02, 3.46, z * 0.82));
      branch.castShadow = true;
      this.group.add(branch);
    }

    // کش‌ها
    this.bandFront = cylinderBetween(0.055, bandMat, 6);
    this.bandBack = cylinderBetween(0.055, bandBackMat, 6);
    this.group.add(this.bandFront, this.bandBack);

    this.tuck = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.34, 0.55),
      new THREE.MeshLambertMaterial({ color: 0x6b351f }),
    );
    this.group.add(this.tuck);

    this.setBirdPos(null);
  }

  setBirdPos(pos) {
    const target = pos || SLING_ANCHOR;
    // کش‌ها کمی پشت پرنده بسته می‌شوند تا دیده شوند
    _a.set(target.x + 0.12, target.y, target.z - 0.46);
    _b.set(target.x + 0.12, target.y, target.z + 0.46);
    setSegment(this.bandFront, SLING_TIPS[0], _a);
    setSegment(this.bandBack, SLING_TIPS[1], _b);
    this.tuck.position.set(target.x - 0.35, target.y, target.z);
    this.tuck.lookAt(SLING_TIPS[0]);
  }
}

/* ------------------------------------------------------------------ */
/*  مسیر پیش‌بینی و ذرات                                                */
/* ------------------------------------------------------------------ */

export class Trajectory {
  constructor(scene) {
    const geo = new THREE.SphereGeometry(0.1, 8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff2a8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, 48);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.dummy = new THREE.Object3D();
  }

  update(start, velocity, gravity = -20) {
    const dt = 0.055;
    let t = 0;
    let count = 0;
    const pos = new THREE.Vector3();
    for (let i = 0; i < 48; i++) {
      t += dt;
      pos.set(
        start.x + velocity.x * t,
        start.y + velocity.y * t + 0.5 * gravity * t * t,
        start.z + velocity.z * t,
      );
      if (pos.y < 0.08 || pos.x > 45 || pos.z > 45 || pos.z < -45) break;
      const s = Math.max(0.35, 1 - i / 50);
      this.dummy.position.copy(pos);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(count++, this.dummy.matrix);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = count > 0;
  }

  hide() {
    this.mesh.visible = false;
  }
}

export class Debris {
  constructor(scene) {
    this.items = [];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 110; i++) {
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.castShadow = false;
      scene.add(mesh);
      this.items.push({
        mesh,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
      });
    }
    this.cursor = 0;
    this.scene = scene;
  }

  spawn(position, color, count = 10, size = 0.35, spread = 6) {
    for (let i = 0; i < count; i++) {
      const item = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % this.items.length;
      item.mesh.visible = true;
      item.mesh.position.set(position.x, position.y, position.z);
      item.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const s = size * (0.5 + Math.random());
      item.mesh.scale.set(s, s * (0.6 + Math.random() * 0.7), s);
      item.mesh.material.color.setHex(color);
      item.mesh.material.opacity = 1;
      item.life = 0;
      item.maxLife = 0.7 + Math.random() * 0.6;
      item.vel.set(
        (Math.random() - 0.5) * spread,
        Math.random() * spread * 0.8 + 1.5,
        (Math.random() - 0.5) * spread,
      );
      item.spin.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      );
    }
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.mesh.visible) continue;
      item.life += dt;
      if (item.life >= item.maxLife) {
        item.mesh.visible = false;
        continue;
      }
      item.vel.y -= 22 * dt;
      item.mesh.position.addScaledVector(item.vel, dt);
      if (item.mesh.position.y < 0.08) {
        item.mesh.position.y = 0.08;
        item.vel.y *= -0.35;
        item.vel.x *= 0.7;
        item.vel.z *= 0.7;
      }
      item.mesh.rotation.x += item.spin.x * dt;
      item.mesh.rotation.y += item.spin.y * dt;
      item.mesh.rotation.z += item.spin.z * dt;
      item.mesh.material.opacity = 1 - (item.life / item.maxLife) ** 2;
    }
  }
}

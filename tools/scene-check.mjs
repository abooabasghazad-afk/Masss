/**
 * تست بدون مرورگر برای ساخت مش‌ها، محیط و مسیر پیش‌بینی.
 * اجرا: node tools/scene-check.mjs
 */
const listeners = [];
const fakeCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  fillRect() {},
  strokeRect() {},
  beginPath() {},
  closePath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  fill() {},
  arc() {},
  ellipse() {},
  createLinearGradient() {
    return { addColorStop() {} };
  },
  createRadialGradient() {
    return { addColorStop() {} };
  },
  drawImage() {},
  clearRect() {},
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  scale() {},
  setTransform() {},
  getImageData() {
    return { data: new Uint8ClampedArray(4) };
  },
};

globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  addEventListener() {},
};
globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') {
      return {
        width: 1,
        height: 1,
        style: {},
        getContext: () => fakeCtx,
        addEventListener() {},
        removeEventListener() {},
      };
    }
    return { style: {}, appendChild() {}, addEventListener() {} };
  },
  createElementNS() {
    return { style: {}, addEventListener() {} };
  },
  addEventListener(type, fn) {
    listeners.push([type, fn]);
  },
  querySelectorAll() {
    return [];
  },
};

const THREE = await import('three');
const sceneMod = await import('../src/scene.js');
const { LEVELS } = await import('../src/levels.js');
const { PhysWorld } = await import('../src/physics.js');

const rendererless = new THREE.Scene();
const env = sceneMod.buildEnvironment(rendererless);
env.update(0.016);
console.log('environment children:', rendererless.children.length);

const slingshot = new sceneMod.Slingshot(rendererless);
slingshot.setBirdPos(new THREE.Vector3(-12, 2.5, 0.4));
slingshot.setBirdPos(null);

const traj = new sceneMod.Trajectory(rendererless);
traj.update(new THREE.Vector3(-11, 3.4, 0), new THREE.Vector3(16, 9, 0));
console.log('trajectory dots:', traj.mesh.count);

const debris = new sceneMod.Debris(rendererless);
debris.spawn({ x: 5, y: 2, z: 0 }, 0xffffff, 10, 0.3, 6);
debris.update(0.1);
console.log('debris visible:', debris.items.filter((i) => i.mesh.visible).length);

for (const level of LEVELS) {
  const world = new PhysWorld();
  for (const def of level.blocks) {
    const ent = world.addBlock(def);
    const mesh = sceneMod.makeBlockMesh(ent);
    mesh.position.set(def.x, def.y, def.z);
    mesh.quaternion.copy(ent.body.quaternion);
  }
  for (const def of level.pigs) {
    world.addPig(def);
    const pig = sceneMod.makePigMesh(def.r);
    rendererless.add(pig);
  }
  console.log(`level ${level.id}: ${level.blocks.length} blocks + ${level.pigs.length} pigs OK`);
}

const bird = sceneMod.makeBirdMesh();
rendererless.add(bird);
const traj2 = new sceneMod.Trajectory(rendererless);
traj2.update(new THREE.Vector3(-11, 3.4, 0), new THREE.Vector3(5, 2, 0));
console.log('scene objects:', rendererless.children.length);
console.log('ALL SCENE CHECKS PASSED');

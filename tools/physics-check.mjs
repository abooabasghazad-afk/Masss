/**
 * تست فیزیک بدون مرورگر: پایداری سازه‌ها + اثر شلیک.
 * اجرا:  node tools/physics-check.mjs
 */
import { PhysWorld } from '../src/physics.js';
import { LEVELS } from '../src/levels.js';

const SLING = { x: -11, y: 3.42, z: 0 };

function build(level) {
  const world = new PhysWorld();
  const stats = { broken: 0, pigs: 0, impacts: 0 };
  world.onBlockBroken = () => stats.broken++;
  world.onPigKilled = () => stats.pigs++;
  world.onImpact = () => stats.impacts++;
  for (const b of level.blocks) world.addBlock(b);
  for (const p of level.pigs) world.addPig(p);
  return { world, stats };
}

function stability(level) {
  const { world, stats } = build(level);
  const start = world.entities.map((e) => ({
    e,
    x: e.body.position.x,
    y: e.body.position.y,
    z: e.body.position.z,
  }));
  const pigCount = level.pigs.length;
  for (let i = 0; i < 60 * 6; i++) world.step(1 / 60);
  let maxMove = 0;
  let maxEnt = null;
  for (const s of start) {
    if (!s.e.alive) continue;
    const d = Math.hypot(
      s.e.body.position.x - s.x,
      s.e.body.position.y - s.y,
      s.e.body.position.z - s.z,
    );
    if (d > maxMove) {
      maxMove = d;
      maxEnt = s.e;
    }
  }
  return { maxMove, maxEnt, stats, pigsLeft: pigCount - stats.pigs };
}

function shoot(level, v, seconds = 9) {
  const { world, stats } = build(level);
  for (let i = 0; i < 60; i++) world.step(1 / 60); // settle
  const before = { blocks: world.blocksAlive.length, pigs: world.pigsAlive.length };
  world.launchBird({ x: SLING.x, y: SLING.y, z: SLING.z }, v);
  const positions = [];
  for (let i = 0; i < 60 * seconds; i++) {
    world.step(1 / 60);
    if (i % 30 === 0 && world.bird) {
      positions.push(
        `(${world.bird.body.position.x.toFixed(1)},${world.bird.body.position.y.toFixed(1)},${world.bird.body.position.z.toFixed(1)})`,
      );
    }
  }
  return {
    v,
    broken: stats.broken,
    pigsKilled: stats.pigs,
    blocksLeft: world.blocksAlive.length,
    pigsLeft: world.pigsAlive.length,
    before,
    path: positions.join(' '),
  };
}

for (const level of LEVELS) {
  const s = stability(level);
  console.log(
    `L${level.id} stability: maxMove=${s.maxMove.toFixed(2)} ` +
      `(${s.maxEnt ? s.maxEnt.kind + ':' + (s.maxEnt.type || s.maxEnt.r) : '-'}) ` +
      `broken=${s.stats.broken} pigsKilled=${s.stats.pigs} pigsLeft=${s.pigsLeft}`,
  );
}

const shots = [
  [16, 9, 0],
  [15, 11, 0],
  [18, 8, 0],
  [14, 12, 0],
  [17, 10, 0],
];

for (const level of LEVELS) {
  console.log(`\n== Level ${level.id} ==`);
  for (const v of shots) {
    const r = shoot(level, { x: v[0], y: v[1], z: v[2] });
    console.log(
      `v=(${v}) -> broken=${r.broken} killed=${r.pigsKilled} pigsLeft=${r.pigsLeft} blocksLeft=${r.blocksLeft}`,
    );
  }
  const r = shoot(level, { x: 16, y: 9, z: 0 });
  console.log('path:', r.path);
}

// شبیه‌سازی زاویه‌های واقعی کشیدن پرنده (نقشه‌ی ورودی بازی)
function dragToVelocity(dx, dy, perPx = 0.0336) {
  const k = perPx * 0.5;
  const pullUp = Math.max(0, dy);
  const back = pullUp + Math.abs(dx) * 0.35;
  const px = -back * k;
  const py = -pullUp * k;
  const pz = dx * 0.22 * k;
  const len = Math.hypot(px, py, pz);
  const maxPull = 3.1;
  const scale = len > maxPull ? maxPull / len : 1;
  const POWER = 7.6;
  return {
    x: -px * scale * POWER,
    y: -py * scale * POWER,
    z: -pz * scale * POWER,
  };
}

console.log('\n== Drag mapping sweep ==');
for (const level of LEVELS) {
  let best = null;
  for (const dy of [60, 80, 100, 120, 140]) {
    for (const dx of [-60, -30, 0, 30, 60]) {
      const v = dragToVelocity(dx, dy);
      const r = shoot(level, v, 8);
      if (!best || r.pigsKilled > best.pigsKilled) best = { dx, dy, ...r, v };
    }
  }
  console.log(
    `L${level.id}: best drag=(${best.dx},${best.dy}) v=(${best.v.x.toFixed(1)},${best.v.y.toFixed(1)},${best.v.z.toFixed(1)}) ` +
      `killed=${best.pigsKilled}/${level.pigs.length} broken=${best.broken}`,
  );
  for (const dy of [90, 120, 150]) {
    const v = dragToVelocity(0, dy);
    const r = shoot(level, v, 8);
    console.log(
      `   drag(0,${dy}) v=(${v.x.toFixed(1)},${v.y.toFixed(1)}) -> killed=${r.pigsKilled} broken=${r.broken} pigsLeft=${r.pigsLeft}`,
    );
  }
}

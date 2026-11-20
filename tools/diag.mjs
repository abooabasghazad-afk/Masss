import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8080/?level=1', { waitUntil: 'networkidle0' });
await sleep(2000);
await page.click('#btn-play');
await sleep(1200);

const snapshot = () => page.evaluate(() => {
  const g = window.__ag3d;
  const p = g.physics;
  if (!p) return null;
  return {
    mode: g.state.mode,
    score: g.state.score,
    birdsLeft: g.state.birdsLeft,
    maxImpact: p.maxBirdImpact,
    bird: p.bird ? { x: +p.bird.body.position.x.toFixed(2), y: +p.bird.body.position.y.toFixed(2), z: +p.bird.body.position.z.toFixed(2), v: +p.bird.body.velocity.length().toFixed(2) } : null,
    pigs: p.pigsAlive.length,
    blocks: p.blocksAlive.map((b) => ({ t: b.type, hp: Math.round(b.health), x: +b.body.position.x.toFixed(1), y: +b.body.position.y.toFixed(1), z: +b.body.position.z.toFixed(1), ry: +b.body.quaternion.y.toFixed(2) })),
    aimPull: { x: +g.state.aimPull.x.toFixed(2), y: +g.state.aimPull.y.toFixed(2), z: +g.state.aimPull.z.toFixed(2) },
  };
});
console.log('start:', JSON.stringify(await snapshot()));

const x = 640, y = 360;
await page.mouse.move(x, y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(x, y + i * 10.5); await sleep(25); }
console.log('aim:', JSON.stringify(await snapshot()));
await page.mouse.up();
for (let i = 0; i < 12; i++) {
  await sleep(400);
  const s = await snapshot();
  console.log(`t=${(i + 1) * 0.4}s`, JSON.stringify({ mode: s.mode, score: s.score, bird: s.bird, maxImpact: +s.maxImpact.toFixed(1), pigs: s.pigs, nBlocks: s.blocks.length }));
}
await browser.close();

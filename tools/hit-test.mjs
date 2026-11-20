import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: true,
  defaultViewport: { width: 960, height: 540, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text()); });
await page.goto('http://127.0.0.1:8080/?level=1', { waitUntil: 'networkidle0' });
await sleep(2000);
await page.click('#btn-play');
await sleep(2500);

// شلیک مستقیم با استفاده از قلاب دیباگ (بدون رابط کشیدن)
await page.evaluate(() => {
  const g = window.__ag3d;
  g.state.mode = 'flying';
  g.state.flightTime = 0;
  g.physics.launchBird({ x: -11, y: 4.5, z: 0 }, { x: 17, y: 11, z: 0 });
});

for (let i = 0; i < 20; i++) {
  await sleep(1500);
  const s = await page.evaluate(() => {
    const g = window.__ag3d;
    return {
      mode: g.state.mode,
      score: g.state.score,
      birdsLeft: g.state.birdsLeft,
      pigs: g.physics ? g.physics.pigsAlive.length : -1,
      blocks: g.physics ? g.physics.blocksAlive.length : -1,
      result: document.getElementById('screen-result').classList.contains('hidden')
        ? null
        : document.getElementById('result-title').textContent,
    };
  });
  console.log(i, JSON.stringify(s));
  if (s.result) break;
}
await page.screenshot({ path: '/tmp/hit.png' });
await browser.close();

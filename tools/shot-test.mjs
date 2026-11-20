import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const level = process.argv[2] || '1';
const out = process.argv[3] || '/tmp/shot';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error') logs.push(`[error] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(`http://127.0.0.1:8080/?level=${level}`, { waitUntil: 'networkidle0' });
await sleep(2000);
await page.click('#btn-play');
await sleep(1500);

const st = () =>
  page.evaluate(() => ({
    score: document.getElementById('score-value').textContent,
    birds: document.querySelectorAll('.bird-chip:not(.used)').length,
    result: document.getElementById('screen-result').classList.contains('hidden') ? null : {
      title: document.getElementById('result-title').textContent,
      score: document.getElementById('result-score').textContent,
      stars: [...document.querySelectorAll('#result-stars .star')].filter((s) => s.classList.contains('on')).length,
    },
  }));

const drags = JSON.parse(process.argv[4] || '[[0,100]]');
let n = 0;
for (const [dx, dy] of drags) {
  const cur = await st();
  if (cur.result) break;
  const x = 640;
  const y = 360;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y + (dy * i) / steps);
    await sleep(25);
  }
  await page.screenshot({ path: `${out}-aim${n}.png` });
  await page.mouse.up();
  await sleep(500);
  await page.screenshot({ path: `${out}-fly${n}.png` });
  await sleep(5000);
  await page.screenshot({ path: `${out}-after${n}.png` });
  console.log(`shot ${n}:`, JSON.stringify(await st()));
  n++;
  await sleep(800);
}
await page.screenshot({ path: `${out}-final.png` });
console.log('final:', JSON.stringify(await st()));
console.log(logs.join('\n') || '(no errors)');
await browser.close();

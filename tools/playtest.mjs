/**
 * بازی‌کردن خودکار بازی با کرومیوم بدون‌رابط + گرفتن اسکرین‌شات.
 * اجرا: LD_LIBRARY_PATH=... node tools/playtest.mjs
 */
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://127.0.0.1:8080/';
const prefix = process.argv[3] || '/tmp/play';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const executablePath = await chromium.executablePath();
const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath,
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await sleep(2500);
await page.screenshot({ path: `${prefix}-menu.png` });

// شروع بازی
await page.click('#btn-play');
await sleep(1800);
await page.screenshot({ path: `${prefix}-level.png` });

const state = () =>
  page.evaluate(() => ({
    score: document.getElementById('score-value').textContent,
    birds: document.querySelectorAll('.bird-chip:not(.used)').length,
    resultHidden: document.getElementById('screen-result').classList.contains('hidden'),
    resultTitle: document.getElementById('result-title').textContent,
    hintHidden: document.getElementById('hint').classList.contains('hidden'),
  }));
console.log('after start:', JSON.stringify(await state()));

// کشیدن پرنده: پایین و کمی چپ
const box = await page.evaluate(() => {
  const c = document.getElementById('game').getBoundingClientRect();
  return { x: c.x, y: c.y, w: c.width, h: c.height };
});
const startX = box.x + box.w * 0.33;
const startY = box.y + box.h * 0.55;

await page.mouse.move(startX, startY);
await page.mouse.down();
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(startX - i * 4, startY + i * 9);
  await sleep(30);
}
await sleep(300);
await page.screenshot({ path: `${prefix}-aim.png` });
console.log('power width:', await page.evaluate(() => document.getElementById('power-fill').style.width));

await page.mouse.up();
await sleep(700);
await page.screenshot({ path: `${prefix}-flight.png` });
await sleep(4500);
await page.screenshot({ path: `${prefix}-after.png` });
console.log('after shot 1:', JSON.stringify(await state()));

// چند شلیک دیگر برای نزدیک‌شدن به پایان مرحله
for (let shot = 2; shot <= 4; shot++) {
  await sleep(1200);
  const st = await state();
  if (!st.resultHidden) break;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(startX - i * 3, startY + i * 8);
    await sleep(30);
  }
  await page.mouse.up();
  await sleep(6000);
  console.log(`after shot ${shot}:`, JSON.stringify(await state()));
}

await page.screenshot({ path: `${prefix}-end.png` });
console.log('final:', JSON.stringify(await state()));
console.log(logs.length ? logs.join('\n') : '(no errors)');
await browser.close();

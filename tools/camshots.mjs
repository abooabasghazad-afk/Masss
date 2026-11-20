import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const shots = JSON.parse(process.argv[2] || '[]');
const outPrefix = process.argv[3] || '/tmp/cam';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});

let i = 0;
for (const q of shots) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:8080/?${q}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1800);
  await page.click('#btn-play');
  await sleep(1500);
  await page.screenshot({ path: `${outPrefix}-${i}.png` });
  console.log(`${outPrefix}-${i}.png  <- ${q}`);
  await page.close();
  i++;
}
await browser.close();

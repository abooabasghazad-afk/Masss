/**
 * گرفتن اسکرین‌شات و بررسی خطاهای کنسول با کرومیوم بدون‌رابط.
 * اجرا: node tools/screenshot.mjs [url] [out.png]
 */
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://127.0.0.1:8080/';
const out = process.argv[3] || '/tmp/game.png';

chromium.setGraphicsMode = true;
const executablePath = await chromium.executablePath();
console.log('chromium:', executablePath);

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  executablePath,
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const logs = [];
page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => logs.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
if (process.argv[4] === 'play') {
  await page.click('#btn-play');
  await new Promise((r) => setTimeout(r, 2000));
}

const info = await page.evaluate(() => {
  const canvas = document.getElementById('game');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return {
    loading: !!document.getElementById('loading'),
    menuVisible: !document.getElementById('screen-menu').classList.contains('hidden'),
    canvas: canvas ? `${canvas.width}x${canvas.height}` : 'none',
    gl: gl ? gl.getParameter(gl.VERSION) : 'no-webgl',
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: out });
console.log('screenshot ->', out);
console.log(logs.join('\n') || '(no console output)');
await browser.close();

// node shot.js out-prefix W H dsf mobile(0/1) y1 y2 ...  (y: número px, "pN" = progreso N del escenario J, "#id" = sección)
const puppeteer = require('/workspace/web-y2k-build/node_modules/puppeteer-core');
const VCLOCK = require('./vclock.js');
const path = require('path');
const [,, OUT, W, H, DSF, MOB, ...YS] = process.argv;
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio'] });
  const p = await b.newPage();
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warn') console.log('console:', m.text().slice(0, 200)); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.setViewport({ width: +W, height: +H, deviceScaleFactor: +DSF, isMobile: MOB === '1' });
  await p.evaluateOnNewDocument(VCLOCK);
  await p.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => { await window.__ready; });
  await p.mouse.move(+W * .62, +H * .4);
  for (let i = 0; i < 30; i++) await p.evaluate(() => __tick(33.3));
  let k = 0;
  for (const s of YS) {
    const y = await p.evaluate(s => {
      const w = document.getElementById('jstageWrap');
      if (s[0] === 'p') return w.offsetTop + (+s.slice(1)) * (w.offsetHeight - innerHeight);
      if (s[0] === '#') return document.querySelector(s).getBoundingClientRect().top + scrollY;
      return +s;
    }, s);
    await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
    for (let i = 0; i < 90; i++) await p.evaluate(() => __tick(33.3));
    const f = `${OUT}-${String(k++).padStart(2, '0')}.png`;
    await p.screenshot({ path: f }); console.log(f, s, Math.round(y));
  }
  await b.close();
})();

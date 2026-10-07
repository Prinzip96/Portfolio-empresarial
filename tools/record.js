// Graba el vídeo fotograma a fotograma con reloj virtual. node record.js desktop|reel carpeta-frames
const puppeteer = require('/workspace/web-y2k-build/node_modules/puppeteer-core');
const VCLOCK = require('./vclock.js');
const fs = require('fs'), path = require('path');
const [,, MODE, OUT] = process.argv;
const DESK = MODE === 'desktop';
const VW = DESK ? 1440 : 360, VH = DESK ? 900 : 640, DSF = DESK ? 1 : 3, FPS = 30, DT = 1000 / FPS;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const sm = t => .5 - .5 * Math.cos(Math.PI * t);
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF, isMobile: !DESK });
  await p.evaluateOnNewDocument(VCLOCK);
  await p.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => { await window.__ready; });
  const L = await p.evaluate(() => {
    const w = document.getElementById('jstageWrap'), top = id => Math.round(document.getElementById(id).getBoundingClientRect().top + scrollY);
    return { top: w.offsetTop, span: w.offsetHeight - innerHeight, ring: top('ring'), serv: top('servicios'), H: document.documentElement.scrollHeight };
  });
  const P = k => L.top + L.span * k, item = k => P(.3 + .64 * k / 4);
  const F = []; let y = 0, m = DESK ? [VW * .66, VH * .42] : [VW * .7, VH * .3];
  const push = () => F.push({ y, m: [...m] });
  const hold = (s, path) => { const n = Math.round(s * FPS); for (let i = 0; i < n; i++) { if (path) m = path(i / n); push(); } };
  const go = (ty, s, mt) => { const y0 = y, m0 = [...m], n = Math.round(s * FPS); for (let i = 1; i <= n; i++) { y = y0 + (ty - y0) * sm(i / n); if (mt) { const e = ease(i / n); m = [m0[0] + (mt[0] - m0[0]) * e, m0[1] + (mt[1] - m0[1]) * e]; } push(); } };
  const front = DESK ? [VW * .5, VH * .62] : [VW * .5, VH * .62];
  const wob = (c, a) => t => [c[0] + Math.sin(t * 6.28) * a, c[1] + Math.cos(t * 6.28) * a * .5];
  if (DESK) {
    hold(.6); go(0, 1.6, [VW * .72, VH * .5]); hold(1.4, wob([VW * .7, VH * .45], 60));
    go(item(0), 3.2, front); hold(1.4, wob(front, 30));
    for (let k = 1; k < 5; k++) { go(item(k), 1.4, [front[0] + (k % 2 ? 40 : -40), front[1]]); hold(1.3, wob(m, 24)); }
    go(L.ring - VH * .1, 2.4, [VW * .55, VH * .45]); hold(1.4, wob(m, 40));
    go(L.serv - 20, 1.6, [VW * .4, VH * .55]); hold(1.8, t => [VW * (.35 + .1 * t), VH * (.4 + .3 * t)]);
  } else {
    hold(.5); hold(1.1, wob([VW * .7, VH * .3], 20));
    go(item(0), 2.4, front); hold(1, wob(front, 10));
    for (let k = 1; k < 5; k++) { go(item(k), 1.05, front); hold(.85, wob(front, 8)); }
    go(L.ring - VH * .05, 1.8, [VW * .5, VH * .45]); hold(1.1);
    go(L.serv - 10, 1.3); hold(1.3);
  }
  console.log('frames', F.length, (F.length / FPS).toFixed(1) + 's', JSON.stringify(L));
  for (let i = 0; i < 30; i++) await p.evaluate(ms => __tick(ms), DT);
  const t0 = Date.now();
  for (let i = 0; i < F.length; i++) {
    const f = F[i];
    await p.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), Math.round(f.y));
    await p.mouse.move(f.m[0], f.m[1]);
    await p.evaluate(ms => __tick(ms), DT);
    await p.screenshot({ path: `${OUT}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
    if (i % 100 === 0) console.log('frame', i, '/', F.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await b.close(); console.log('done');
})();

// J06 cromada fija en el centro + anillo de trabajos que orbita con el scroll (Three.js)
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PIECES, FLARE, CUT_ANG } from './jshape.js';
import { SHOTS } from './shots.js';

const CAPTURE = /[?&]capture/.test(location.search);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const NARROW = matchMedia('(max-width: 760px)').matches;
const MOBILE = COARSE || NARROW;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const damp = (c, t, k, dt) => lerp(c, t, 1 - Math.exp(-k * dt));
const LIME = new THREE.Color('#bcff4d');

const wrap = $('#jstageWrap'), stageEl = $('#stage'), canvas = $('#gl');
const heroEl = $('#top'), orbitUI = $('#orbitUI');
if (wrap && canvas) start();

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !MOBILE,
      alpha: true,
      powerPreference: MOBILE ? 'low-power' : 'high-performance',
      preserveDrawingBuffer: CAPTURE,
    });
  } catch (e) { fallback(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, CAPTURE ? 1.5 : MOBILE ? 1.15 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
  const S = 1 / 150;
  const J = new THREE.Group(), RING = new THREE.Group();
  scene.add(J, RING);

  /* ---- entorno: estudio oscuro con tiras blancas y una lima ---- */
  {
    const pm = new THREE.PMREMGenerator(renderer);
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vP; void main(){ float y = vP.y;
        vec3 c = mix(vec3(.05), vec3(.55,.56,.55), smoothstep(.1,.95,y));
        c = mix(c, vec3(.02), smoothstep(.0,-.4,y));
        c = mix(c, vec3(.0), smoothstep(.14,.02,abs(y-.05)));
        c += vec3(.48,.62,.18) * smoothstep(.12,.0,abs(y+.22)) * .18;     // rebote lima del suelo
        gl_FragColor = vec4(c,1.); }`
    })));
    const panel = (w, h, x, y, z, col, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
    panel(26, 5, 0, 30, 6, '#ffffff', 4.5);
    panel(4, 30, -30, 4, 12, '#ffffff', 2.6);
    panel(1.6, 22, 28, 2, -12, '#bcff4d', 2.2);      // tira lima: reflejos lima en el cromo
    panel(14, 2.5, 8, -8, 26, '#f4f2ee', 1.4);
    scene.environment = pm.fromScene(s, .035).texture;
    pm.dispose();
  }

  /* ---- J06 ---- */
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xf1f2ee, metalness: 1, roughness: MOBILE ? .18 : .08, envMapIntensity: MOBILE ? 1.15 : 1.5,
    clearcoat: MOBILE ? 0 : .5, clearcoatRoughness: .06,
  });
  {
    const shapes = PIECES.map(pts => new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))));
    const bevelSeg = MOBILE ? 2 : 6;
    let geo = new THREE.ExtrudeGeometry(shapes, { depth: 64, bevelEnabled: true, bevelThickness: 12, bevelSize: 6, bevelSegments: bevelSeg, curveSegments: 1 });
    geo.translate(0, 0, -32); geo.scale(S, S, S);
    J.add(new THREE.Mesh(toCreasedNormals(geo, Math.PI / 5), chrome));
  }
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const starPath = (g, x, y, s, k = .1) => { g.beginPath(); g.moveTo(x, y - s); g.bezierCurveTo(x + s * k, y - s * k, x + s * k, y - s * k, x + s, y); g.bezierCurveTo(x + s * k, y + s * k, x + s * k, y + s * k, x, y + s); g.bezierCurveTo(x - s * k, y + s * k, x - s * k, y + s * k, x - s, y); g.bezierCurveTo(x - s * k, y - s * k, x - s * k, y - s * k, x, y - s); };
  const starT = tex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.14, 'rgba(225,255,170,.8)'); r.addColorStop(.42, 'rgba(188,255,77,.16)'); r.addColorStop(1, 'rgba(188,255,77,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; starPath(g, 128, 128, 120); g.fill(); });
  const streakT = tex(512, 32, (g) => { const l = g.createLinearGradient(0, 0, 512, 0); l.addColorStop(0, 'rgba(188,255,77,0)'); l.addColorStop(.5, 'rgba(255,255,255,1)'); l.addColorStop(1, 'rgba(188,255,77,0)'); g.fillStyle = l; g.fillRect(0, 14, 512, 4); g.globalAlpha = .35; g.fillRect(0, 8, 512, 16); });
  const fz = (32 + 12) * S + .02, fx = FLARE[0] * S, fy = FLARE[1] * S;
  const add = { blending: THREE.AdditiveBlending, depthTest: false, transparent: true };
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: starT, ...add, opacity: .3 })); glow.position.set(fx, fy, fz); glow.scale.setScalar(1.1); glow.renderOrder = 2;
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: starT, ...add })); star.position.set(fx, fy, fz + .01); star.renderOrder = 3;
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: streakT, ...add, side: THREE.DoubleSide })); streak.position.set(fx, fy, fz); streak.rotation.z = CUT_ANG * Math.PI / 180; streak.renderOrder = 1;
  J.add(streak, glow, star);

  /* ---- trabajos ---- */
  const P = [
    { key: 'mona', i: '01', name: 'Mona Real Estate', tags: 'Web · WordPress · Plugin a medida', year: '2026', url: './projects/mona.html', ext: false, bar: 'monarealestate.es', go: 'Ver proyecto' },
    { key: 'kw', i: '02', name: 'KW Solutions', tags: 'Web · WordPress · Plugin a medida', year: '2026', url: './projects/kw.html', ext: false, bar: 'kwsolutions.es', go: 'Ver proyecto' },
    { key: 'desbloque', i: '03', name: 'Desbloque', tags: 'Web · Producto · Proyecto real', year: '2026', url: './projects/desbloque.html', ext: false, bar: 'desbloque.com', go: 'Ver proyecto' },
    { key: 'phobia', i: '04', name: 'Phobia', tags: 'Web · Evento · Techno fest', year: '2025', url: './projects/phobia.html', ext: false, bar: 'prinzip96.github.io/PHOBIA', go: 'Ver proyecto' },
    { key: 'distrito4', i: '05', name: 'Distrito 4', tags: 'Web · Hostelería · Reservas', year: '2025', url: './projects/distrito4.html', ext: false, bar: 'prinzip96.github.io/Distrito-4', go: 'Ver proyecto' },
  ];
  const N = P.length, STEP = Math.PI * 2 / N, TW = 1024, TH = 700, BAR = 56;
  const items = [];
  const FS = `uniform sampler2D sharp; uniform sampler2D soft; uniform float blur; uniform float dark; uniform float lit; varying vec2 vUv;
    void main(){ vec3 c = mix(texture2D(sharp, vUv).rgb, texture2D(soft, vUv).rgb, blur);
      float l = dot(c, vec3(.299,.587,.114));
      c = mix(vec3(l)*vec3(.62,.7,.55), c, .3 + .7*dark) * (.16 + .84*dark);
      c += vec3(.74,1.,.3) * smoothstep(.0,.9,1.-vUv.x) * smoothstep(.6,1.,vUv.y) * .08 * lit;
      gl_FragColor = vec4(c,1.);
      #include <colorspace_fragment>
    }`;
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }';
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const bar = (g, label) => {
    g.fillStyle = '#141415'; g.fillRect(0, 0, TW, BAR);
    g.fillStyle = 'rgba(244,242,238,.12)'; g.fillRect(0, BAR - 1, TW, 1);
    [0, 1, 2].forEach(i => { g.fillStyle = 'rgba(244,242,238,.28)'; g.beginPath(); g.arc(30 + i * 22, BAR / 2, 6, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(244,242,238,.7)'; g.font = '400 20px Inter, sans-serif'; g.textBaseline = 'middle'; g.fillText(label, 112, BAR / 2 + 1);
  };
  const placeholder = (g) => {
    g.fillStyle = '#101011'; g.fillRect(0, BAR, TW, TH - BAR);
    const r = g.createRadialGradient(TW * .5, TH * .55, 0, TW * .5, TH * .55, TW * .5); r.addColorStop(0, 'rgba(188,255,77,.10)'); r.addColorStop(1, 'rgba(188,255,77,0)'); g.fillStyle = r; g.fillRect(0, BAR, TW, TH - BAR);
    for (let y = BAR + 6; y < TH; y += 8) for (let x = 6; x < TW; x += 8) { const d = Math.hypot(x - TW / 2, (y - TH * .55) * 1.5) / (TW * .48); if (Math.random() > d + .35) { g.fillStyle = 'rgba(188,255,77,.22)'; g.fillRect(x, y, 3, 3); } }
    g.textAlign = 'center'; g.fillStyle = '#f4f2ee'; g.font = 'italic 400 96px "Instrument Serif", serif'; g.fillText('desbloque.com', TW / 2, TH * .53);
    g.strokeStyle = '#bcff4d'; g.lineWidth = 2; rr(g, TW / 2 - 170, TH * .64, 340, 46, 23); g.stroke();
    g.fillStyle = '#bcff4d'; g.font = '500 18px Inter, sans-serif'; g.fillText('CAPTURA PENDIENTE', TW / 2, TH * .64 + 24); g.textAlign = 'left';
  };
  const blurCopy = src => { const sm = document.createElement('canvas'); sm.width = 96; sm.height = 66; sm.getContext('2d').drawImage(src, 0, 0, 96, 66); const o = document.createElement('canvas'); o.width = TW / 2; o.height = TH / 2; const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, TW / 2, TH / 2); return o; };
  const textures = p => new Promise(res => {
    const c = document.createElement('canvas'); c.width = TW; c.height = TH; const g = c.getContext('2d');
    const done = () => { bar(g, p.bar); const a = new THREE.CanvasTexture(c), b = new THREE.CanvasTexture(blurCopy(c)); for (const t of [a, b]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; } res([a, b]); };
    if (!SHOTS[p.key]) { placeholder(g); done(); return; }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { g.drawImage(img, 0, BAR, TW, TH - BAR); done(); };
    img.onerror = () => { placeholder(g); done(); };
    img.src = SHOTS[p.key];
  });
  const ready = (async () => {
    await Promise.all(['italic 96px "Instrument Serif"', '20px Inter', '500 18px Inter'].map(f => document.fonts.load(f))).catch(() => {});
    const w = 2.2, h = w * TH / TW;
    const seg = MOBILE ? 2 : 4;
    const bz = new RoundedBoxGeometry(w + .12, h + .12, .08, seg, .05), sc = new THREE.PlaneGeometry(w, h);
    // Carga en serie en móvil para no saturar memoria/GPU de golpe
    for (let i = 0; i < N; i++) {
      const [sharp, soft] = await textures(P[i]);
      if (MOBILE) { sharp.anisotropy = 1; soft.anisotropy = 1; }
      const g = new THREE.Group(), cm = chrome.clone();
      const mat = new THREE.ShaderMaterial({ uniforms: { sharp: { value: sharp }, soft: { value: soft }, blur: { value: 0 }, dark: { value: 1 }, lit: { value: 1 } }, vertexShader: VS, fragmentShader: FS });
      const screen = new THREE.Mesh(sc, mat); screen.position.z = .043; screen.userData.i = i;
      g.add(new THREE.Mesh(bz, cm), screen); RING.add(g);
      items.push({ g, mat, cm, screen, side: i % 2 ? 1 : -1 });
    }
  })();
  window.__ready = ready;

  /* ---- post: dither 1 bit lima (solo en transiciones; off en móvil) ---- */
  const USE_POST = !MOBILE && !REDUCED;
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: MOBILE ? 0 : 4 });
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { t: { value: rt.texture }, amt: { value: 0 }, px: { value: 3 }, lime: { value: new THREE.Vector3(LIME.r, LIME.g, LIME.b) }, bone: { value: new THREE.Vector3(.957, .949, .933) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }',
    fragmentShader: `uniform sampler2D t; uniform float amt; uniform float px; uniform vec3 lime; uniform vec3 bone; varying vec2 vUv;
      float bayer(vec2 p){ p = mod(floor(p), 4.); int i = int(p.x) + int(p.y)*4;
        float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
        for(int k=0;k<16;k++){ if(k==i) return (m[k]+.5)/16.; } return .5; }
      void main(){
        vec4 c = texture2D(t, vUv);
        vec3 col = c.rgb / max(c.a, 1e-4);
        #ifdef TONE_MAPPING
          col = toneMapping(col);
        #endif
        float l = dot(col, vec3(.299,.587,.114));
        float on = step(bayer(gl_FragCoord.xy / px), l * 1.15) * step(.08, c.a);
        vec3 dc = mix(lime, bone, step(.82, l));
        vec4 base = vec4(col * c.a, c.a);
        vec4 dith = vec4(dc * on, on);
        vec4 o = mix(base, dith, amt);
        gl_FragColor = o;
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false, premultipliedAlpha: true, transparent: true, toneMapped: true,
  }));
  const postScene = new THREE.Scene(); post.frustumCulled = false; postScene.add(post);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---- medidas ---- */
  let vw = 1, vh = 1, hw = 1, hh = 1, mobile = false, top = 0, span = 1;
  const L = { fit: 1, R: 3, y: -.5, s: .7, hx: 0, hy: 0, hs: 1, jy: 0 };
  function measure() {
    vw = stageEl.clientWidth; vh = stageEl.clientHeight; mobile = vw / vh < .85 || vw < 760 || MOBILE;
    camera.aspect = vw / vh;
    camera.position.set(0, mobile ? 1.85 : 2.5, mobile ? 11.2 : 10);
    camera.lookAt(0, mobile ? .05 : 0, 0); camera.updateProjectionMatrix();
    hh = Math.tan(THREE.MathUtils.degToRad(16)) * (mobile ? 11.2 : 10); hw = hh * camera.aspect;
    renderer.setSize(vw, vh, false);
    const pr = renderer.getPixelRatio();
    if (USE_POST) { rt.setSize(Math.round(vw * pr), Math.round(vh * pr)); post.material.uniforms.px.value = 3 * pr; }
    L.fit = Math.min(1, (hw * 2 * (mobile ? .48 : .3)) / 2.8, (hh * 2 * (mobile ? .34 : .52)) / 3);
    L.R = mobile ? Math.min(1.85, hw * 1.02) : Math.min(3.5, hw * .7);
    /* Pantallas un poco más arriba y pequeñas para no chocar con la placa */
    L.s = mobile ? Math.min(.34, hw * .32 / 1.1) : Math.min(.62, hw * .175);
    L.y = mobile ? -.62 : -.12; L.jy = mobile ? .18 : 0;
    L.hx = mobile ? hw * .46 : Math.min(2.2, hw * .3); L.hy = mobile ? hh * .46 : 0; L.hs = mobile ? .5 : 1;
    top = wrap.offsetTop; span = Math.max(1, wrap.offsetHeight - vh);
  }
  addEventListener('resize', measure); addEventListener('load', measure);

  /* ---- interfaz ---- */
  const oc = $('#ocount'), pips = $$('#opips li'), plate = $('#oplate');
  const oi = $('#oindex'), on = $('#oname'), ot = $('#otags'), oy = $('#oyear'), og = $('#ogo');
  let active = -1;
  function setActive(k) {
    if (k === active) return; active = k; const p = P[k];
    oc.textContent = p.i; pips.forEach((d, i) => d.classList.toggle('is-on', i === k));
    oi.textContent = p.i; on.textContent = p.name; ot.textContent = p.tags; oy.textContent = p.year;
    og.innerHTML = `${p.go} <span class="arr">${p.ext ? '↗' : '→'}</span>`;
    plate.href = p.url;
    if (p.ext) { plate.target = '_blank'; plate.rel = 'noopener noreferrer'; } else { plate.removeAttribute('target'); plate.removeAttribute('rel'); }
    plate.setAttribute('aria-label', `${p.go}: ${p.name}`);
    plate.classList.remove('is-swap'); void plate.offsetWidth; plate.classList.add('is-swap');
  }
  const ringAngle = p => { const q = clamp((p - .3) / .64) * (N - 1); const k = Math.min(N - 2, Math.floor(q)), f = q - k; return STEP * (q >= N - 1 ? N - 1 : k + smooth(.22, .78, f)); };
  const turning = p => { const q = clamp((p - .3) / .64) * (N - 1); const f = q - Math.floor(q); return q >= N - 1 ? 0 : Math.sin(Math.PI * smooth(.22, .78, f)); };

  /* ---- ratón y clic ---- */
  let mx = 0, my = 0, smx = 0, smy = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = e => {
    if (+orbitUI.style.opacity < .5 || !items.length) return null;
    const r = stageEl.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(items.map(it => it.screen), false)[0];
    return hit ? hit.object.userData.i : null;
  };
  if (!COARSE) {
    addEventListener('pointermove', e => {
      mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1;
      stageEl.classList.toggle('is-pick', pick(e) !== null);
    }, { passive: true });
  }
  stageEl.addEventListener('click', e => {
    if (e.target.closest('a,button')) return;
    const i = pick(e); if (i === null) return;
    const p = P[i]; if (p.ext) window.open(p.url, '_blank', 'noopener'); else location.href = p.url;
  });

  /* ---- bucle ---- */
  let T = 0, sy = scrollY, last = performance.now(), visible = true, acc = 0;
  const FRAME_MS = MOBILE ? 33 : 0; // ~30 fps en móvil
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stageEl);
  function frame(now) {
    requestAnimationFrame(frame);
    const rawDt = Math.min(.05, Math.max(0, (now - last) / 1000));
    if (!visible) { last = now; return; }
    if (FRAME_MS) {
      acc += (now - last);
      if (acc < FRAME_MS) { last = now; return; }
      acc %= FRAME_MS;
    }
    const dt = rawDt || FRAME_MS / 1000; last = now;
    T += dt;
    sy = REDUCED || MOBILE ? scrollY : damp(sy, scrollY, 8, dt);
    const p = clamp((sy - top) / span);
    const heroO = 1 - smooth(.02, .1, p);
    heroEl.style.opacity = heroO.toFixed(3);
    heroEl.style.transform = MOBILE ? 'none' : `translateY(${(-50 * (1 - heroO)).toFixed(1)}px)`;
    heroEl.style.visibility = heroO < .01 ? 'hidden' : 'visible';
    heroEl.style.pointerEvents = heroO < .2 ? 'none' : '';
    const uiO = smooth(.2, .28, p);
    orbitUI.style.opacity = uiO.toFixed(3);
    const orbitOn = uiO > .5;
    orbitUI.classList.toggle('is-on', orbitOn);
    document.body.classList.toggle('orbit-open', orbitOn);
    if (!MOBILE) { smx = damp(smx, mx, 3, dt); smy = damp(smy, my, 3, dt); }
    const m = REDUCED || MOBILE ? 0 : 1;
    const toC = 1 - ease(smooth(.03, .2, p));
    J.scale.setScalar(L.fit * lerp(1, L.hs, toC));
    J.position.set(L.hx * toC + smx * .06, lerp(L.jy, L.hy, toC) + Math.sin(T * .8) * .05 * m - smy * .05, 0);
    J.rotation.set(Math.sin(T * .37) * .07 * m + smy * .22, Math.sin(T * .5) * .3 * m + smx * .5, Math.sin(T * .3) * .03 * m);
    const glint = MOBILE ? 0 : Math.exp(-Math.pow(((T % 4.5) - .6) / .22, 2));
    star.scale.setScalar(.55 * (.82 + .14 * Math.sin(T * 2.3) * m + glint * .6)); star.material.rotation = T * .25 * m;
    glow.material.opacity = .22 + glint * .45; streak.material.opacity = .4 + glint * .55; streak.scale.set(4.6 + glint * 1.8, .1 + glint * .05, 1);
    if (!MOBILE) scene.environmentRotation.set(0, T * .12 + smx * .4, 0);
    if (items.length) {
      const A = ringAngle(p) - STEP * 1.5 * (1 - ease(smooth(.07, .3, p))) + smx * .06;
      let best = 0, bz = -1e9;
      items.forEach((it, i) => {
        const e = ease(smooth(.07 + i * .028, .2 + i * .028, p));
        const th = i * STEP - A, rx = Math.sin(th) * L.R, rz = Math.cos(th) * L.R;
        const sx = it.side * (hw * 1.7 + 2.5);
        const bob = MOBILE ? 0 : Math.sin(T * .9 + i) * .03;
        it.g.position.set(lerp(sx, rx, e), lerp(L.y + .4, L.y, e) + bob, lerp(2.2, rz, e));
        it.g.rotation.set(0, lerp(-it.side * 1.1, Math.sin(th) * (MOBILE ? .35 : .55), e), 0);
        const d = (Math.cos(th) + 1) / 2, front = smooth(.86, 1, d) * smooth(.25, .3, p);
        // En móvil solo se ven las pantallas cercanas al frente (menos overdraw)
        it.g.visible = e > .001 && (!MOBILE || d > .22);
        it.g.scale.setScalar(L.s * (1 + .1 * front));
        it.mat.uniforms.dark.value = lerp(1, lerp(.08, 1, d * d), e);
        it.mat.uniforms.blur.value = MOBILE ? e * (1 - smooth(.7, 1, d)) : e * (1 - smooth(.55, .95, d));
        it.mat.uniforms.lit.value = d;
        it.cm.envMapIntensity = lerp(.2, MOBILE ? 1.1 : 1.5, d * d); it.cm.color.setScalar(lerp(.4, 1, d));
        if (rz > bz) { bz = rz; best = i; }
      });
      if (p > .2) setActive(best);
    }
    if (USE_POST) {
      const amt = Math.max(Math.sin(Math.PI * smooth(.08, .27, p)) * .95, turning(p) * .42, smooth(.965, 1, p) * .9);
      post.material.uniforms.amt.value = amt;
      if (amt > .01) {
        renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera);
        renderer.setRenderTarget(null); renderer.clear(); renderer.render(postScene, postCam);
        return;
      }
    }
    renderer.setRenderTarget(null); renderer.render(scene, camera);
  }
  measure();
  requestAnimationFrame(frame);
}

function fallback() {
  const img = document.createElement('img'); img.src = './assets/j06-cromo.svg'; img.alt = '';
  Object.assign(img.style, { position: 'absolute', left: '50%', top: '46%', width: 'min(44vh,70vw)', transform: 'translate(-50%,-50%)', zIndex: 1, filter: 'grayscale(.4) contrast(1.1)' });
  stageEl.appendChild(img); window.__ready = Promise.resolve();
}

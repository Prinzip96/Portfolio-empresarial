/*
  Sección de IA.
  Cuatro escenas en el mismo canvas: ruido → imagen → vídeo → campaña.
  El scroll las mezcla. Es literalmente el flujo: de no tener nada
  a tener piezas que se pueden anunciarse.
*/

const section = document.getElementById("ia");
const canvas = document.getElementById("iaCanvas");
if (section && canvas) start(section, canvas);

function start(section, canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const slides = Array.from(document.querySelectorAll("#iaSlides .ia-slide"));
  const pips = Array.from(document.querySelectorAll("#iaPips li"));
  const indexEl = document.getElementById("iaIndex");

  const PIXEL = 5;
  const BAYER = [
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ];
  const ON = [188, 255, 77];
  const DIM = [70, 106, 32];

  let w = 0;
  let h = 0;
  let image = null;

  const resize = () => {
    w = Math.max(8, Math.round((canvas.clientWidth || 1) / PIXEL));
    h = Math.max(8, Math.round((canvas.clientHeight || 1) / PIXEL));
    canvas.width = w;
    canvas.height = h;
    image = ctx.createImageData(w, h);
  };

  resize();
  new ResizeObserver(resize).observe(canvas);

  let mx = 0;
  let my = 0;
  let tmx = 0;
  let tmy = 0;

  canvas.addEventListener(
    "pointermove",
    (e) => {
      const rect = canvas.getBoundingClientRect();
      tmx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      tmy = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    },
    { passive: true }
  );
  canvas.addEventListener(
    "pointerleave",
    () => {
      tmx = 0;
      tmy = 0;
    },
    { passive: true }
  );

  const sdfBox = (px, py, cx, cy, hw, hh) => {
    const dx = Math.abs(px - cx) - hw;
    const dy = Math.abs(py - cy) - hh;
    const ox = Math.max(dx, 0);
    const oy = Math.max(dy, 0);
    return Math.min(Math.max(dx, dy), 0) + Math.hypot(ox, oy);
  };

  /* 01 Ruido: un campo que se agita pero ya tiene centro */
  const ruido = (nx, ny, t) => {
    const d = Math.hypot(nx, ny);
    const a = Math.sin(nx * 5.4 + ny * 3.1 + t * 1.4);
    const b = Math.sin(nx * 2.1 - ny * 4.6 - t * 0.8);
    const c = Math.sin((nx + ny) * 7.2 + t * 2.1);
    let v = (a * 0.45 + b * 0.35 + c * 0.2) * 0.5 + 0.42;
    v *= Math.max(0, 1 - d * 0.48);
    return v > 0.28 ? v : -v * 0.55;
  };

  /* 02 Imagen: la bola dithered, la misma familia que Sobre mí */
  const imagen = (nx, ny, t) => {
    const radius = 0.72;
    const dx = nx / radius;
    const dy = ny / radius;
    const r2 = dx * dx + dy * dy;

    if (r2 > 1) {
      const d = Math.sqrt(r2);
      return -((Math.sin(d * 4.2 - t * 1.1) * 0.5 + 0.5) * 0.28) / (1 + (d - 1) * 1.6);
    }

    const dz = Math.sqrt(1 - r2);
    const lx = -0.4 + mx * 0.45;
    const ly = -0.5 + my * 0.4;
    const lz = 0.74;
    const light = (dx * lx + dy * ly + dz * lz) / Math.hypot(lx, ly, lz);
    const lon = Math.atan2(dz, dx) + t * 0.5;
    const bands = Math.sin(lon * 3.2 + Math.sin(dy * 5 + t * 0.8) * 1.4) * 0.5 + 0.5;
    const rim = Math.pow(1 - dz, 2.2);
    return light * 0.7 + bands * 0.24 + rim * 0.32;
  };

  /* 03 Vídeo: recuadro 16:9, scanlines y una barra de tiempo */
  const video = (nx, ny, t) => {
    const frame = sdfBox(nx, ny, 0, -0.04, 0.92, 0.54);
    if (frame > 0.05) return ruido(nx, ny, t) * 0.12;
    if (frame > 0) return 1;

    const inner = imagen(nx * 0.95, ny * 1.2 + 0.04, t * 1.35);
    /* Scanlines finas, como un monitor, no persianas */
    const scan = Math.sin((ny + t * 0.55) * 18);
    if (scan > 0.93) return 0.2;

    /* Barra de progreso abajo, como un reproductor */
    if (ny > 0.42 && ny < 0.5) {
      const u = (nx + 0.9) / 1.8;
      const playhead = (t * 0.12) % 1;
      return u < playhead ? 1 : -0.2;
    }

    return inner;
  };

  /* 04 Campaña: seis piezas distintas, como creatividades en test */
  const campana = (nx, ny, t) => {
    const cols = 3;
    const rows = 2;
    const cw = 0.5;
    const ch = 0.4;
    const gap = 0.07;
    const totalW = cols * cw + (cols - 1) * gap;
    const totalH = rows * ch + (rows - 1) * gap;
    const x0 = -totalW / 2;
    const y0 = -totalH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x0 + c * (cw + gap) + cw / 2;
        const cy = y0 + r * (ch + gap) + ch / 2;
        const d = sdfBox(nx, ny, cx, cy, cw / 2 - 0.02, ch / 2 - 0.02);
        if (d < 0) {
          const u = (nx - cx) / (cw / 2);
          const v = (ny - cy) / (ch / 2);
          return imagen(u, v, t + c * 0.9 + r * 1.3) * 0.92;
        }
        if (d < 0.035) return 0.55;
      }
    }
    return -0.04;
  };

  const SCENES = [ruido, imagen, video, campana];

  let p = 0;
  let shown = -1;

  const measure = () => {
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) {
      p = 1;
      return;
    }
    p = Math.min(1, Math.max(0, -rect.top / travel));
  };

  const paintUi = () => {
    const active = Math.min(3, Math.floor(p * 3.999));
    if (active === shown) return;
    shown = active;
    slides.forEach((el, i) => el.classList.toggle("is-on", i === active));
    pips.forEach((el, i) => el.classList.toggle("is-on", i === active));
    if (indexEl) {
      indexEl.textContent = String(active + 1).padStart(2, "0") + " / 04";
    }
  };

  const sample = (nx, ny, t) => {
    const scaled = p * 3;
    const i0 = Math.min(3, Math.floor(scaled));
    const i1 = Math.min(3, i0 + 1);
    let k = scaled - i0;
    k = k * k * (3 - 2 * k);
    const a = SCENES[i0](nx, ny, t);
    if (k < 0.001) return a;
    const b = SCENES[i1](nx, ny, t);
    return a * (1 - k) + b * k;
  };

  const draw = (t) => {
    if (!image) return;
    const data = image.data;
    const half = Math.min(w, h) / 2;
    const cx = w / 2 + mx * w * 0.04;
    const cy = h / 2 + my * h * 0.04;

    for (let y = 0; y < h; y++) {
      const ny = (y - cy) / half;
      for (let x = 0; x < w; x++) {
        const nx = (x - cx) / half;
        const i = (y * w + x) * 4;
        const bayer = (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
        const v = sample(nx, ny, t);

        if (Math.abs(v) > bayer) {
          const c = v > 0 ? ON : DIM;
          data[i] = c[0];
          data[i + 1] = c[1];
          data[i + 2] = c[2];
          data[i + 3] = 255;
        } else {
          data[i + 3] = 0;
        }
      }
    }

    ctx.putImageData(image, 0, 0);
  };

  let visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    ).observe(section);
  }

  measure();
  paintUi();

  if (reduceMotion) {
    p = 1;
    paintUi();
    draw(1.4);
    return;
  }

  draw(0);

  const t0 = performance.now();
  let last = 0;

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (now - last < 42) return;
    last = now;

    mx += (tmx - mx) * 0.08;
    my += (tmy - my) * 0.08;

    measure();
    paintUi();
    draw((now - t0) / 1000);
  };

  requestAnimationFrame(frame);
}

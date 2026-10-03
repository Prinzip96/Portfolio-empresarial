/*
  Piezas con dithering de 1 bit.
  Se dibujan a resolución bajísima y el navegador las escala con píxeles cuadrados,
  así que el pixelado es real, no un filtro por encima.
  Haciendo clic se cambia de figura.
*/

const stage = document.getElementById("ditherStage");
const canvas = document.getElementById("ditherCanvas");
if (stage && canvas) start(stage, canvas);

function start(stage, canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const nameEl = document.getElementById("ditherName");
  const nextEl = document.getElementById("ditherNext");

  /* Lado del píxel en pantalla. Más alto = más gordo y menos trabajo. */
  const PIXEL = mobile ? 8 : 5;

  /* Matriz de Bayer 8x8: el patrón de puntos ordenado de toda la vida */
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

  /* Paleta: verde del sitio en dos intensidades */
  const ON = [188, 255, 77];
  const DIM = [74, 112, 34];

  let w = 0;
  let h = 0;
  let image = null;

  const resize = () => {
    w = Math.max(8, Math.min(140, Math.round((stage.clientWidth || 1) / PIXEL)));
    h = Math.max(8, Math.min(120, Math.round((stage.clientHeight || 1) / PIXEL)));
    canvas.width = w;
    canvas.height = h;
    image = ctx.createImageData(w, h);
  };

  resize();
  new ResizeObserver(resize).observe(stage);

  /* ——— El ratón mueve la luz y el centro ——— */
  let mx = 0;
  let my = 0;
  let tmx = 0;
  let tmy = 0;

  stage.addEventListener(
    "pointermove",
    (e) => {
      const rect = stage.getBoundingClientRect();
      tmx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      tmy = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    },
    { passive: true }
  );

  stage.addEventListener(
    "pointerleave",
    () => {
      tmx = 0;
      tmy = 0;
    },
    { passive: true }
  );

  /*
    Cada figura devuelve un número con signo para un píxel:
    el valor absoluto es el brillo y el signo elige el color
    (positivo = verde fuerte, negativo = verde apagado).
  */
  const bola = (nx, ny, t) => {
    const radius = 0.76;
    const dx = nx / radius;
    const dy = ny / radius;
    const r2 = dx * dx + dy * dy;

    if (r2 > 1) {
      /* Fondo: ondas suaves, salen como una trama de puntos */
      const d = Math.sqrt(r2);
      return -((Math.sin(d * 4.6 - t * 1.25) * 0.5 + 0.5) * 0.34) / (1 + (d - 1) * 1.5);
    }

    const dz = Math.sqrt(1 - r2);

    const lx = -0.42 + mx * 0.5;
    const ly = -0.55 + my * 0.45;
    const lz = 0.72;
    const light = (dx * lx + dy * ly + dz * lz) / Math.hypot(lx, ly, lz);

    /* Textura que gira sobre la superficie */
    const lon = Math.atan2(dz, dx) + t * 0.55;
    const bands = Math.sin(lon * 3.4 + Math.sin(dy * 5.2 + t * 0.9) * 1.6) * 0.5 + 0.5;

    const rim = Math.pow(1 - dz, 2.4);

    return light * 0.72 + bands * 0.26 + rim * 0.34;
  };

  const onda = (nx, ny, t) => {
    /* Una onda de sonido que cruza el panel */
    const crest =
      Math.sin(nx * 4.2 - t * 1.7) * 0.34 +
      Math.sin(nx * 9.1 + t * 1.1) * 0.12 +
      Math.sin(nx * 1.6 - t * 0.6) * 0.16;

    const dist = (ny - crest) * 4.6;
    const line = Math.exp(-dist * dist);

    /* Eco por debajo y por encima, más flojo */
    const echo = Math.exp(-Math.pow((Math.abs(ny - crest) - 0.5) * 3.4, 2)) * 0.5;

    const value = line * 1.15 + echo + (1 - Math.abs(ny)) * 0.14;
    return line > 0.35 ? value : -value * 0.85;
  };

  const tunel = (nx, ny, t) => {
    /* Anillos que vienen de frente: el moiré del dithering hace el resto */
    const d = Math.max(Math.hypot(nx, ny), 0.12);
    const rings = Math.sin(2.4 / d + t * 2.2) * 0.5 + 0.5;
    const vign = Math.max(0, 1 - d * 0.42);
    const value = Math.pow(rings, 1.2) * vign * 1.3;
    return d < 0.72 ? value : -value * 0.9;
  };

  const MOTIFS = [
    { name: "Bola", field: bola },
    { name: "Onda", field: onda },
    { name: "Túnel", field: tunel },
  ];

  let from = 0;
  let to = 0;
  let mix = 1; /* 1 = figura "to" ya del todo */

  const setName = () => {
    if (nameEl) nameEl.textContent = MOTIFS[to].name;
  };
  setName();

  const cycle = () => {
    if (mix < 1) return; /* una transición a la vez */
    from = to;
    to = (to + 1) % MOTIFS.length;
    mix = 0;
    setName();
  };

  stage.addEventListener("click", cycle);
  if (nextEl) {
    nextEl.addEventListener("click", (e) => {
      e.stopPropagation();
      cycle();
    });
  }

  const draw = (t) => {
    const data = image.data;
    const half = Math.min(w, h) / 2;
    const cx = w / 2 + mx * w * 0.07;
    const cy = h / 2 + my * h * 0.07;

    const fieldA = MOTIFS[from].field;
    const fieldB = MOTIFS[to].field;
    const k = mix * mix * (3 - 2 * mix);

    for (let y = 0; y < h; y++) {
      const ny = (y - cy) / half;
      for (let x = 0; x < w; x++) {
        const nx = (x - cx) / half;
        const i = (y * w + x) * 4;
        const bayer = (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;

        let v = fieldB(nx, ny, t);
        if (k < 1) v = fieldA(nx, ny, t) * (1 - k) + v * k;

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
    ).observe(stage);
  }

  if (reduceMotion) {
    draw(1.2);
    return;
  }

  /* Primer fotograma ya, para que nunca se vea el hueco en negro */
  draw(0);

  const t0 = performance.now();
  let last = 0;

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;

    /* En móvil 12 fps; en PC 24. El grano se nota igual. */
    if (now - last < (mobile ? 80 : 42)) return;
    last = now;

    mx += (tmx - mx) * 0.07;
    my += (tmy - my) * 0.07;
    if (mix < 1) mix = Math.min(1, mix + 0.06);

    draw((now - t0) / 1000);
  };

  requestAnimationFrame(frame);
}

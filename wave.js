import * as THREE from "./vendor/three.module.js";
import { snoise } from "./glsl-noise.js";

const stage = document.getElementById("waveStage");
const canvas = document.getElementById("waveCanvas");
if (stage && canvas) {
  /* No monta WebGL hasta que la sección se acerca. En el hero ya hay otro. */
  const boot = () => start(stage, canvas);
  if (!("IntersectionObserver" in window)) {
    boot();
  } else {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        boot();
      },
      { rootMargin: "160px 0px" }
    );
    io.observe(stage);
  }
}

function start(stage, canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  /* Rejilla de barras. Cada una sube y baja con ruido, como un ecualizador. */
  const COLS = mobile ? 28 : 52;
  const ROWS = mobile ? 10 : 16;
  const GAP = 0.6;
  const BAR = 0.34;
  const HALF_W = ((COLS - 1) * GAP) / 2;
  const HALF_D = ((ROWS - 1) * GAP) / 2;
  const MAX_H = 4.4;

  const vertex = /* glsl */ `
    uniform float uTime;
    uniform float uRise;
    uniform vec2 uPointer;
    uniform float uPointerAmt;

    varying vec3 vNormal;
    varying float vHeight;
    varying float vDepth;

    ${snoise}

    void main() {
      vec3 ip = instanceMatrix[3].xyz;

      float slow = snoise(vec3(ip.x * 0.11, ip.z * 0.11, uTime * 0.32));
      float fast = snoise(vec3(ip.x * 0.31 + 11.0, ip.z * 0.27, uTime * 0.62));
      float n = (slow + fast * 0.45) * 0.5 + 0.5;

      // Los bordes se quedan bajos para que el campo tenga forma
      float d = length(vec2(ip.x / ${HALF_W.toFixed(3)}, ip.z / ${HALF_D.toFixed(3)}));
      float shape = 1.0 - smoothstep(0.5, 1.08, d);

      // El ratón levanta las barras de alrededor
      float pd = length(ip.xz - uPointer);
      float poke = exp(-pd * pd * 0.045) * uPointerAmt;

      float h = pow(max(n, 0.0), 1.3) * shape * ${MAX_H.toFixed(2)} + poke * 3.6;
      h = max(h * uRise, 0.04);

      vec3 p = position;
      p.y *= h;

      vec4 world = instanceMatrix * vec4(p, 1.0);
      vec4 mv = modelViewMatrix * world;

      vNormal = normal;
      vHeight = h;
      vDepth = -mv.z;

      gl_Position = projectionMatrix * mv;
    }
  `;

  const fragment = /* glsl */ `
    precision highp float;

    uniform vec3 uAccent;
    uniform vec3 uBack;

    varying vec3 vNormal;
    varying float vHeight;
    varying float vDepth;

    void main() {
      float t = clamp(vHeight / ${MAX_H.toFixed(2)}, 0.0, 1.0);

      vec3 col = mix(vec3(0.07, 0.072, 0.068), uAccent, smoothstep(0.22, 0.98, t));

      float light = clamp(dot(normalize(vNormal), normalize(vec3(0.28, 0.9, 0.42))), 0.0, 1.0);
      col *= 0.4 + 0.6 * light;

      // Las puntas altas brillan un poco más
      col += uAccent * smoothstep(0.72, 1.0, t) * 0.18;

      // Las del fondo se diluyen en el color de la página
      float fade = clamp((vDepth - 7.0) / 20.0, 0.0, 1.0);
      col = mix(col, uBack, fade);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !mobile,
      powerPreference: "low-power",
    });
  } catch (err) {
    stage.remove();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.25));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  camera.position.set(0, 2.8, 13);
  camera.lookAt(0, 1.7, 0);

  const uniforms = {
    uTime: { value: 0 },
    uRise: { value: reduceMotion ? 1 : 0 },
    uPointer: { value: new THREE.Vector2(999, 999) },
    uPointerAmt: { value: 0 },
    uAccent: { value: new THREE.Color(0xbcff4d) },
    uBack: { value: new THREE.Color(0x0a0a0a) },
  };

  /* Caja con la base en y = 0, así al escalar crece hacia arriba */
  const geometry = new THREE.BoxGeometry(BAR, 1, BAR);
  geometry.translate(0, 0.5, 0);

  const bars = new THREE.InstancedMesh(
    geometry,
    new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms }),
    COLS * ROWS
  );

  const m = new THREE.Matrix4();
  let i = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      m.makeTranslation(c * GAP - HALF_W, 0, r * GAP - HALF_D);
      bars.setMatrixAt(i++, m);
    }
  }
  bars.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.rotation.y = -0.16;
  group.add(bars);
  scene.add(group);

  const resize = () => {
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  new ResizeObserver(resize).observe(stage);

  /* ——— El ratón empuja las barras ——— */
  const raycaster = new THREE.Raycaster();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  let pointerAmt = 0;

  stage.addEventListener(
    "pointermove",
    (e) => {
      const rect = stage.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(floor, hit)) {
        group.worldToLocal(hit);
        uniforms.uPointer.value.set(hit.x, hit.z);
        pointerAmt = 1;
      }
    },
    { passive: true }
  );

  stage.addEventListener(
    "pointerleave",
    () => {
      pointerAmt = 0;
    },
    { passive: true }
  );

  /* ——— Entra con el scroll: las barras suben cuando llegas ——— */
  let visible = true;
  let pageHidden = false;
  document.addEventListener("visibilitychange", () => {
    pageHidden = document.hidden;
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    ).observe(stage);
  }

  const progress = () => {
    const rect = stage.getBoundingClientRect();
    const span = window.innerHeight + rect.height;
    const p = (window.innerHeight - rect.top) / span;
    return Math.min(1, Math.max(0, p));
  };

  const clock = new THREE.Clock();

  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible || pageHidden) return;

    const p = progress();

    // Suben según avanzas: planas al llegar, enteras cuando la sección se centra
    const rise = Math.min(1, Math.max(0, (p - 0.06) / 0.4));

    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uRise.value = rise * rise * (3 - 2 * rise);
    uniforms.uPointerAmt.value += (pointerAmt - uniforms.uPointerAmt.value) * 0.08;

    // Un poco de parallax: la cámara baja mientras pasas
    camera.position.y = 3.7 - p * 1.9;
    camera.lookAt(0, 1.7, 0);

    renderer.render(scene, camera);
  };

  if (reduceMotion) {
    uniforms.uTime.value = 2.4;
    renderer.render(scene, camera);
  } else {
    frame();
  }
}

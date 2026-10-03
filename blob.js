import * as THREE from "./vendor/three.module.js";
import { snoise } from "./glsl-noise.js";

const canvas = document.getElementById("blob");
const stage = document.getElementById("hero3d");
if (canvas && stage) start(canvas, stage);

function start(canvas, stage) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  const noise = snoise;

  const vertex = /* glsl */ `
    uniform float uTime;
    uniform float uAmp;
    uniform float uSpike;
    uniform float uScale;
    varying vec3 vView;
    varying float vDisp;

    ${noise}

    void main() {
      float slow = snoise(position * 1.15 + vec3(0.0, uTime * 0.20, uTime * 0.09));
      float fast = snoise(position * 2.9 + vec3(uTime * 0.34, 0.0, uTime * 0.12));
      float disp = (slow * 0.30 + fast * 0.10) * uAmp + fast * uSpike * 0.24;

      vec3 p = position * (1.0 + disp) * uScale;
      vDisp = disp;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vView = mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `;

  const fragment = /* glsl */ `
    precision highp float;
    uniform vec3 uAccent;
    varying vec3 vView;
    varying float vDisp;

    void main() {
      vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
      vec3 eye = normalize(-vView);

      float rim = pow(1.0 - clamp(dot(n, eye), 0.0, 1.0), 3.0);
      float light = clamp(dot(n, normalize(vec3(0.35, 0.78, 0.55))), 0.0, 1.0);

      vec3 base = mix(vec3(0.042, 0.044, 0.046), vec3(0.22, 0.225, 0.21), pow(light, 1.35));
      vec3 col = base + uAccent * rim * 0.75;
      col += uAccent * smoothstep(0.14, 0.38, vDisp) * 0.09;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const wireFragment = /* glsl */ `
    precision highp float;
    uniform vec3 uAccent;
    varying vec3 vView;
    varying float vDisp;

    void main() {
      float fade = smoothstep(0.0, 1.0, 1.0 - clamp(length(vView) / 5.0, 0.0, 1.0));
      gl_FragColor = vec4(uAccent, 0.16 * fade);
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
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 3.4;

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.55 },
    uSpike: { value: 0 },
    uScale: { value: 1 },
    uAccent: { value: new THREE.Color(0xbcff4d) },
  };

  const group = new THREE.Group();
  scene.add(group);

  /* 48 subdivisiones eran ~46.000 caras. Con 16 se ve igual y no fríe el móvil. */
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, mobile ? 6 : 16),
    new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms })
  );
  group.add(body);

  const wireUniforms = { ...uniforms, uScale: { value: 1.075 } };
  let wire = null;
  if (!mobile) {
    wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 8),
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: wireFragment,
        uniforms: wireUniforms,
        wireframe: true,
        transparent: true,
        depthWrite: false,
      })
    );
    group.add(wire);
  }

  const resize = () => {
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  new ResizeObserver(resize).observe(stage);

  /* ——— El objeto sigue al cursor y reacciona al scroll ——— */
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  let spike = 0;
  let spin = 0;
  let lastY = window.scrollY;

  window.addEventListener(
    "pointermove",
    (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;

      const r = canvas.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) / Math.max(r.width, 1);
      spike = Math.max(0, 1 - dist * 1.8) * 0.9;
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerdown",
    () => {
      spike = 1.8;
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      spin += (y - lastY) * 0.0014;
      lastY = y;
    },
    { passive: true }
  );

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

  const clock = new THREE.Clock();

  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible || pageHidden) return;

    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;
    spin *= 0.94;

    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uSpike.value += (spike - uniforms.uSpike.value) * 0.07;
    if (wire) {
      wireUniforms.uTime.value = uniforms.uTime.value;
      wireUniforms.uSpike.value = uniforms.uSpike.value;
    }

    spike *= 0.96;

    group.rotation.y += 0.0016 + spin;
    group.rotation.x += (-py * 0.35 - group.rotation.x) * 0.05;
    group.rotation.z += (px * 0.22 - group.rotation.z) * 0.05;
    group.position.x = px * 0.12;
    group.position.y = -py * 0.1;

    renderer.render(scene, camera);
  };

  if (reduceMotion) {
    uniforms.uTime.value = 1.5;
    if (wire) wireUniforms.uTime.value = 1.5;
    renderer.render(scene, camera);
  } else {
    frame();
  }
}

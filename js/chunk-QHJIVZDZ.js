import{B as O,D as j,F as q,G as V,I as $,h as f,i as w,k as L,l as k,m as E,n as S,p as B,u as D,w as F}from"./chunk-VRQCOFNX.js";var G=`
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;var g=document.getElementById("waveStage"),N=document.getElementById("waveCanvas");if(g&&N){let o=()=>Z(g,N);if(!("IntersectionObserver"in window))o();else{let c=new IntersectionObserver(([a])=>{a.isIntersecting&&(c.disconnect(),o())},{rootMargin:"160px 0px"});c.observe(g)}}function Z(o,c){let a=window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=window.matchMedia("(max-width: 900px)").matches||window.matchMedia("(pointer: coarse)").matches,m=s?28:52,d=s?10:16,v=.6,z=.34,R=(m-1)*v/2,H=(d-1)*v/2,b=4.4,W=`
    uniform float uTime;
    uniform float uRise;
    uniform vec2 uPointer;
    uniform float uPointerAmt;

    varying vec3 vNormal;
    varying float vHeight;
    varying float vDepth;

    ${G}

    void main() {
      vec3 ip = instanceMatrix[3].xyz;

      float slow = snoise(vec3(ip.x * 0.11, ip.z * 0.11, uTime * 0.32));
      float fast = snoise(vec3(ip.x * 0.31 + 11.0, ip.z * 0.27, uTime * 0.62));
      float n = (slow + fast * 0.45) * 0.5 + 0.5;

      // Los bordes se quedan bajos para que el campo tenga forma
      float d = length(vec2(ip.x / ${R.toFixed(3)}, ip.z / ${H.toFixed(3)}));
      float shape = 1.0 - smoothstep(0.5, 1.08, d);

      // El rat\xF3n levanta las barras de alrededor
      float pd = length(ip.xz - uPointer);
      float poke = exp(-pd * pd * 0.045) * uPointerAmt;

      float h = pow(max(n, 0.0), 1.3) * shape * ${b.toFixed(2)} + poke * 3.6;
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
  `,X=`
    precision highp float;

    uniform vec3 uAccent;
    uniform vec3 uBack;

    varying vec3 vNormal;
    varying float vHeight;
    varying float vDepth;

    void main() {
      float t = clamp(vHeight / ${b.toFixed(2)}, 0.0, 1.0);

      vec3 col = mix(vec3(0.07, 0.072, 0.068), uAccent, smoothstep(0.22, 0.98, t));

      float light = clamp(dot(normalize(vNormal), normalize(vec3(0.28, 0.9, 0.42))), 0.0, 1.0);
      col *= 0.4 + 0.6 * light;

      // Las puntas altas brillan un poco m\xE1s
      col += uAccent * smoothstep(0.72, 1.0, t) * 0.18;

      // Las del fondo se diluyen en el color de la p\xE1gina
      float fade = clamp((vDepth - 7.0) / 20.0, 0.0, 1.0);
      col = mix(col, uBack, fade);

      gl_FragColor = vec4(col, 1.0);
    }
  `,r;try{r=new $({canvas:c,alpha:!0,antialias:!s,powerPreference:"low-power"})}catch{o.remove();return}r.setPixelRatio(Math.min(window.devicePixelRatio,s?1:1.25));let p=new S,n=new j(40,1,.1,120);n.position.set(0,2.8,13),n.lookAt(0,1.7,0);let i={uTime:{value:0},uRise:{value:a?1:0},uPointer:{value:new f(999,999)},uPointerAmt:{value:0},uAccent:{value:new E(12386125)},uBack:{value:new E(657930)}},T=new F(z,1,z);T.translate(0,.5,0);let u=new D(T,new O({vertexShader:W,fragmentShader:X,uniforms:i}),m*d),M=new L,U=0;for(let e=0;e<m;e++)for(let t=0;t<d;t++)M.makeTranslation(e*v-R,0,t*v-H),u.setMatrixAt(U++,M);u.instanceMatrix.needsUpdate=!0;let l=new k;l.rotation.y=-.16,l.add(u),p.add(l);let A=()=>{let e=o.clientWidth||1,t=o.clientHeight||1;r.setSize(e,t,!1),n.aspect=e/t,n.updateProjectionMatrix()};A(),new ResizeObserver(A).observe(o);let P=new q,Y=new B(new w(0,1,0),0),x=new w,y=new f,h=0;o.addEventListener("pointermove",e=>{let t=o.getBoundingClientRect();y.x=(e.clientX-t.left)/t.width*2-1,y.y=-((e.clientY-t.top)/t.height)*2+1,P.setFromCamera(y,n),P.ray.intersectPlane(Y,x)&&(l.worldToLocal(x),i.uPointer.value.set(x.x,x.z),h=1)},{passive:!0}),o.addEventListener("pointerleave",()=>{h=0},{passive:!0});let C=!0,_=!1;document.addEventListener("visibilitychange",()=>{_=document.hidden}),"IntersectionObserver"in window&&new IntersectionObserver(([e])=>{C=e.isIntersecting},{threshold:0}).observe(o);let J=()=>{let e=o.getBoundingClientRect(),t=window.innerHeight+e.height,Q=(window.innerHeight-e.top)/t;return Math.min(1,Math.max(0,Q))},K=new V,I=()=>{if(requestAnimationFrame(I),!C||_)return;let e=J(),t=Math.min(1,Math.max(0,(e-.06)/.4));i.uTime.value=K.getElapsedTime(),i.uRise.value=t*t*(3-2*t),i.uPointerAmt.value+=(h-i.uPointerAmt.value)*.08,n.position.y=3.7-e*1.9,n.lookAt(0,1.7,0),r.render(p,n)};a?(i.uTime.value=2.4,r.render(p,n)):I()}

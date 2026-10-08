// Núcleo ligero al inicio; Three.js / escena 3D se cargan bajo demanda.
import './portfolio/ia.js';
import './portfolio/dither.js';

const lazy = (loader) => {
  let p;
  return () => (p || (p = loader()));
};

const loadMezcla = lazy(() => import('./mezcla.js'));
const loadWave = lazy(() => import('./portfolio/wave.js'));

const near = (el, margin = '480px 0px') => {
  if (!el) return;
  if (!('IntersectionObserver' in window)) {
    if (el.id === 'jstageWrap' || el.id === 'stage') loadMezcla();
    else loadWave();
    return;
  }
  const io = new IntersectionObserver(
    ([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      if (el.id === 'jstageWrap' || el.id === 'stage') loadMezcla();
      else loadWave();
    },
    { rootMargin: margin }
  );
  io.observe(el);
};

near(document.getElementById('jstageWrap'), '600px 0px');
near(document.getElementById('waveStage') || document.getElementById('sonido'), '400px 0px');

// Si el hero ya está en vista (casi siempre), arranca la escena pronto
if (document.getElementById('jstageWrap')) {
  const kick = () => loadMezcla();
  if ('requestIdleCallback' in window) requestIdleCallback(kick, { timeout: 1200 });
  else setTimeout(kick, 400);
}

module.exports = `(() => {
  let vt = 0, id = 0, cbs = [];
  const d0 = Date.now();
  window.requestAnimationFrame = cb => { const i = ++id; cbs.push([i, cb]); return i; };
  window.cancelAnimationFrame = i => { cbs = cbs.filter(c => c[0] !== i); };
  performance.now = () => vt;
  Date.now = () => d0 + vt;
  const seen = new WeakMap();
  window.__tick = ms => {
    vt += ms;
    const run = cbs; cbs = [];
    for (const [, cb] of run) { try { cb(vt); } catch (e) { console.error(e); } }
    for (const a of document.getAnimations()) {
      try { if (!seen.has(a)) { seen.set(a, vt - (a.currentTime || 0)); a.pause(); } a.currentTime = vt - seen.get(a); } catch (e) {}
    }
  };
})();`;

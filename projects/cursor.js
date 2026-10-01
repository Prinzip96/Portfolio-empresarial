(() => {
  const cursor = document.getElementById("cursor");
  const fine = window.matchMedia("(pointer: fine)").matches;
  const wide = window.matchMedia("(min-width: 901px)").matches;
  if (!cursor || !fine || !wide) return;

  document.body.classList.add("has-cursor");

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let cx = tx;
  let cy = ty;
  let raf = 0;

  const loop = () => {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    raf = requestAnimationFrame(loop);
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add("is-visible");
      if (!raf) raf = requestAnimationFrame(loop);
    },
    { passive: true }
  );

  document.addEventListener("pointerover", (e) => {
    cursor.classList.toggle("is-hover", Boolean(e.target.closest("a, button")));
  });

  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
})();

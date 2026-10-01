(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const wide = window.matchMedia("(min-width: 901px)").matches;

  /* ——— Single scroll loop ——— */
  const scrollTasks = [];
  let scrollQueued = false;

  const onScrollFrame = () => {
    scrollQueued = false;
    scrollTasks.forEach((fn) => fn());
  };

  window.addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(onScrollFrame);
    },
    { passive: true }
  );

  window.addEventListener("resize", onScrollFrame, { passive: true });

  /* ——— Nav + scroll progress ——— */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");

  scrollTasks.push(() => {
    const y = window.scrollY;
    nav?.classList.toggle("is-stuck", y > 40);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
  });

  document.getElementById("scrollBtn")?.addEventListener("click", () => {
    document.getElementById("trabajos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ——— Scroll reveals ——— */
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  if (reveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
      );
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* ——— Hero: palabra que rota ——— */
  const rotator = document.getElementById("rotator");
  if (rotator && !reduceMotion) {
    const words = ["Auténtico", "Preciso", "Curioso", "Audaz", "Directo"];
    let i = 0;

    setInterval(() => {
      i = (i + 1) % words.length;
      rotator.classList.add("is-out");
      setTimeout(() => {
        rotator.textContent = words[i];
        rotator.classList.remove("is-out");
      }, 360);
    }, 3200);
  }

  /* ——— Casos: la web real dentro de una ventana ——— */
  const cases = Array.from(document.querySelectorAll(".case"));

  if (cases.length) {
    cases.forEach((card) => {
      const media = card.querySelector(".case-media");
      const scroll = card.querySelector(".case-scroll");
      const frame = card.querySelector("iframe");
      if (!media || !scroll || !frame) return;

      if (card.dataset.tint) card.style.setProperty("--tint", card.dataset.tint);

      const fit = () => {
        const s = media.clientWidth / 1440;
        scroll.style.setProperty("--s", s);
        return s;
      };

      fit();
      window.addEventListener("resize", fit, { passive: true });

      const load = () => {
        if (frame.dataset.loaded) return;
        frame.dataset.loaded = "1";
        frame.src = card.dataset.src || "";
      };

      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              load();
              io.unobserve(entry.target);
            });
          },
          { rootMargin: "300px 0px" }
        );
        io.observe(card);
      } else {
        load();
      }
    });
  }

  /* ——— Anillo 3D: gira solo, con el scroll y arrastrándolo ——— */
  const drum = document.getElementById("ringDrum");
  const ringStage = document.getElementById("ringStage");

  if (drum && ringStage) {
    const items = [
      "Diseño web",
      "Desarrollo",
      "Interfaces",
      "Landing pages",
      "Tiendas y reservas",
      "Rediseño",
    ];

    const step = 360 / items.length;
    const words = items.map((text, i) => {
      const el = document.createElement("div");
      el.className = "ring-word";
      el.innerHTML = `<span class="n">0${i + 1}</span><span>${text}</span>`;
      drum.appendChild(el);
      return el;
    });

    let radius = 0;

    const layout = () => {
      const h = words[0].offsetHeight || 80;
      radius = h / 2 / Math.tan(Math.PI / items.length);
      words.forEach((el, i) => {
        el.style.transform = `translateY(-50%) rotateX(${i * step}deg) translateZ(${radius}px)`;
      });
    };

    let angle = 0;
    let velocity = 0;
    let dragging = false;
    let lastPointerY = 0;
    let lastScrollY = window.scrollY;

    const paint = () => {
      drum.style.transform = `rotateX(${-angle}deg)`;

      words.forEach((el, i) => {
        const facing = Math.cos(((i * step - angle) * Math.PI) / 180);
        const front = facing > 0.86;
        el.style.opacity = facing > 0 ? (0.14 + facing * 0.86).toFixed(3) : "0";
        el.classList.toggle("is-front", front);
        el.style.color = front ? "" : "var(--muted)";
      });
    };

    layout();
    paint();
    window.addEventListener("resize", () => { layout(); paint(); }, { passive: true });

    scrollTasks.push(() => {
      const y = window.scrollY;
      velocity += (y - lastScrollY) * 0.09;
      lastScrollY = y;
    });

    ringStage.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastPointerY = e.clientY;
      velocity = 0;
      ringStage.classList.add("is-grabbing");
      ringStage.setPointerCapture(e.pointerId);
    });

    ringStage.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dy = e.clientY - lastPointerY;
      lastPointerY = e.clientY;
      angle -= dy * 0.45;
      velocity = -dy * 0.45;
      paint();
    });

    const release = () => {
      dragging = false;
      ringStage.classList.remove("is-grabbing");
    };

    ringStage.addEventListener("pointerup", release);
    ringStage.addEventListener("pointercancel", release);

    if (!reduceMotion) {
      const spin = () => {
        if (!dragging) {
          velocity *= 0.93;
          angle += 0.16 + velocity;
          paint();
        }
        requestAnimationFrame(spin);
      };
      requestAnimationFrame(spin);
    }
  }

  /* ——— Contadores ——— */
  const nums = Array.from(document.querySelectorAll(".stat-num"));
  if (nums.length) {
    const run = (el) => {
      const target = Number(el.dataset.count || 0);
      const suffix = el.dataset.suffix || "";
      if (reduceMotion) {
        el.textContent = `${target}${suffix}`;
        return;
      }
      const started = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const p = Math.min(1, (now - started) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      nums.forEach(run);
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            run(entry.target);
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.5 }
      );
      nums.forEach((el) => io.observe(el));
    }
  }

  /* ——— Acordeones (servicios + preguntas) ——— */
  Array.from(document.querySelectorAll(".acc-list")).forEach((list) => {
    const items = Array.from(list.querySelectorAll(".acc"));

    items.forEach((item) => {
      const head = item.querySelector(".acc-head");
      const panel = item.querySelector(".acc-panel");
      const inner = item.querySelector(".acc-inner");
      if (!head || !panel || !inner) return;

      const close = () => {
        item.classList.remove("is-open");
        head.setAttribute("aria-expanded", "false");
        panel.style.height = "0px";
      };

      const open = () => {
        item.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
        panel.style.height = `${inner.scrollHeight}px`;
      };

      head.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          if (other === item) return;
          other.classList.remove("is-open");
          other.querySelector(".acc-head")?.setAttribute("aria-expanded", "false");
          const p = other.querySelector(".acc-panel");
          if (p) p.style.height = "0px";
        });
        isOpen ? close() : open();
      });

      window.addEventListener(
        "resize",
        () => {
          if (item.classList.contains("is-open")) panel.style.height = `${inner.scrollHeight}px`;
        },
        { passive: true }
      );
    });
  });

  /* ——— Flujo de contacto: preguntas paso a paso ——— */
  const chat = document.getElementById("chat");

  if (chat) {
    const MAIL = "jaimesnchz9966@gmail.com";
    const steps = Array.from(chat.querySelectorAll(".chat-q"));
    const picks = Array.from(chat.querySelectorAll(".pick"));
    const count = document.getElementById("chatCount");
    const bar = document.getElementById("chatBar");
    const prev = document.getElementById("chatPrev");
    const sum = document.getElementById("chatSum");
    const form = document.getElementById("chatForm");
    const who = document.getElementById("chatWho");
    const more = document.getElementById("chatMore");
    const answers = {};
    let step = 0;
    let opener = null;

    const pad = (n) => String(n).padStart(2, "0");

    const show = (i) => {
      step = Math.min(Math.max(i, 0), steps.length - 1);
      steps.forEach((s, n) => s.classList.toggle("is-on", n === step));
      count.textContent = `${pad(step + 1)} / ${pad(steps.length)}`;
      bar.style.width = `${((step + 1) / steps.length) * 100}%`;
      prev.hidden = step === 0;

      if (step === steps.length - 1) {
        sum.innerHTML = `Quieres <b>${answers[1]}</b>, <b>${answers[2]}</b>, y <b>${answers[3]}</b>.`;
        setTimeout(() => who.focus(), 320);
      }
    };

    const open = (trigger) => {
      opener = trigger || null;
      chat.hidden = false;
      document.body.classList.add("chat-open");
      requestAnimationFrame(() => chat.classList.add("is-open"));
      show(0);
    };

    const close = () => {
      chat.classList.remove("is-open");
      document.body.classList.remove("chat-open");
      setTimeout(() => {
        chat.hidden = true;
        opener?.focus();
      }, 420);
    };

    Array.from(document.querySelectorAll("[data-open-chat]")).forEach((btn) => {
      btn.addEventListener("click", () => open(btn));
    });

    Array.from(chat.querySelectorAll("[data-close-chat]")).forEach((btn) => {
      btn.addEventListener("click", close);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !chat.hidden) close();
    });

    prev.addEventListener("click", () => show(step - 1));

    picks.forEach((pick) => {
      pick.addEventListener("click", () => {
        const group = pick.dataset.group;
        answers[group] = pick.dataset.value;

        picks
          .filter((p) => p.dataset.group === group)
          .forEach((p) => p.classList.toggle("is-on", p === pick));

        setTimeout(() => show(step + 1), reduceMotion ? 0 : 260);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = who.value.trim();
      if (!name) {
        who.focus();
        return;
      }

      const body = [
        `Hola Jaime, soy ${name}.`,
        "",
        `Necesito ${answers[1]}.`,
        `La quiero ${answers[2]}.`,
        `Sobre plazos: ${answers[3]}.`,
        more.value.trim() ? `\n${more.value.trim()}` : "",
      ].join("\n");

      window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(
        `Web nueva — ${name}`
      )}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ——— Reloj de Málaga ——— */
  const clocks = Array.from(
    document.querySelectorAll("#clock, [data-clock]")
  );
  if (clocks.length) {
    const tick = () => {
      const now = new Date().toLocaleTimeString("es-ES", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        minute: "2-digit",
      });
      clocks.forEach((el) => {
        el.textContent = now;
      });
    };
    tick();
    setInterval(tick, 20000);
  }

  /* ——— Currículum en PDF: lo genera el propio navegador ——— */
  const resumePdf = document.getElementById("resumePdf");
  if (resumePdf) {
    resumePdf.addEventListener("click", () => window.print());
  }

  /* ——— El raíl del currículum se pinta de verde al bajar ——— */
  const timeline = document.getElementById("timeline");
  if (timeline && !reduceMotion) {
    scrollTasks.push(() => {
      const rect = timeline.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const mark = window.innerHeight * 0.62;
      const p = (mark - rect.top) / rect.height;
      timeline.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
    });
  }

  /* ——— Botones magnéticos ——— */
  if (fine && !reduceMotion) {
    Array.from(document.querySelectorAll(".magnetic")).forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.34;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });

      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "translate(0, 0)";
        setTimeout(() => (el.style.transition = ""), 500);
      });
    });
  }

  /* ——— Cursor personalizado ——— */
  const cursor = document.getElementById("cursor");
  const cursorLabel = document.getElementById("cursorLabel");

  if (cursor && fine && wide) {
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
      const row = e.target.closest(".case");
      const drag = e.target.closest(".ring-stage");
      const interactive = e.target.closest("a, button");

      if (cursorLabel) {
        if (row) cursorLabel.textContent = "Ver";
        else if (drag) cursorLabel.textContent = "Gira";
      }

      cursor.classList.toggle("is-view", Boolean(row || drag));
      cursor.classList.toggle("is-hover", Boolean(interactive) && !row && !drag);
    });

    document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  }
})();

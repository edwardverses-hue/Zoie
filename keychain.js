// Birthday-page keychain, built the way wildyriftian.com builds theirs:
// every piece is its own transparent image on the same square canvas, stacked.
//
// Measured on their live desktop site:
//  - idle: one shared 3.6 s eased sway. The top piece bobs 0..4 px; charms rotate
//    around the ring point (50% across, 40% down) by 3 deg (outer) / 2 deg (middle),
//    left and right sides opposite, with a matching sideways shift.
//  - hover: invisible vertical strips sit over the charms, one per charm, left to
//    right (22.7%..79.3% across, 37.5%..97% down). Hovering a strip swings every
//    charm to its left out to +30 deg and every charm to its right to -30 deg; the
//    hovered charm returns to 0 and hangs on its own. Springy, with overshoot.
//    Leaving the strips lets everything fall back to rest.
// On phones, touching or sliding a finger across the strips does the same.
(() => {
  // Back to front. amp: idle sway degrees. order: left-to-right strip position.
  // PLACEHOLDERS: the padlock and charms 02-05 are wildyriftian.com's own art,
  // standing in until Edward's charms are cut out. Swap each file before sharing.
  const LAYERS = [
    { src: "keychain/05illustration.webp", amp: -3, order: 5 },
    { src: "keychain/04photoworks.webp", amp: -3, order: 4 },
    { src: "keychain/03editorial.webp", amp: 2, order: 3 },
    { src: "keychain/02branding.webp", amp: 3, order: 1 },
    { src: "keychain/06photo.webp", amp: 2, order: 2 },   // the acrylic photo keychain (real)
    { src: "keychain/01suki.webp", amp: 3, order: 0 },    // Suki S2000 Hot Wheels, top-down (real photo of the loose car)
    { src: "keychain/00padlock.webp", top: true },
  ];
  const SWING = 30;          // degrees the other charms move aside
  const PERIOD = 3600, BOB = 4, REF = 461;
  const K = 170, D = 15;     // spring stiffness / damping: settles in ~0.8 s with a small overshoot

  const box = document.getElementById("keychain");
  const els = LAYERS.map((l) => {
    const wrap = document.createElement("div");
    wrap.className = "kc-layer" + (l.top ? " kc-top" : "");
    const img = new Image();
    img.src = l.src; img.alt = ""; img.draggable = false; img.decoding = "async";
    wrap.appendChild(img);
    box.appendChild(wrap);
    return { ...l, el: wrap, a: 0, v: 0 };   // a: spring angle, v: velocity
  });
  const charms = els.filter((l) => !l.top);
  const N = charms.length;

  // the hover strips
  const strips = document.createElement("div");
  strips.className = "kc-strips";
  for (let i = 0; i < N; i++) {
    const s = document.createElement("span");
    s.dataset.i = i;
    strips.appendChild(s);
  }
  box.appendChild(strips);

  let hovered = -1;
  const setHover = (i) => { hovered = i; };
  strips.addEventListener("pointerover", (e) => { if (e.target.dataset.i) setHover(+e.target.dataset.i); });
  strips.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setHover(-1); });
  // touch: follow the finger across the strips, release lets them fall back
  strips.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    try { strips.releasePointerCapture(e.pointerId); } catch (_) {}
    if (e.target.dataset.i) setHover(+e.target.dataset.i);
  });
  strips.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    setHover(t && t.parentElement === strips ? +t.dataset.i : -1);
  });
  const touchEnd = (e) => { if (e.pointerType !== "mouse") setHover(-1); };
  strips.addEventListener("pointerup", touchEnd);
  strips.addEventListener("pointercancel", touchEnd);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  let last = t0;
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = reduce ? 0 : (1 - Math.cos(((now - t0) / PERIOD) * Math.PI * 2)) / 2;
    const k = box.offsetWidth / REF;
    const y = p * BOB * k;
    for (const l of els) {
      if (l.top) { l.el.style.transform = `translateY(${y}px)`; continue; }
      const target = hovered < 0 || l.order === hovered ? 0 : l.order < hovered ? SWING : -SWING;
      if (reduce) { l.a = target; l.v = 0; }
      else { l.v += (K * (target - l.a) - D * l.v) * dt; l.a += l.v * dt; }
      const r = p * l.amp;
      l.el.style.transform = `translateX(${-r * k}px) translateY(${y}px) rotate(${r + l.a}deg)`;
    }
    requestAnimationFrame(loop);
  })(t0);

  window.Keychain = {
    grab: () => false, move() {}, release() {}, swing() {},
    reset() { setHover(-1); },
    hits(x, y) { const r = strips.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; },
  };
})();

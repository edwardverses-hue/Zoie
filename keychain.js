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
    // padlock first = behind everything (as on wildyriftian.com): the split rings cross over
    // its ring, so they read as threaded through it
    { src: "keychain/00padlock.webp", top: true },
    { src: "keychain/05illustration.webp", amp: -3, order: 6, hov: 0 },    // reference slot L1 (star)
    { src: "keychain/02branding.webp", amp: 3, order: 2, hov: -7 },       // reference slot L4
    { src: "keychain/06photo.webp", amp: 3, order: 3, hov: -4 },   // the acrylic photo keychain (real); takes reference slot L5 (motion)
    { src: "keychain/03gwen.webp", amp: 2, order: 4, hov: 9 },    // takes reference slot L3 (editorial); LEGO Ghost-Spider (Spider-Gwen) key chain 854292 (LEGO product photo)
    { src: "keychain/04kodak.webp", amp: -3, order: 5, hov: 9 },         // Hirono x Kodak Click Bear plush pendant (Pop Mart photo); reference slot L2
    { src: "keychain/01suki.webp", amp: 3, order: 1, hov: 0 },    // extra slot (no reference value: plain idle); Suki S2000 Hot Wheels, top-down (real photo of the loose car)
    { src: "keychain/07daffodil.webp", amp: -2, order: 0, hov: -5 },          // Jellycat Bartholomew Bear 'Daffodil' (product photo), on the split ring by its flower bonnet; leftmost, hangs over the car
  ];
  const BOX = {"00padlock.webp": [42.333, 1.917, 16.0, 36.5], "01suki.webp": [31.083, 33.917, 20.667, 41.167], "02branding.webp": [34.083, 34.25, 23.75, 58.333], "03gwen.webp": [51.667, 33.833, 30.833, 61.083], "04kodak.webp": [49.583, 32.083, 20.75, 38.0], "05illustration.webp": [47.917, 33.75, 31.833, 37.917], "06photo.webp": [34.083, 34.167, 30.417, 53.667], "07daffodil.webp": [23.667, 33.833, 27.667, 30.75]};
  // Motion measured from wildyriftian.com (headless Chrome, 1440x900, every frame):
  //  idle  - one shared cosine phase p (period 3.52 s): padlock moves down 4px*p; each
  //          charm moves down 4px*p, sideways -amp*p px and rotates amp*p deg (px at a 720px box)
  //  hover - the other charms spring to +/-30 deg (idle rotation keeps running on top,
  //          their idle drift goes to 0); the hovered charm keeps its idle sway and springs
  //          to its own small angle (hov). Spring fitted to the recorded curves.
  const SWING = 30;
  const PERIOD = 3520, BOB = 4, REF = 720;
  const K = 95, D = 13.5;

  const box = document.getElementById("keychain");
  const els = LAYERS.map((l) => {
    const wrap = document.createElement("div");
    wrap.className = "kc-layer" + (l.top ? " kc-top" : "");
    // each layer image is cropped to its charm; place it back where it sits on the
    // shared square and keep the pivot on the ring point (50% / 40% of the square)
    const [bl, bt, bw, bh] = BOX[l.src.split("/").pop()];
    Object.assign(wrap.style, {
      left: bl + "%", top: bt + "%", width: bw + "%", height: bh + "%",
      transformOrigin: `${((50 - bl) / bw) * 100}% ${((40 - bt) / bh) * 100}%`,
    });
    const img = new Image();
    img.src = l.src; img.alt = ""; img.draggable = false; img.decoding = "async";
    wrap.appendChild(img);
    box.appendChild(wrap);
    return { ...l, el: wrap, a: 0, v: 0, w: 1, wv: 0 };   // a: spring angle; w: idle-drift weight
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
  // touch: a tap picks a charm and it stays picked (tap it again, or anywhere else, to let
  // go); sliding a finger across the strips moves the pick along with it
  let touchStartI = -1, wasPicked = -1;
  strips.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    try { strips.releasePointerCapture(e.pointerId); } catch (_) {}
    wasPicked = hovered;
    touchStartI = e.target.dataset.i ? +e.target.dataset.i : -1;
    if (touchStartI >= 0) setHover(touchStartI);
  });
  strips.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || touchStartI < 0) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (t && t.parentElement === strips) setHover(+t.dataset.i);
  });
  strips.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse") return;
    if (touchStartI >= 0 && touchStartI === hovered && wasPicked === touchStartI) setHover(-1);   // tapped the picked one again
    touchStartI = -1;
  });
  addEventListener("pointerdown", (e) => {   // tap anywhere off the keychain lets go
    if (e.pointerType !== "mouse" && !strips.contains(e.target)) setHover(-1);
  }, true);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  let last = t0;
  (function loop(now) {
    if (!document.body.classList.contains("birthday")) { last = now; requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = reduce ? 0 : (1 - Math.cos(((now - t0) / PERIOD) * Math.PI * 2)) / 2;
    const k = box.offsetWidth / REF;
    const y = p * BOB * k;
    for (const l of els) {
      if (l.top) { l.el.style.transform = `translateY(${y}px)`; continue; }
      const mine = hovered < 0 || l.order === hovered;
      const target = hovered < 0 ? 0 : l.order === hovered ? l.hov : l.order < hovered ? SWING : -SWING;
      const wt = mine ? 1 : 0;
      if (reduce) { l.a = target; l.v = 0; l.w = wt; l.wv = 0; }
      else {
        l.v += (K * (target - l.a) - D * l.v) * dt; l.a += l.v * dt;
        l.wv += (K * (wt - l.w) - D * l.wv) * dt; l.w += l.wv * dt;
      }
      const r = p * l.amp;
      l.el.style.transform = `translateX(${-r * k * l.w}px) translateY(${y * l.w}px) rotate(${r + l.a}deg)`;
    }
    requestAnimationFrame(loop);
  })(t0);

  window.Keychain = {
    grab: () => false, move() {}, release() {}, swing() {},
    reset() { setHover(-1); },
    hits(x, y) { const r = strips.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; },
  };
})();

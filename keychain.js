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
  // The padlock is still wildyriftian.com's art; the charms are Edward's.
  const LAYERS = [
    // padlock first = behind everything (as on wildyriftian.com): the split rings cross over
    // its ring, so they read as threaded through it
    { src: "keychain/00padlock.webp", top: true },
    { src: "keychain/04livingwild.webp", amp: -3, order: 3 },         // Hirono Living Wild - Fight for Joy plush (Pop Mart photo), much bigger, at the back; reference slot L2
    { src: "keychain/06photo.webp", amp: 3, order: 1 },   // the acrylic photo keychain (real); takes reference slot L5 (motion)
    { src: "keychain/03gwen.webp", amp: 2, order: 2 },    // takes reference slot L3 (editorial); LEGO Ghost-Spider (Spider-Gwen) key chain 854292 (LEGO product photo)
    { src: "keychain/01suki.webp", amp: 3, order: 0 },    // extra slot (no reference value: plain idle); Suki S2000 Hot Wheels, top-down (real photo of the loose car)
  ];
  const BOX = {"00padlock.webp": [42.333, 1.917, 16.0, 36.5], "01suki.webp": [31.083, 33.917, 20.667, 41.167], "03gwen.webp": [51.667, 33.833, 30.833, 61.083], "04livingwild.webp": [51.25, 32.417, 31.25, 51.0], "06photo.webp": [34.083, 34.167, 30.417, 53.667]};
  // Motion measured from wildyriftian.com (headless Chrome, 1440x900, every frame):
  //  idle  - one shared cosine phase p (period 3.52 s): padlock moves down 4px*p; each
  //          charm moves down 4px*p, sideways -amp*p px and rotates amp*p deg (px at a 720px box)
  //  hover - the other charms spring to +/-30 deg (idle rotation keeps running on top,
  //          their idle drift goes to 0); the hovered charm keeps its idle sway and springs
  //          to its own small angle (hov). Spring fitted to the recorded curves.
  // Hover poses, computed by tools/keychain/fan.py from each charm's opaque pixels around
  // the ring point (angles: left-to-right order suki -24, photo -3, gwen +28, living wild +37).
  // POSE[h][i] = rotation (deg, clockwise) of charm order i while charm h is hovered:
  // the hovered charm comes to the front; a middle one swings 60% of the way to hanging plumb,
  // an end one swings 8 deg outward (pulled out to its side, making room); every
  // other charm swings out away from it, far enough to clear its body by 8 deg where that
  // stays under 40 deg (a keyring doesn't fling charms sideways), and a charm farther out
  // always swings at least as far as the one inside it, so none ever crosses another.
  const POSE = [
    [  8.0, -37.3, -44.3, -51.3],
    [ 40.0,  -1.9, -34.3, -44.2],
    [ 47.0,  40.0,  16.9, -23.0],
    [ 45.8,  38.8,  31.8,  -8.0],
  ];
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

  // Hover area over the charms. Which charm is "hovered" is decided by its actual pixels
  // in the rest pose (front-most opaque charm under the pointer), not by vertical slices:
  // gwen and living wild hang over the same columns. Rest pose, so a charm swinging away
  // never changes the pick under a still pointer. Near the ring point every chain meets,
  // so the pick holds there instead of flickering.
  const strips = document.createElement("div");
  strips.className = "kc-strips";
  box.appendChild(strips);
  const MW = 96;   // hit mask width per charm
  const masks = charms.map((l) => {
    const m = { l, ok: false };
    const img = l.el.firstChild;
    const build = () => {
      const h = Math.round(MW * img.naturalHeight / img.naturalWidth);
      const c = document.createElement("canvas"); c.width = MW; c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, MW, h);
      m.d = g.getImageData(0, 0, MW, h).data; m.h = h; m.ok = true;
    };
    img.complete && img.naturalWidth ? build() : img.addEventListener("load", build, { once: true });
    return m;
  });
  const front = masks.slice().reverse();   // later layers paint on top
  const pick = (cx, cy) => {               // -> charm order, -1 = none, null = ring zone (keep)
    const r = box.getBoundingClientRect();
    const x = ((cx - r.left) / r.width) * 100, y = ((cy - r.top) / r.height) * 100;
    if (Math.hypot(x - 50, y - 40) < 14) return null;
    for (const m of front) {
      if (!m.ok) continue;
      const [bl, bt, bw, bh] = BOX[m.l.src.split("/").pop()];
      const u = (x - bl) / bw, v = (y - bt) / bh;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      if (m.d[(Math.floor(v * m.h) * MW + Math.floor(u * MW)) * 4 + 3] > 40) return m.l.order;
    }
    return -1;
  };

  let hovered = -1;
  const setHover = (i) => { if (i !== null) hovered = i; };
  strips.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") { setHover(pick(e.clientX, e.clientY)); strips.style.cursor = hovered >= 0 ? "pointer" : ""; }
  });
  strips.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setHover(-1); });
  // touch: a tap picks a charm and it stays picked (tap it again, or anywhere else, to let
  // go); sliding a finger across the charms moves the pick along with it
  let touching = false, touchStartI = -1, wasPicked = -1;
  strips.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    try { strips.releasePointerCapture(e.pointerId); } catch (_) {}
    wasPicked = hovered; touching = true;
    touchStartI = pick(e.clientX, e.clientY);
    if (touchStartI !== null && touchStartI >= 0) setHover(touchStartI);
  });
  strips.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || !touching) return;
    const i = pick(e.clientX, e.clientY);
    if (i !== null && i >= 0) setHover(i);
  });
  strips.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse") return;
    if (touchStartI === null || touchStartI < 0) setHover(-1);                                   // tapped empty space
    else if (touchStartI === hovered && wasPicked === touchStartI) setHover(-1);               // tapped the picked one again
    touching = false; touchStartI = -1;
  });
  addEventListener("pointerdown", (e) => {   // tap anywhere off the keychain lets go
    if (e.pointerType !== "mouse" && !strips.contains(e.target)) setHover(-1);
  }, true);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  let last = t0, raised = -1;
  (function loop(now) {
    if (!document.body.classList.contains("birthday")) { last = now; requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = reduce ? 0 : (1 - Math.cos(((now - t0) / PERIOD) * Math.PI * 2)) / 2;
    const k = box.offsetWidth / REF;
    const y = p * BOB * k;
    // the hovered charm is drawn in front; once everything has settled back, the stacking
    // returns to the rest order (so nothing pops forward/back mid-swing)
    if (hovered >= 0) raised = hovered;
    else if (raised >= 0 && charms.every((c) => Math.abs(c.a) < 2)) raised = -1;
    for (const l of els) {
      if (!l.top) l.el.style.zIndex = l.order === raised ? 5 : "";
      if (l.top) { l.el.style.transform = `translateY(${y}px)`; continue; }
      const mine = hovered < 0 || l.order === hovered;
      const target = hovered < 0 ? 0 : POSE[hovered][l.order];
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
    reset() { hovered = -1; },
    pick,
    hits(x, y) { const r = strips.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; },
  };
})();

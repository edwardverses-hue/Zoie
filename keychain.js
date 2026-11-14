// Birthday-page keychain, built the way wildyriftian.com builds theirs:
// every piece is its own transparent image on the same square canvas, already
// placed where it hangs, and the layers are stacked on top of each other.
//
// Motion (measured on their live site):
//   - one shared loop, 3.6 s, smooth ease in/out (0 -> 1 -> 0)
//   - the top piece (their padlock, our split ring) only bobs down 0..4 px
//   - each charm rotates around the ring point (50% across, 40% down the square),
//     fanning open and closed together: outer charms 3 deg, middle charms 2 deg,
//     left and right sides in opposite directions, with a matching sideways shift
//   - no hover, drag or click: pointer events are off on every layer
// All px values are at their 461 px display size and scale with ours.
(() => {
  // EDIT: add a line per charm once its image is cut out (same 1200x1200 square).
  // amp: degrees at the top of the swing. Positive swings one way, negative the other.
  // Back to front. amp: degrees at the top of the swing (their values: outer charms
  // 3, middle 2; left side positive, right side negative).
  // PLACEHOLDERS: 01-05 and the padlock are wildyriftian.com's own art, standing in
  // until Edward's charms are cut out. Swap each file for the real one before sharing.
  const LAYERS = [
    { src: "keychain/05illustration.webp", amp: -3 },
    { src: "keychain/04photoworks.webp", amp: -3 },
    { src: "keychain/03editorial.webp", amp: 2 },
    { src: "keychain/02branding.webp", amp: 3 },
    { src: "keychain/01motion.webp", amp: 3 },
    { src: "keychain/06photo.webp", amp: 2 },        // the acrylic photo keychain (real)
    { src: "keychain/00padlock.webp", top: true },
  ];

  const PERIOD = 3600;        // ms
  const BOB = 4;              // px at 461 px size
  const REF = 461;

  const box = document.getElementById("keychain");
  const els = LAYERS.map((l) => {
    const wrap = document.createElement("div");
    wrap.className = "kc-layer" + (l.top ? " kc-top" : "");
    const img = new Image();
    img.src = l.src; img.alt = ""; img.draggable = false; img.decoding = "async";
    wrap.appendChild(img);
    box.appendChild(wrap);
    return { ...l, el: wrap };
  });

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  (function loop(now) {
    // 0 -> 1 -> 0 with a cosine ease, same shape as their curve
    const p = reduce ? 0 : (1 - Math.cos(((now - t0) / PERIOD) * Math.PI * 2)) / 2;
    const k = box.offsetWidth / REF;          // scale px values to our size
    const y = p * BOB * k;
    for (const l of els) {
      if (l.top) { l.el.style.transform = `translateY(${y}px)`; continue; }
      const r = p * l.amp;                    // degrees
      // their sideways shift equals the rotation number in px (x = -rotate)
      l.el.style.transform = `translateX(${-r * k}px) translateY(${y}px) rotate(${r}deg)`;
    }
    requestAnimationFrame(loop);
  })(t0);

  // Nothing on this keychain is grabbable (matches the reference).
  window.Keychain = { grab: () => false, move() {}, release() {}, swing() {}, hits: () => false };
})();

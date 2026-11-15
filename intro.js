// Opening sequence, timed from hakusuku.jp/recruit's opening film (kv_pc.mp4):
//  1. a small stack of 3 photos in the centre flicks fast (~67 ms) while growing,
//  2. slows down (holds ~0.2 / 0.33 / 0.47 / 0.67 s),
//  3. flicks fast again while shrinking to tiny,
//  4. hard cut: the gallery bursts out from the centre into place (~0.25 s),
//  5. the headline types in one character at a time on white strips and stays.
// Only runs when the page opens on the gallery. Tap/drag/key skips to the end.
(() => {
  // EDIT: the headline lines.
  const HEADLINE = ["happy birthday,", "zoie."];

  const body = document.body;
  const headline = document.getElementById("headline");
  const plane = document.getElementById("plane");
  HEADLINE.forEach((line) => {
    const strip = document.createElement("div");
    strip.className = "hl-line";
    [...line].forEach((ch) => {
      const s = document.createElement("span");
      s.textContent = ch === " " ? "\u00a0" : ch;
      if (ch === " ") s.className = "hl-space";
      strip.appendChild(s);
    });
    headline.appendChild(strip);
  });
  const chars = [...headline.querySelectorAll("span")];
  const showHeadline = (instant) => {
    headline.classList.add("on");
    chars.forEach((c, i) => {
      if (instant) c.classList.add("in");
      else setTimeout(() => c.classList.add("in"), i * 75);
    });
  };

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = (window.GALLERY_MEDIA || []).filter((m) => m.thumb);
  if (location.hash === "#birthday" || reduce || items.length < 3) { showHeadline(true); return; }

  body.classList.add("intro");
  const stage = document.createElement("div");
  stage.id = "intro";
  stage.innerHTML = '<div class="ix back l"></div><div class="ix back r"></div><div class="ix front"></div>';
  document.body.appendChild(stage);
  const [bl, br, fr] = stage.querySelectorAll(".ix");

  // shuffled photo order, preloaded
  const order = items.map((_, i) => i).sort(() => Math.random() - 0.5);
  const imgs = order.map((i) => { const im = new Image(); im.src = items[i].thumb; return im; });
  let k = 0;
  const put = (el, im) => { el.style.backgroundImage = `url("${im.src}")`; el.style.aspectRatio = `${im.naturalWidth || 3} / ${im.naturalHeight || 4}`; };
  const flick = () => { put(fr, imgs[k % imgs.length]); put(bl, imgs[(k + 7) % imgs.length]); put(br, imgs[(k + 13) % imgs.length]); k++; };

  // [hold ms, stack scale]
  const steps = [];
  for (let i = 0; i < 11; i++) steps.push([67, 0.3 + 0.7 * (i / 10)]);   // fast, growing
  for (const h of [200, 330, 470, 670, 670]) steps.push([h, 1]);       // slowing down
  for (let i = 0; i < 8; i++) steps.push([67, 1 - 0.72 * (i / 7)]);     // fast, shrinking
  steps.push([200, 0.28]);                                             // tiny beat

  let timer = null, done = false;
  const run = (i) => {
    if (done) return;
    if (i >= steps.length) return burst();
    const [hold, s] = steps[i];
    flick();
    stage.style.setProperty("--s", s);
    timer = setTimeout(() => run(i + 1), hold);
  };

  function burst() {
    if (done) return; done = true;
    clearTimeout(timer);
    stage.remove();
    // hard cut like the reference: no fade on the way in
    plane.style.transition = "none";
    body.classList.remove("intro");
    requestAnimationFrame(() => requestAnimationFrame(() => { plane.style.transition = ""; }));
    const cx = innerWidth / 2, cy = innerHeight / 2;
    document.querySelectorAll("#plane .photo").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right < -200 || r.left > innerWidth + 200 || r.bottom < -200 || r.top > innerHeight + 200) return;
      const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
      el.animate(
        [{ transform: `translate(${dx * 0.85}px, ${dy * 0.85}px) scale(1.5)` }, { transform: "none" }],
        { duration: 260 + Math.random() * 80, easing: "cubic-bezier(.16,1,.3,1)", delay: Math.random() * 40 }
      );
    });
    setTimeout(() => showHeadline(false), 280);
  }

  // skip on any input
  const skip = () => { if (!done) burst(); };
  ["pointerdown", "keydown", "wheel"].forEach((t) => addEventListener(t, skip, { once: true, passive: true }));

  // start once the first few photos are ready (or after 1.5 s regardless)
  const ready = imgs.slice(0, 6).map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; })));
  Promise.race([Promise.all(ready), new Promise((r) => setTimeout(r, 1500))]).then(() => run(0));
})();

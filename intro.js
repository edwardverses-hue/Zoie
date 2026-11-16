// Opening sequence, measured frame by frame from hakusuku.jp/recruit (screen recording,
// 1440x900, 30 fps). What it does there, and here:
//  1. One small photo in the centre, then a PILE: every change drops a new photo on
//     top, centred; the last few stay underneath, offset, peeking out. The pile grows
//     from ~10% to ~40% of the screen height on an uneven beat (30-500 ms), holds,
//     then shrinks fast back down to a single small photo, pauses, one last big pile.
//  2. Cut: every gallery photo starts bunched near the centre at full size and spreads
//     out to its place in ~0.27 s (ease-out). No scaling.
//  3. ~0.33 s later the headline: each letter on its own scrap of paper. A line comes
//     in first letter, then the rest at once, jumbled (letters up/down, tilted, sized
//     unevenly), sliding down into place; each letter snaps straight on its own a
//     moment later. Second line follows; the final "." flies in from the right last.
// Plays on load and every time "our gallery" is opened. Tap/drag/key skips to the end.
(() => {
  // EDIT: the headline lines.
  const HEADLINE = ["happy birthday,", "zoie."];

  const body = document.body;
  const headline = document.getElementById("headline");
  const plane = document.getElementById("plane");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- headline: one paper scrap per letter ----
  const scrap = () => {
    // torn edge: 4 corners nudged + a couple of extra points along top and bottom
    const j = () => rnd(0, 7).toFixed(1);
    return `polygon(${j()}% ${j()}%, ${rnd(35, 60).toFixed(0)}% ${j()}%, ${100 - j()}% ${j()}%, ${100 - j()}% ${100 - j()}%, ${rnd(35, 60).toFixed(0)}% ${100 - j()}%, ${j()}% ${100 - j()}%)`;
  };
  const lines = HEADLINE.map((text, li) => {
    const strip = document.createElement("div");
    strip.className = "hl-line";
    const chars = [...text].map((ch, ci) => {
      const s = document.createElement("span");
      s.textContent = ch === " " ? " " : ch;
      if (ch === " ") s.className = "hl-space";
      else s.style.clipPath = scrap();
      strip.appendChild(s);
      return s;
    });
    return { strip, chars, last: li === HEADLINE.length - 1 };
  });
  lines.forEach((l) => headline.appendChild(l.strip));
  // the date: a small stamp under the name (not in the header; see header notes in style.css)
  const stamp = document.createElement("div");
  stamp.className = "hl-date";
  stamp.textContent = "11.17.2026";
  headline.appendChild(stamp);
  const allChars = lines.flatMap((l) => l.chars);

  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0; };

  function resetHeadline() {
    headline.classList.remove("on");
    lines.forEach((l) => { l.strip.classList.remove("down"); });
    allChars.forEach((c) => { c.classList.remove("in", "set", "fly"); c.style.transform = ""; });
    stamp.classList.remove("in");
  }
  function jumble(c) {
    c.style.transform = `translateY(${rnd(-0.22, 0.22).toFixed(2)}em) rotate(${rnd(-7, 7).toFixed(1)}deg) scale(${rnd(0.86, 1.14).toFixed(2)})`;
  }
  function showHeadline(instant) {
    headline.classList.add("on");
    if (instant) { allChars.forEach((c) => { c.classList.add("in", "set"); c.style.transform = ""; }); lines.forEach((l) => l.strip.classList.add("down")); stamp.classList.add("in"); return; }
    later(lines.length * 470 + 1150, () => stamp.classList.add("in"));   // after the last letter settles
    lines.forEach((l, li) => {
      const t = li * 470;                                       // line 2 starts 0.47 s after line 1
      const dot = l.last && l.chars[l.chars.length - 1].textContent === "." ? l.chars[l.chars.length - 1] : null;
      const body_ = l.chars.filter((c) => c !== dot);
      later(t, () => { l.strip.classList.add("down"); jumble(body_[0]); body_[0].classList.add("in"); });
      later(t + 130, () => body_.slice(1).forEach((c) => { jumble(c); c.classList.add("in"); }));
      // each letter snaps straight on its own
      body_.forEach((c) => later(t + rnd(560, 1100), () => { c.classList.add("set"); c.style.transform = ""; }));
      if (dot) later(t + 600, () => { dot.classList.add("in", "fly"); requestAnimationFrame(() => requestAnimationFrame(() => dot.classList.add("set"))); });
    });
  }

  // ---- the pile ----
  // [ms from start, card height as a share of the screen, pile (true) or single photo]
  const BEATS = [
    [0, .097, 0], [167, .121, 0], [233, .238, 1], [433, .25, 1], [667, .281, 1], [700, .30, 1],
    [800, .31, 1], [867, .32, 1], [1033, .328, 1], [1067, .33, 1], [1267, .363, 1], [1433, .361, 1],
    [1867, .40, 1], [2367, .361, 1], [3267, .40, 1],
    [3300, .281, 1], [3367, .25, 1], [3400, .213, 1], [3433, .12, 0], [3467, .107, 0], [3500, .097, 0],
    [3767, .097, 0], [4033, .361, 1],
  ];
  const END = 4067;

  let stage = null, cards = [], playing = false, imgs = [];

  function buildStage() {
    stage = document.createElement("div");
    stage.id = "intro";
    for (let i = 0; i < 5; i++) { const c = document.createElement("div"); c.className = "ix"; stage.appendChild(c); }
    document.body.appendChild(stage);
    cards = [...stage.children];
  }

  function play() {
    const items = (window.GALLERY_MEDIA || []).filter((m) => m.thumb);
    if (reduce || items.length < 3) { resetHeadline(); showHeadline(true); return; }
    clearAll();
    if (stage) stage.remove();
    resetHeadline();
    if (window.Gallery) window.Gallery.reset();
    playing = true;
    body.classList.add("intro");
    document.querySelectorAll("#plane img").forEach((im) => { im.loading = "eager"; if (im.decode) im.decode().catch(() => {}); });
    // the opening is the blind box (box.js); she opens it, the gallery bursts out of it
    const go = () => window.BlindBox.play(() => burst());
    if (window.BlindBox) go();
    else {
      let started = false;
      addEventListener("blindbox-ready", () => { if (!started) { started = true; go(); } }, { once: true });
      setTimeout(() => { if (!started && !window.BlindBox) { started = true; burst(); } }, 4000);
    }
  }

  function skip() { if (playing && window.BlindBox) window.BlindBox.skip(); }
  document.getElementById("bb-skip").addEventListener("click", skip);

  function burst() {
    if (!playing) return;
    playing = false;
    if (stage) { stage.remove(); stage = null; }
    plane.style.transition = "none";
    body.classList.remove("intro");
    requestAnimationFrame(() => requestAnimationFrame(() => { plane.style.transition = ""; }));
    const cx = innerWidth / 2, cy = innerHeight / 2;
    document.querySelectorAll("#plane .photo").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return;   // only what's on screen: fewer layers to composite
      const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
      const rest = el.style.transform || "";          // the photo's own tilt
      el.animate([{ transform: `translate(${dx * 0.8}px, ${dy * 0.8}px) ${rest} scale(0.9)`, opacity: 0 },
                  { opacity: 1, offset: 0.25 },
                  { transform: rest || "none", opacity: 1 }],
        { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" });
    });
    later(600, () => showHeadline(false));
  }

  window.Intro = { play };

  // first load: only when opening on the gallery
  if (location.hash === "#birthday") { showHeadline(true); return; }
  const first = (window.GALLERY_MEDIA || []).slice(0, 6).map((m) => { const im = new Image(); im.src = m.thumb; return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); });
  body.classList.add("intro");
  Promise.race([Promise.all(first), new Promise((r) => setTimeout(r, 1500))]).then(play);
})();

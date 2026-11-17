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
  // one line, as on hakusuku.jp/recruit ("汗かいて、"); scraps: punctuation shares its glyph's scrap
  const HEADLINE = [["生", "日", "快", "乐", "，"], ["宝", "贝", "！"]];   // two lines, like their "汗かいて、/心を動かす。"

  const body = document.body;
  const headline = document.getElementById("headline");
  const plane = document.getElementById("plane");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- headline, measured on hakusuku.jp/recruit's hero (2560 px video): every glyph on its
  // own white hand-cut scrap (corners chopped off at random, a few px uneven), scraps a bit
  // rotated and set up or down a little; all of them on one long cream strip (244,239,231)
  // that starts behind the first scrap and runs on past the last.
  // Measured on their full-res frame (glyph ink = 1 unit): scraps cut with scissors, straight
  // edges, 1-3 corners chopped off by 6-30% of a side; glyph margin 0.08-0.2; gaps between
  // scraps 0-0.33 (cream strip shows through); glyphs sit 0-0.2 lower than each other;
  // punctuation on its own small scrap, low, tucked over the previous scrap. No shadows.
  // Strip: a straight-cut polygon (5-7 corners) starting ~0.6 into the first scrap, its top
  // ~0.08 below the first scrap's top, bottom ~0.25 below the scraps, ending ~0.2 past the last.
  const PUNCT = /[，！。、]/;
  const scrap = () => {
    // clockwise; each corner either chopped (two points) or a single slightly-off point
    const ch = () => rnd(0, 1) < 0.55, A = () => rnd(6, 30), J = () => rnd(0, 3);
    const p = [];
    if (ch()) p.push([0, A()], [A(), 0]); else p.push([J(), J()]);
    if (ch()) p.push([100 - A(), 0], [100, A()]); else p.push([100 - J(), J()]);
    if (ch()) p.push([100, 100 - A()], [100 - A(), 100]); else p.push([100 - J(), 100 - J()]);
    if (ch()) p.push([A(), 100], [0, 100 - A()]); else p.push([J(), 100 - J()]);
    return `polygon(${p.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(",")})`;
  };
  const stripCut = () => {
    const p = [[0, rnd(0, 8)], [rnd(40, 60), rnd(0, 3)], [rnd(96, 99), rnd(0, 6)], [100, rnd(30, 65)],
               [rnd(93, 98), 100], [rnd(30, 60), rnd(95, 100)], [rnd(0, 3), rnd(88, 100)]];
    return `polygon(${p.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(",")})`;
  };
  const lines = HEADLINE.map((groups, li) => {
    const strip = document.createElement("div");
    strip.className = "hl-line";
    const paper = document.createElement("i");
    paper.className = "hl-strip";
    paper.style.clipPath = stripCut();
    strip.appendChild(paper);
    const chars = groups.map((g, gi) => {
      const s = document.createElement("span");
      const punct = PUNCT.test(g);
      if (punct) { s.classList.add("hl-p"); s.dataset.g = g; const b = document.createElement("b"); b.textContent = g; s.appendChild(b); }
      else s.textContent = g;
      s.style.clipPath = scrap();
      const pad = () => rnd(0.07, 0.2).toFixed(2) + "em";
      if (!punct) s.style.padding = `${pad()} ${pad()} ${pad()} ${pad()}`;
      if (gi && !punct) s.style.marginLeft = rnd(0, 0.3).toFixed(2) + "em";
      const dy = punct ? (g === "！" ? rnd(0.18, 0.26) : rnd(0.78, 0.86)) : rnd(0, 0.2);
      s.dataset.rest = `translateY(${dy.toFixed(2)}em) rotate(${rnd(-2.5, 2.5).toFixed(1)}deg)`;
      s.style.transform = s.dataset.rest;
      strip.appendChild(s);
      return s;
    });
    return { strip, chars, last: li === HEADLINE.length - 1 };
  });
  // ---- "click me!" under the title, cut and pasted the same way (smaller), and a "back"
  // on the keychain page. Clicking one: its letters get knocked about for a moment and a
  // pen loop is drawn round it (circling the choice), then the page changes once the loop
  // closes. Hover pre-draws the start of the loop.
  const LOOP = "M84 9 C62 1.5 22 2 8 13 C-2 22 8 35 32 37.5 C58 40 92 37 97 25 C101 15 88 7 70 6.5";
  function scrapButton(text, href, cls) {
    const a = document.createElement("a");
    a.href = href; a.className = "hl-line hl-btn " + cls;
    const paper = document.createElement("i"); paper.className = "hl-strip"; paper.style.clipPath = stripCut();
    a.appendChild(paper);
    const chars = [];
    text.split(" ").forEach((word, wi) => {
      [...word].forEach((g, gi) => {
        const s = document.createElement("span");
        s.textContent = g;
        s.style.clipPath = scrap();
        const pad = () => rnd(0.08, 0.18).toFixed(2) + "em";
        s.style.padding = `${pad()} ${pad()} ${pad()} ${pad()}`;
        if (wi && !gi) s.style.marginLeft = "0.34em";
        else if (gi) s.style.marginLeft = rnd(0, 0.16).toFixed(2) + "em";
        s.dataset.rest = `translateY(${rnd(0, 0.16).toFixed(2)}em) rotate(${rnd(-3, 3).toFixed(1)}deg)`;
        s.style.transform = s.dataset.rest;
        a.appendChild(s); chars.push(s);
      });
    });
    a.setAttribute("aria-label", text);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ink"); svg.setAttribute("viewBox", "0 0 100 40");
    svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", LOOP); svg.appendChild(p); a.appendChild(svg);
    let busy = false;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (busy) return; busy = true;
      measureInk(p);
      a.classList.add("drawn");
      chars.forEach((c, i) => setTimeout(() => {
        c.style.transform = `translateY(${rnd(-0.14, 0.1).toFixed(2)}em) rotate(${rnd(-9, 9).toFixed(1)}deg)`;
        setTimeout(() => { c.style.transform = c.dataset.rest; }, 170);
      }, i * 28));
      setTimeout(() => { location.hash = href; }, 640);
      setTimeout(() => { a.classList.remove("drawn"); busy = false; }, 1400);
    });
    return { a, chars, path: p };
  }
  // the loop's stroke isn't scaled with the stretched SVG: measure its on-screen length
  function measureInk(p) {
    const m = p.ownerSVGElement.getScreenCTM(); if (!m) return;
    const L = p.getTotalLength(); let len = 0, prev = null;
    for (let i = 0; i <= 60; i++) {
      const q = p.getPointAtLength((L * i) / 60), x = q.x * m.a + q.y * m.c, y = q.x * m.b + q.y * m.d;
      if (prev) len += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
    }
    p.style.setProperty("--len", Math.ceil(len + 4));
  }
  const clickMe = scrapButton("click me!", "#birthday", "hl-go");
  lines.push({ strip: clickMe.a, chars: clickMe.chars, last: false });
  const back = scrapButton("back", "#gallery", "hl-back");
  back.chars.forEach((c) => c.classList.add("in", "set"));
  document.body.appendChild(back.a);
  const remeasure = () => { measureInk(clickMe.path); measureInk(back.path); };
  addEventListener("resize", remeasure);
  addEventListener("hashchange", () => requestAnimationFrame(remeasure));
  if (document.fonts) document.fonts.ready.then(remeasure);

  lines.forEach((l) => headline.appendChild(l.strip));
  const stamp = document.createElement("div");      // (no date under the title: the reference has none)
  const allChars = lines.flatMap((l) => l.chars);

  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0; };

  function resetHeadline() {
    headline.classList.remove("on");
    lines.forEach((l) => { l.strip.classList.remove("down"); });
    allChars.forEach((c) => { c.classList.remove("in", "set", "fly"); c.style.transform = c.dataset.rest || ""; });
    stamp.classList.remove("in");
  }
  function jumble(c) {
    c.style.transform = `translateY(${rnd(-0.22, 0.22).toFixed(2)}em) rotate(${rnd(-7, 7).toFixed(1)}deg) scale(${rnd(0.86, 1.14).toFixed(2)})`;
  }
  function showHeadline(instant) {
    headline.classList.add("on");
    if (instant) { allChars.forEach((c) => { c.classList.add("in", "set"); c.style.transform = c.dataset.rest || ""; }); lines.forEach((l) => l.strip.classList.add("down")); stamp.classList.add("in"); return; }
    later(lines.length * 470 + 1150, () => stamp.classList.add("in"));   // after the last letter settles
    lines.forEach((l, li) => {
      const t = li * 470;                                       // line 2 starts 0.47 s after line 1
      const dot = l.last && l.chars[l.chars.length - 1].textContent === "." ? l.chars[l.chars.length - 1] : null;
      const body_ = l.chars.filter((c) => c !== dot);
      later(t, () => { l.strip.classList.add("down"); jumble(body_[0]); body_[0].classList.add("in"); });
      later(t + 130, () => body_.slice(1).forEach((c) => { jumble(c); c.classList.add("in"); }));
      // each letter snaps straight on its own
      body_.forEach((c) => later(t + rnd(560, 1100), () => { c.classList.add("set"); c.style.transform = c.dataset.rest || ""; }));
      if (dot) later(t + 600, () => { dot.classList.add("in", "fly"); requestAnimationFrame(() => requestAnimationFrame(() => dot.classList.add("set"))); });
    });
  }

  // ---- the pile ----
  // Measured from hakusuku's own hero video (assets/movie/kv_pc.mp4, 2560x2560, 30 fps),
  // frame numbers are that video's. A new photo lands on top of the pile, centred, on these
  // frames: every frame for 10 frames, then the gaps grow (2,2,2,3,4,6,9,15) -> 19 photos.
  const F = 1000 / 30;
  const PUSH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 20, 24, 30, 39, 54];
  // Each new photo is a bit bigger: long side as a share of the screen's longer side
  // (the square video is cover-fit, so its 2560 px = the longer side of the screen).
  const LONG = (f) => f <= 1 ? .09 : f <= 6 ? .09 + (f - 1) / 5 * .015 : f <= 11 ? .105 + (f - 6) / 5 * .075 : f <= 17 ? .18 + (f - 11) / 6 * .02 : .20 + Math.min(1, (f - 17) / 13) * .02;
  // frame 54-75: hold. 76-84: the pile pops back off, top first, down to the first photo
  // (pile size after each pop). 84-93: that one small photo alone. 94-100: the burst.
  const POP = [[76, 15], [77, 11], [78, 7], [79, 5], [80, 4], [81, 3], [82, 2], [84, 1]];
  const BURST_AT = 94;

  let stage = null, playing = false, pilePool = [];
  function preloadPile() {
    const all = (window.GALLERY_MEDIA || []).filter((m) => m.thumb);
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    pilePool = all.slice(0, PUSH.length + 6).map((m) => {
      const p = { src: m.thumb, ar: 0.75, ok: false, im: new Image() };
      p.im.decoding = "sync";
      p.im.src = m.thumb;
      (p.im.decode ? p.im.decode() : Promise.reject()).then(() => { p.ok = true; p.ar = p.im.naturalWidth / p.im.naturalHeight; }).catch(() => {});
      return p;
    });
  }

  function runPile(done) {
    stage = document.createElement("div");
    stage.id = "intro";
    document.body.appendChild(stage);
    // photos were picked and decoded while the box was being opened (preloadPile); only
    // ones that actually decoded are used, so a card is never blank
    const pool = pilePool.filter((p) => p.ok);
    if (pool.length < 3) { later(0, done); return; }
    const vmax = Math.max(innerWidth, innerHeight);
    const cards = [];
    PUSH.forEach((f, n) => later((f - 1) * F, () => {
      const p = pool[n % pool.length];
      const L = LONG(f) * vmax;
      const w = p.ar >= 1 ? L : L * p.ar, h = p.ar >= 1 ? L / p.ar : L;
      const c = document.createElement("div");
      c.className = "ix";
      // straight, centred; a hair off-centre so the older ones peek out unevenly
      // the first card is the photo that just rose out of the bag (box.js): exactly centred
      const ox = n ? rnd(-0.03, 0.03) * w : 0, oy = n ? rnd(-0.03, 0.03) * h : 0;
      Object.assign(c.style, { width: w + "px", height: h + "px", transform: `translate(${-w / 2 + ox}px, ${-h / 2 + oy}px)` });
      c.appendChild(p.im.parentNode ? p.im.cloneNode() : p.im);   // the decoded image itself: no re-decode, no blank frame
      stage.appendChild(c); cards.push(c);
    }));
    POP.forEach(([f, keep]) => later((f - 1) * F, () => { while (cards.length > keep) cards.pop().remove(); }));
    later((BURST_AT - 1) * F, done);
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
    preloadPile();
    document.querySelectorAll("#plane img").forEach((im) => { im.loading = "eager"; if (im.decode) im.decode().catch(() => {}); });
    // the opening is the blind box (box.js); she opens it, the gallery bursts out of it
    const go = () => window.BlindBox.play((opened) => (opened ? runPile(burst) : burst()));   // skip goes straight to the gallery
    if (window.BlindBox) go();
    else {
      let started = false;
      addEventListener("blindbox-ready", () => { if (!started) { started = true; go(); } }, { once: true });
      setTimeout(() => { if (!started && !window.BlindBox) { started = true; runPile(burst); } }, 4000);
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
    // hakusuku frames 94-100 (200 ms): every photo starts at the centre at full size and
    // moves straight out to its place. Measured spread per frame: 9, 27, 51, 71, 76, 96, 100%
    // -> close to linear. No scaling, no extra photos.
    const onScreen = [...document.querySelectorAll("#plane .photo")].filter((el) => {
      const r = el.getBoundingClientRect();
      return !(r.right < -200 || r.left > innerWidth + 200 || r.bottom < -200 || r.top > innerHeight + 200);
    });
    const K = [.09, .27, .51, .71, .76, .96, 1];
    onScreen.forEach((el) => {
      const r = el.getBoundingClientRect();
      const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
      const rest = el.style.transform || "";
      el.animate(K.map((k, i) => ({ transform: `translate(${dx * (1 - k)}px, ${dy * (1 - k)}px) ${rest}`.trim(), offset: i / (K.length - 1) })),
        { duration: 6 * F, easing: "linear" });
    });
    // headline starts writing at frame ~106: 200 ms after the photos land
    later(6 * F + 200, () => showHeadline(false));
  }

  // box.js asks for the pile's first photo and its card size, so the photo it lifts out of
  // the bag lands exactly on the pile's first card (same image, same place, same size)
  function firstCard() {
    const p = pilePool.find((q) => q.ok);
    if (!p) return null;
    const L = LONG(PUSH[0]) * Math.max(innerWidth, innerHeight);
    return { src: p.src, w: p.ar >= 1 ? L : L * p.ar, h: p.ar >= 1 ? L / p.ar : L };
  }
  window.Intro = { play, firstCard };

  // first load: only when opening on the gallery
  if (location.hash === "#birthday") { showHeadline(true); return; }
  const first = (window.GALLERY_MEDIA || []).slice(0, 6).map((m) => { const im = new Image(); im.src = m.thumb; return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); });
  body.classList.add("intro");
  Promise.race([Promise.all(first), new Promise((r) => setTimeout(r, 1500))]).then(play);
})();

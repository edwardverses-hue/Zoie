// Endless gallery: one tile (from Figma frame "3") repeated in every direction.
(() => {
  // Layout from tools/build_layout.py: every photo once, at its real proportions,
  // with even gaps and a hand-cut white backing. Phones get the same layout, smaller.
  const LAYOUT = window.LAYOUT;
  const scaleFor = () => (innerWidth < 700 ? 0.52 : 1);
  let S = scaleFor();
  let SUPER_W = LAYOUT.w * S, SUPER_H = LAYOUT.h * S;
  const PHOTOS = window.PHOTOS || [];

  const stage = document.getElementById("stage");
  const bg = document.getElementById("bg");
  const BG_W = 1440, BG_H = 1024; // background tile size (Figma frame)
  const plane = document.getElementById("plane");
  const hint = document.getElementById("hint");

  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };

  // A PHOTOS entry is either "photos/x.webp" or { thumb, full, loop, video }:
  //   thumb: small image for the gallery    full: big image for the expanded view
  //   loop: short muted clip for the gallery    video: full clip (with sound) for the expanded view
  const norm = (m) => (typeof m === "string" ? { thumb: m, full: m } : m);
  window.GALLERY_MEDIA = PHOTOS.map(norm); // each photo once, for the expanded view

  function buildTile() {
    const tile = document.createElement("div");
    tile.className = "tile";
    LAYOUT.slots.forEach((s) => {
      const slot = document.createElement("div");
      slot.className = "photo";
      slot.dataset.index = s.i;
      // the box includes an 8px margin so the cut border and shadow aren't clipped (.photo uses paint containment)
      const P = 8;
      Object.assign(slot.style, { left: (s.x - P) * S + "px", top: (s.y - P) * S + "px", width: (s.w + 2 * P) * S + "px", height: (s.h + 2 * P) * S + "px" });

      // white backing, cut by hand (uneven border, nudged corners) + a soft paper shadow
      const svg = svgEl("svg", { width: (s.w + 2 * P) * S, height: (s.h + 2 * P) * S, viewBox: `${-P} ${-P} ${s.w + 2 * P} ${s.h + 2 * P}` });
      svg.appendChild(svgEl("path", { d: s.cut, fill: "rgba(20,40,90,0.13)", transform: "translate(0.8 1.8)" }));
      svg.appendChild(svgEl("path", { d: s.cut, fill: "#fff" }));
      slot.appendChild(svg);

      const m = norm(PHOTOS[s.i]);
      let el;
      if (m.loop) {
        el = document.createElement("video");
        Object.assign(el, { src: m.loop, muted: true, loop: true, autoplay: true, playsInline: true, preload: "metadata" });
        el.setAttribute("muted", ""); el.setAttribute("playsinline", "");
        el.setAttribute("disablepictureinpicture", ""); el.setAttribute("disableremoteplayback", "");
        el.controls = false;
        if (m.thumb) el.poster = m.thumb;
      } else {
        el = document.createElement("img");
        Object.assign(el, { src: m.thumb, alt: "", loading: "lazy", decoding: "async", draggable: false });
      }
      el.classList.add("media");
      Object.assign(el.style, { left: P * S + "px", top: P * S + "px", width: s.w * S + "px", height: s.h * S + "px" });
      slot.appendChild(el);
      tile.appendChild(slot);
    });
    return tile;
  }

  // Enough tile copies to cover the screen at any offset.
  let tiles = [], cols = 0, rows = 0;
  function layoutTiles() {
    const c = Math.ceil(innerWidth / SUPER_W) + 1;
    const r = Math.ceil(innerHeight / SUPER_H) + 1;
    const sc = scaleFor();
    if (c === cols && r === rows && sc === S) return;
    if (sc !== S) { ox = innerWidth / 2 + (ox - innerWidth / 2) * sc / S; oy = innerHeight / 2 + (oy - innerHeight / 2) * sc / S; }
    S = sc; SUPER_W = LAYOUT.w * S; SUPER_H = LAYOUT.h * S;
    cols = Math.ceil(innerWidth / SUPER_W) + 1; rows = Math.ceil(innerHeight / SUPER_H) + 1;
    plane.innerHTML = "";
    tiles = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const t = buildTile();
      t.style.transform = `translate(${i * SUPER_W}px, ${j * SUPER_H}px)`;
      plane.appendChild(t);
      tiles.push(t);
    }
  }

  // Start with the headline's clear space in the middle of the window.
  let ox = innerWidth / 2 - LAYOUT.start[0] * S;
  let oy = innerHeight / 2 - LAYOUT.start[1] * S;
  let vx = 0, vy = 0;
  const headline = document.getElementById("headline");

  const mod = (a, n) => ((a % n) + n) % n;
  function render() {
    // Wrap the offset so the plane never runs out.
    const x = mod(ox, SUPER_W) - SUPER_W;
    const y = mod(oy, SUPER_H) - SUPER_H;
    plane.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    // headline starts centred and then moves with the photos (it isn't repeated, so it doesn't come back)
    if (headline) headline.style.transform = `translate(-50%, -50%) translate3d(${ox + LAYOUT.start[0] * S - innerWidth / 2}px, ${oy + LAYOUT.start[1] * S - innerHeight / 2}px, 0)`;
    // paper moves with the photos, wrapped on its own tile size
    bg.style.transform = `translate3d(${mod(ox, BG_W) - BG_W}px, ${mod(oy, BG_H) - BG_H}px, 0)`;
  }

  // ---- input: keychain first, otherwise pan ----
  let mode = null, lastX = 0, lastY = 0, lastT = 0, moved = 0, downSlot = null;
  const viewerOpen = () => document.body.classList.contains("viewing");
  const K = () => window.Keychain;

  stage.addEventListener("pointerdown", (e) => {
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    if (document.body.classList.contains("birthday")) {
      if (K() && K().grab(e.clientX, e.clientY)) mode = "charm";
      return; // no panning on the birthday page
    }
    mode = "pan"; moved = 0;
    downSlot = e.target.closest && e.target.closest(".photo[data-index]");
    vx = vy = 0;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    stage.classList.add("dragging");
  });

  stage.addEventListener("pointermove", (e) => {
    if (mode === "charm") { K().move(e.clientX, e.clientY); return; }
    if (mode !== "pan") return;
    const now = performance.now();
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    const dt = Math.max(1, now - lastT);
    ox += dx; oy += dy; moved += Math.abs(dx) + Math.abs(dy);
    vx = 0.8 * (dx / dt) * 16 + 0.2 * vx; // px per frame
    vy = 0.8 * (dy / dt) * 16 + 0.2 * vy;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    if (moved > 20) hint.classList.add("gone");
  });

  const end = (e) => {
    if (mode === "charm") K().release();
    if (mode === "pan" && downSlot && moved < 8 && e.type === "pointerup" && window.Viewer) {
      vx = vy = 0;
      window.Viewer.open(+downSlot.dataset.index);
    }
    downSlot = null;
    if (mode === "pan" && performance.now() - lastT > 80) { vx = vy = 0; } // held still before letting go
    mode = null;
    stage.classList.remove("dragging");
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  // trackpad / mouse wheel pans both ways
  addEventListener("wheel", (e) => {
    e.preventDefault();
    if (document.body.classList.contains("birthday") || viewerOpen()) return;
    const dx = e.shiftKey ? e.deltaY : e.deltaX;
    const dy = e.shiftKey ? 0 : e.deltaY;
    ox -= dx; oy -= dy; vx = vy = 0;
    hint.classList.add("gone");
  }, { passive: false });

  // keyboard
  addEventListener("keydown", (e) => {
    if (document.body.classList.contains("birthday") || viewerOpen()) return;
    const step = 120;
    if (e.key === "ArrowLeft") vx += step / 8;
    if (e.key === "ArrowRight") vx -= step / 8;
    if (e.key === "ArrowUp") vy += step / 8;
    if (e.key === "ArrowDown") vy -= step / 8;
  });

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let drawnX = NaN, drawnY = NaN;
  function frame() {
    if (document.body.classList.contains("birthday")) { requestAnimationFrame(frame); return; }
    if (mode !== "pan") {
      ox += vx; oy += vy;
      const f = reduce ? 0.6 : 0.94; // glide after letting go
      vx *= f; vy *= f;
      if (Math.abs(vx) < 0.05) vx = 0;
      if (Math.abs(vy) < 0.05) vy = 0;
    }
    if (ox !== drawnX || oy !== drawnY) { render(); drawnX = ox; drawnY = oy; }
    requestAnimationFrame(frame);
  }

  // Gallery loops: if the phone blocks autoplay (e.g. iPhone Low Power Mode) they show
  // their still frame, then start on her first touch anywhere.
  const loops = () => plane.querySelectorAll("video");
  const onScreen = new Set();
  const allowed = () => !document.body.classList.contains("birthday") && !document.body.classList.contains("viewing");
  const sync = (v) => {
    if (onScreen.has(v) && allowed()) { const p = v.play(); if (p) p.catch(() => {}); }
    else if (!v.paused) v.pause();
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target); sync(e.target);
  }), { rootMargin: "150px" });
  const watch = () => { io.disconnect(); onScreen.clear(); loops().forEach((v) => { v.pause(); io.observe(v); }); };
  const playAll = () => loops().forEach(sync);
  ["pointerdown", "touchstart", "keydown"].forEach((t) => addEventListener(t, playAll, { passive: true }));
  new MutationObserver(playAll).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  addEventListener("resize", () => { layoutTiles(); watch(); });
  layoutTiles();
  watch();
  requestAnimationFrame(frame);
})();

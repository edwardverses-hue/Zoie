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

  // One finite map (like haneda-nice-day): built once, panned and zoomed as a whole.
  let tiles = [];
  function layoutTiles() {
    const sc = scaleFor();
    if (tiles.length && sc === S) return;
    if (tiles.length) { ox = innerWidth / 2 + (ox - innerWidth / 2) * sc / S; oy = innerHeight / 2 + (oy - innerHeight / 2) * sc / S; }
    S = sc; SUPER_W = LAYOUT.w * S; SUPER_H = LAYOUT.h * S;
    plane.innerHTML = "";
    const t = buildTile();
    plane.appendChild(t);
    tiles = [t];
    MiniMap.build();
  }

  // Start with the headline in the middle of the window.
  let ox = innerWidth / 2 - LAYOUT.start[0] * S;
  let oy = innerHeight / 2 - LAYOUT.start[1] * S;
  let vx = 0, vy = 0;
  let Z = 1;                         // 1 = close up; < 1 = zoomed out to the whole map
  const headline = document.getElementById("headline");

  // keep the map on screen: can't drag past its edges; if it's smaller than the window, centre it
  function clamp() {
    const w = SUPER_W * Z, h = SUPER_H * Z;
    const cx = w <= innerWidth ? (innerWidth - w) / 2 : Math.min(0, Math.max(innerWidth - w, ox));
    const cy = h <= innerHeight ? (innerHeight - h) / 2 : Math.min(0, Math.max(innerHeight - h, oy));
    if (cx !== ox) { ox = cx; vx = 0; }
    if (cy !== oy) { oy = cy; vy = 0; }
  }

  const mod = (a, n) => ((a % n) + n) % n;
  function render() {
    plane.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${Z})`;
    // headline belongs to the map: it sits at the map's centre, moves and zooms with it
    if (headline) headline.style.transform = `translate(-50%, -50%) translate3d(${ox + LAYOUT.start[0] * S * Z - innerWidth / 2}px, ${oy + LAYOUT.start[1] * S * Z - innerHeight / 2}px, 0) scale(${Z})`;
    // paper moves with the photos
    bg.style.transform = `translate3d(${mod(ox, BG_W) - BG_W}px, ${mod(oy, BG_H) - BG_H}px, 0)`;
    MiniMap.frame(ox, oy, Z);
  }

  // ---- minimap (bottom right): every photo as a hatched block, the window as a frame ----
  const MiniMap = (() => {
    const box = document.getElementById("minimap");
    const map = box.querySelector(".mm-map");
    const frameEl = box.querySelector(".mm-frame");
    let k = 1;
    function build() {
      const W = LAYOUT.w, H = LAYOUT.h, NS = "http://www.w3.org/2000/svg";
      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" });
      const defs = svgEl("defs", {});
      const pat = svgEl("pattern", { id: "mm-hatch", patternUnits: "userSpaceOnUse", width: 60, height: 60, patternTransform: "rotate(35)" });
      pat.appendChild(svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 60, stroke: "#fff", "stroke-width": 34 }));
      defs.appendChild(pat); svg.appendChild(defs);
      LAYOUT.slots.forEach((s) => svg.appendChild(svgEl("rect", { x: s.x, y: s.y, width: s.w, height: s.h, fill: "url(#mm-hatch)" })));
      map.innerHTML = ""; map.appendChild(svg);
      map.style.aspectRatio = `${W} / ${H}`;
    }
    function frame(x, y, z) {
      k = map.clientWidth / (SUPER_W * z);          // minimap px per screen px
      const fx = -x * k, fy = -y * k, fw = innerWidth * k, fh = innerHeight * k;
      frameEl.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
      frameEl.style.width = fw + "px"; frameEl.style.height = fh + "px";
    }
    return { build, frame };
  })();

  // ---- zoom toggle: whole map <-> close up, keeping the middle of the screen in place ----
  const zoomBtn = document.getElementById("zoom");
  let zoomAnim = null;
  function fitZ() { return Math.min((innerWidth - 80) / SUPER_W, (innerHeight - 140) / SUPER_H, 1); }
  function zoomTo(z1) {
    const z0 = Z, t0 = performance.now(), D = reduce ? 1 : 900;
    // the map point under the middle of the screen stays put (zooming out ends centred on the map)
    const mx = (innerWidth / 2 - ox) / Z, my = (innerHeight / 2 - oy) / Z;
    const ex = z1 < z0 ? SUPER_W / 2 : mx, ey = z1 < z0 ? SUPER_H / 2 : my;
    vx = vy = 0;
    zoomAnim = (now) => {
      const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 4);
      Z = z0 + (z1 - z0) * e;
      const px = mx + (ex - mx) * e, py = my + (ey - my) * e;
      ox = innerWidth / 2 - px * Z; oy = innerHeight / 2 - py * Z;
      if (p >= 1) zoomAnim = null;
    };
    zoomBtn.dataset.zoom = z1 < 1 ? "out" : "in";
    document.body.classList.toggle("zoomed-out", z1 < 1);
  }
  zoomBtn.addEventListener("click", (e) => { e.stopPropagation(); zoomTo(Z < 1 ? 1 : fitZ()); hint.classList.add("gone"); });
  zoomBtn.addEventListener("pointerdown", (e) => e.stopPropagation());

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
  let drawnX = NaN, drawnY = NaN, drawnZ = NaN;
  function frame() {
    if (document.body.classList.contains("birthday")) { requestAnimationFrame(frame); return; }
    if (zoomAnim) zoomAnim(performance.now());
    else if (mode !== "pan") {
      ox += vx; oy += vy;
      const f = reduce ? 0.6 : 0.94; // glide after letting go
      vx *= f; vy *= f;
      if (Math.abs(vx) < 0.05) vx = 0;
      if (Math.abs(vy) < 0.05) vy = 0;
    }
    if (!zoomAnim) clamp();
    if (ox !== drawnX || oy !== drawnY || Z !== drawnZ) { render(); drawnX = ox; drawnY = oy; drawnZ = Z; }
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

  addEventListener("resize", () => { layoutTiles(); if (Z < 1) Z = fitZ(); drawnZ = NaN; watch(); });
  layoutTiles();
  watch();
  requestAnimationFrame(frame);
})();

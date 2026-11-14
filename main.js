// Endless gallery: one tile (from Figma frame "3") repeated in every direction.
(() => {
  // Photo slots copied from Figma frame "3", including each hand-cut white backing.
  // g: group x, y, w, h   b: backing x, y, rotation, path   p: photo x, y, w, h, mask path (or null)
  const RAW = [
    {"g":[313,401,151.26,212.42],"b":[0.73,0,-0.2,"M 0 0 L 150.53 0 L 150.53 211.9 L 0 211.9 Z"],"p":[2.12,0.46,148.42,207.78,null]},
    {"g":[-266,918,127.7,185.18],"b":[0,0,0,"M 3.22 3.2 L 124.22 0 L 127.7 185.18 L 0 180.13 L 3.22 3.2 Z"],"p":[3.03,2.86,118.1,177.31,null]},
    {"g":[-179,1150,186.41,128.24],"b":[0,0,0,"M 2.43 3.16 L 186.41 0 L 186.41 128.24 L 0 128.24 L 2.43 3.16 Z"],"p":[2.66,3.28,183.75,122.5,null]},
    {"g":[495,970,162.78,108.44],"b":[0,0,0,"M 2.72 1.97 L 81.36 0 L 162.78 1.97 L 162.78 108.44 L 0 108.44 L 2.72 1.97 Z"],"p":[3.22,0,157.67,108.44,"M 2.64 1.97 L 78.81 0 L 157.67 1.97 L 157.67 108.44 L 0 108.44 L 2.64 1.97 Z"]},
    {"g":[551,414,186.66,141.68],"b":[0,0,0,"M 0 0 L 123.56 3.06 L 186.66 1.76 L 186.66 141.68 L 2.04 141.68 L 0 0 Z"],"p":[0,0,184,138,"M 0 0 L 121.79 2.98 L 184 1.72 L 184 138 L 2.01 138 L 0 0 Z"]},
    {"g":[-226,443,249.37,165.99],"b":[0,0,0,"M 0 0 L 193.92 3.33 L 247.29 7.82 L 249.37 165.99 L 0 162.47 L 0 80.23 L 0 0 Z"],"p":[0,0,249.37,163.97,"M 0 0 L 193.92 3.29 L 247.29 7.72 L 249.37 163.97 L 0 160.49 L 0 79.25 L 0 0 Z"]},
    {"g":[-465,726,224.29,154.73],"b":[0.36,0,0,"M 0 0 L 223.93 0 L 223.93 154.73 L 0 154.73 Z"],"p":[0,4.28,224.29,150.09,null]},
    {"g":[658,1170,259.18,175.57],"b":[0,0,0,"M 2.05 2.02 L 259.18 0 L 259.18 175.57 L 0 175.57 L 2.05 2.02 Z"],"p":[2.1,0,257.07,172.29,null]},
    {"g":[-629,1026,285.73,192.83],"b":[0,0,0,"M 0 0 L 285.73 0 L 285.73 192.83 L 3.28 188.12 L 0 0 Z"],"p":[3.25,0.16,282,189.5,null]},
    {"g":[118,1173,374.5,263.43],"b":[0,0,0,"M 0 0 L 374.5 6.29 L 374.5 263.43 L 0 263.43 L 0 0 Z"],"p":[0,5.5,374.5,253.5,null]},
    {"g":[-620,402,174.62,278.4],"b":[0,0,0,"M 4.58 0 L 78.25 0 L 169.8 0 L 174.62 278.4 L 4.58 278.4 L 0 193.69 L 4.58 0 Z"],"p":[0,0,171.34,275.09,"M 4.49 0 L 76.78 0 L 166.6 0 L 171.34 275.09 L 4.49 275.09 L 0 191.39 L 4.49 0 Z"]},
    {"g":[583,625,310.6,209.48],"b":[0,0,0,"M 0 0 L 310.6 0 L 304.36 203.65 L 0 209.48 L 0 0 Z"],"p":[0,0,303.75,203.51,null]},
    {"g":[811,221,374.5,263.43],"b":[0,0,0,"M 0 0 L 374.5 6.29 L 374.5 263.43 L 0 263.43 L 0 0 Z"],"p":[0,5.5,374.5,253.5,null]},
    {"g":[1318,505,224.29,154.73],"b":[0.36,0,0,"M 0 0 L 223.93 0 L 223.93 154.73 L 0 154.73 Z"],"p":[0,4.28,224.29,150.09,null]},
    {"g":[409,181,249.37,165.99],"b":[0,0,0,"M 0 0 L 193.92 3.33 L 247.29 7.82 L 249.37 165.99 L 0 162.47 L 0 80.23 L 0 0 Z"],"p":[0,0,249.37,163.97,"M 0 0 L 193.92 3.29 L 247.29 7.72 L 249.37 163.97 L 0 160.49 L 0 79.25 L 0 0 Z"]},
    {"g":[1201,825,174.62,278.4],"b":[0,0,0,"M 4.58 0 L 78.25 0 L 169.8 0 L 174.62 278.4 L 4.58 278.4 L 0 193.69 L 4.58 0 Z"],"p":[0,0,171.34,275.09,"M 4.49 0 L 76.78 0 L 166.6 0 L 171.34 275.09 L 4.49 275.09 L 0 191.39 L 4.49 0 Z"]},
    {"g":[47,221,224.29,154.73],"b":[0.36,0,0,"M 0 0 L 223.93 0 L 223.93 154.73 L 0 154.73 Z"],"p":[0,4.28,224.29,150.09,null]},
    {"g":[1045,613,186.41,128.24],"b":[0,0,0,"M 2.43 3.16 L 186.41 0 L 186.41 128.24 L 0 128.24 L 2.43 3.16 Z"],"p":[2.66,3.28,183.75,122.5,null]},
    {"g":[1268,167,285.73,192.83],"b":[0,0,0,"M 0 0 L 285.73 0 L 285.73 192.83 L 3.28 188.12 L 0 0 Z"],"p":[3.25,0.16,282,189.5,null]},
    {"g":[854,902,218.75,148.5],"b":[0,0,0,"M 0 0 L 216.07 1.47 L 218.75 148.5 L 0 148.5 L 0 0 Z"],"p":[0,1.72,215.75,142.95,null]},
  ];
  const SHIFT_X = 687, SHIFT_Y = -102; // frame coords -> tile coords
  const TILE_W = 2300, TILE_H = 1400;  // repeat period (photos stay clear of the seams)

  const SLOTS = RAW.map((s) => ({ ...s, x: s.g[0] + SHIFT_X, y: s.g[1] + SHIFT_Y }));
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
  const media = (i) => {
    const m = PHOTOS[i % PHOTOS.length];
    return typeof m === "string" ? { thumb: m, full: m } : m;
  };
  window.GALLERY_MEDIA = PHOTOS.map((_, i) => media(i));

  function buildTile() {
    const tile = document.createElement("div");
    tile.className = "tile";
    SLOTS.forEach((s, i) => {
      const [, , gw, gh] = s.g;
      const [bx, by, brot, bpath] = s.b;
      const [px, py, pw, ph, mask] = s.p;

      const slot = document.createElement("div");
      slot.className = "photo";
      Object.assign(slot.style, { left: s.x + "px", top: s.y + "px", width: gw + "px", height: gh + "px" });

      // white backing, cut by hand in Figma (Figma rotation is counter-clockwise)
      const svg = svgEl("svg", { width: gw, height: gh, viewBox: `0 0 ${gw} ${gh}` });
      svg.appendChild(svgEl("path", { d: bpath, fill: "#fff", transform: `translate(${bx} ${by}) rotate(${-brot})` }));
      slot.appendChild(svg);

      // photo or looping clip, clipped to its own (sometimes uneven) shape
      let el;
      if (PHOTOS.length) {
        const m = media(i);
        slot.dataset.index = i % PHOTOS.length;
        if (m.loop) {
          el = document.createElement("video");
          Object.assign(el, { src: m.loop, muted: true, loop: true, autoplay: true, playsInline: true, preload: "metadata" });
          el.setAttribute("muted", ""); el.setAttribute("playsinline", "");
          if (m.thumb) el.poster = m.thumb;
        } else {
          el = document.createElement("img");
          Object.assign(el, { src: m.thumb, alt: "", loading: "lazy", decoding: "async", draggable: false });
        }
      } else {
        el = document.createElement("div");
        el.className = "empty";
        el.textContent = i + 1;
      }
      el.classList.add("media");
      Object.assign(el.style, { left: px + "px", top: py + "px", width: pw + "px", height: ph + "px" });
      if (mask) el.style.clipPath = `path("${mask}")`;
      slot.appendChild(el);
      tile.appendChild(slot);
    });
    return tile;
  }

  // Enough tile copies to cover the screen at any offset.
  let tiles = [], cols = 0, rows = 0;
  function layoutTiles() {
    const c = Math.ceil(innerWidth / TILE_W) + 1;
    const r = Math.ceil(innerHeight / TILE_H) + 1;
    if (c === cols && r === rows) return;
    cols = c; rows = r;
    plane.innerHTML = "";
    tiles = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const t = buildTile();
      t.style.transform = `translate(${i * TILE_W}px, ${j * TILE_H}px)`;
      plane.appendChild(t);
      tiles.push(t);
    }
  }

  // Start on the same view as the Figma frame, centred in the window.
  let ox = -SHIFT_X + (innerWidth - 1440) / 2;
  let oy = -SHIFT_Y + (innerHeight - 1024) / 2;
  let vx = 0, vy = 0;

  const mod = (a, n) => ((a % n) + n) % n;
  function render() {
    // Wrap the offset so the plane never runs out.
    const x = mod(ox, TILE_W) - TILE_W;
    const y = mod(oy, TILE_H) - TILE_H;
    plane.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    // paper moves with the photos, wrapped on its own tile size
    bg.style.transform = `translate3d(${mod(ox, BG_W) - BG_W}px, ${mod(oy, BG_H) - BG_H}px, 0)`;
  }

  // ---- input: keychain first, otherwise pan ----
  let mode = null, lastX = 0, lastY = 0, lastT = 0, moved = 0, downSlot = null;
  const viewerOpen = () => document.body.classList.contains("viewing");
  const K = () => window.Keychain;

  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
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
  function frame() {
    if (mode !== "pan") {
      ox += vx; oy += vy;
      const f = reduce ? 0.6 : 0.94; // glide after letting go
      vx *= f; vy *= f;
      if (Math.abs(vx) < 0.05) vx = 0;
      if (Math.abs(vy) < 0.05) vy = 0;
    }
    render();
    requestAnimationFrame(frame);
  }

  addEventListener("resize", layoutTiles);
  layoutTiles();
  requestAnimationFrame(frame);
})();

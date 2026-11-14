// Endless gallery: one tile (from Figma frame "3") repeated in every direction.
(() => {
  // Photo slots copied from Figma frame "3" (x, y, w, h), shifted so the tile starts at 0,0.
  const RAW = [
    [313, 401, 151, 212], [-266, 918, 128, 185], [-179, 1150, 186, 128], [495, 970, 163, 108],
    [551, 414, 187, 142], [-226, 443, 249, 166], [-465, 726, 224, 155], [658, 1170, 259, 176],
    [-629, 1026, 286, 193], [118, 1173, 375, 263], [-620, 402, 175, 278], [583, 625, 311, 209],
    [811, 221, 375, 263], [1318, 505, 224, 155], [409, 181, 249, 166], [1201, 825, 175, 278],
    [47, 221, 224, 155], [1045, 613, 186, 128], [1268, 167, 286, 193], [854, 902, 219, 148],
  ];
  const SHIFT_X = 687, SHIFT_Y = -102; // frame coords -> tile coords
  const TILE_W = 2300, TILE_H = 1400;  // repeat period (photos stay clear of the seams)

  const SLOTS = RAW.map(([x, y, w, h]) => ({ x: x + SHIFT_X, y: y + SHIFT_Y, w, h }));
  const PHOTOS = window.PHOTOS || [];

  const stage = document.getElementById("stage");
  const plane = document.getElementById("plane");
  const hint = document.getElementById("hint");

  function buildTile() {
    const tile = document.createElement("div");
    tile.className = "tile";
    SLOTS.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "photo";
      Object.assign(el.style, { left: s.x + "px", top: s.y + "px", width: s.w + "px", height: s.h + "px" });
      if (PHOTOS.length) {
        const img = document.createElement("img");
        img.src = PHOTOS[i % PHOTOS.length];
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        el.appendChild(img);
      } else {
        el.classList.add("empty");
        el.textContent = i + 1;
      }
      tile.appendChild(el);
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
  }

  // ---- input: keychain first, otherwise pan ----
  let mode = null, lastX = 0, lastY = 0, lastT = 0, moved = 0;
  const K = () => window.Keychain;

  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    if (document.body.classList.contains("birthday")) {
      if (K() && K().grab(e.clientX, e.clientY)) mode = "charm";
      return; // no panning on the birthday page
    }
    mode = "pan"; moved = 0;
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

  const end = () => {
    if (mode === "charm") K().release();
    if (mode === "pan" && performance.now() - lastT > 80) { vx = vy = 0; } // held still before letting go
    mode = null;
    stage.classList.remove("dragging");
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  // trackpad / mouse wheel pans both ways
  addEventListener("wheel", (e) => {
    e.preventDefault();
    if (document.body.classList.contains("birthday")) return;
    const dx = e.shiftKey ? e.deltaY : e.deltaX;
    const dy = e.shiftKey ? 0 : e.deltaY;
    ox -= dx; oy -= dy; vx = vy = 0;
    hint.classList.add("gone");
  }, { passive: false });

  // keyboard
  addEventListener("keydown", (e) => {
    if (document.body.classList.contains("birthday")) return;
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

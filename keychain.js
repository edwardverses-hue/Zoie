// Keychain in the middle: a 2D verlet chain you can grab, swing and throw.
// Charms are flat images (like Wildy Riftian's pre-rendered 3D charms).
(() => {
  // EDIT: one entry per charm. Add `src: "charms/name.png"` (transparent PNG) to use your own art.
  // Without src a simple placeholder is drawn so you can feel the motion.
  const CHARMS = [
    { label: "11.17", shape: "tag",   w: 70, h: 120, links: 3 },
    { label: "<3",    shape: "heart", w: 78, h: 72,  links: 5 },
    { label: "us",    shape: "disc",  w: 74, h: 74,  links: 2 },
  ];

  const LINK = 13;          // chain link length (px)
  const RING_R = 26;        // keyring radius
  const GRAVITY = 0.45;
  const DAMP = 0.985;

  const canvas = document.getElementById("keychain");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;

  const pts = [], cons = [], charms = [];
  const P = (x, y, pinned = false) => { const p = { x, y, px: x, py: y, pinned }; pts.push(p); return p; };
  const C = (a, b, len) => cons.push({ a, b, len });

  function anchorPos() {
    const small = innerWidth < 720;
    return { x: innerWidth / 2, y: innerHeight / 2 - (small ? 130 : 160) };
  }

  // build: fixed pin -> short chain -> ring -> one strand per charm
  let pin, ring;
  (function build() {
    const a = anchorPos();
    pin = P(a.x, a.y, true);
    let prev = pin;
    for (let i = 1; i <= 3; i++) { const p = P(a.x, a.y + i * LINK); C(prev, p, LINK); prev = p; }
    ring = P(a.x, a.y + 3 * LINK + RING_R); C(prev, ring, RING_R);
    ring.r = RING_R;

    const SCALE = innerWidth < 720 ? 1 : 1.35;
    CHARMS.forEach((c0, k) => {
      const c = { ...c0, w: c0.w * SCALE, h: c0.h * SCALE };
      const spread = (k - (CHARMS.length - 1) / 2) * 0.5;
      let p0 = ring, before = ring;
      for (let i = 0; i < c.links; i++) {
        const len = i === 0 ? RING_R : LINK;
        const p = P(ring.x + spread * 20, p0.y + len);
        C(p0, p, len); before = p0; p0 = p;
      }
      const charm = { ...c, end: p0, prev: before, img: null };
      if (c.src) { const im = new Image(); im.onload = () => (charm.img = im); im.src = c.src; }
      charms.push(charm);
    });
    // nudge so it settles with a gentle swing on load
    pts.forEach((p, i) => { if (!p.pinned) p.px -= 6 + i * 0.3; });
  })();

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const a = anchorPos(), dx = a.x - pin.x, dy = a.y - pin.y;
    pts.forEach((p) => { p.x += dx; p.y += dy; p.px += dx; p.py += dy; });
  }
  addEventListener("resize", resize);
  resize();

  // ---- physics ----
  let held = null, hx = 0, hy = 0, grabOff = { x: 0, y: 0 };
  function step() {
    for (const p of pts) {
      if (p.pinned || p === held) continue;
      const vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + GRAVITY;
    }
    if (held) { held.px = held.x; held.py = held.y; held.x += (hx - held.x) * 0.5; held.y += (hy - held.y) * 0.5; }
    for (let it = 0; it < 12; it++) {
      // charms bump into each other so they fan out instead of stacking
      for (let i = 0; i < charms.length; i++) for (let j = i + 1; j < charms.length; j++) {
        const A = charms[i], B = charms[j];
        const pa = charmPose(A), pb = charmPose(B);
        const dx = pb.cx - pa.cx, dy = pb.cy - pa.cy, d = Math.hypot(dx, dy) || 0.01;
        const min = (Math.max(A.w, A.h) + Math.max(B.w, B.h)) * 0.36;
        if (d < min) {
          const push = (min - d) * 0.25, nx = (dx || (j - i)) / d, ny = dy / d;
          if (A.end !== held) { A.end.x -= nx * push; A.end.y -= ny * push * 0.3; }
          if (B.end !== held) { B.end.x += nx * push; B.end.y += ny * push * 0.3; }
        }
      }
      for (const { a, b, len } of cons) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - len) / d;
        const aFixed = a.pinned || a === held, bFixed = b.pinned || b === held;
        if (aFixed && bFixed) continue;
        const wa = aFixed ? 0 : bFixed ? 1 : 0.5, wb = bFixed ? 0 : aFixed ? 1 : 0.5;
        a.x += dx * diff * wa; a.y += dy * diff * wa;
        b.x -= dx * diff * wb; b.y -= dy * diff * wb;
      }
    }
  }

  // charm transform: hangs from its end point, pointing along the last link
  function charmPose(c) {
    const ang = Math.atan2(c.end.y - c.prev.y, c.end.x - c.prev.x) - Math.PI / 2;
    const cx = c.end.x - Math.sin(ang) * (c.h / 2 + 4);
    const cy = c.end.y + Math.cos(ang) * (c.h / 2 + 4);
    return { ang, cx, cy };
  }

  // ---- drawing ----
  const METAL = "#e9edf5", METAL_DARK = "#9aa6bd";
  function drawLink(a, b) {
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 3.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = METAL; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function placeholder(c) {
    const { w, h } = c;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 2;
    ctx.beginPath();
    if (c.shape === "tag") { ctx.roundRect(-w / 2, -h / 2, w, h, w / 2); }
    else if (c.shape === "disc") { ctx.arc(0, 0, w / 2, 0, Math.PI * 2); }
    else { // heart
      const s = w / 2;
      ctx.moveTo(0, h / 2);
      ctx.bezierCurveTo(-s * 1.2, h / 6, -s, -h / 2, 0, -h / 5);
      ctx.bezierCurveTo(s, -h / 2, s * 1.2, h / 6, 0, h / 2);
    }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6f8fd8";
    ctx.font = `${Math.round(w * 0.42)}px "Reenie Beanie", cursive`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(c.label, 0, c.shape === "heart" ? -2 : 4);
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const { a, b } of cons) if (a !== ring && b !== ring) drawLink(a, b);
    // strands touch the ring's rim, not its centre
    for (const { a, b } of cons) if (a === ring || b === ring) {
      const o = a === ring ? b : a, d = Math.hypot(o.x - ring.x, o.y - ring.y) || 1;
      drawLink({ x: ring.x + (o.x - ring.x) / d * RING_R, y: ring.y + (o.y - ring.y) / d * RING_R }, o);
    }
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, RING_R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = METAL; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, RING_R, 0, Math.PI * 2); ctx.stroke();
    for (const c of charms) {
      const { ang, cx, cy } = charmPose(c);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.shadowColor = "rgba(20,40,90,0.25)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      if (c.img) ctx.drawImage(c.img, -c.w / 2, -c.h / 2, c.w, c.h); else placeholder(c);
      ctx.restore();
    }
  }

  (function loop() { step(); draw(); requestAnimationFrame(loop); })();

  // ---- API used by main.js so dragging works everywhere on the page ----
  window.Keychain = {
    grab(x, y) {
      for (const c of charms) {
        const { cx, cy } = charmPose(c);
        if (Math.hypot(x - cx, y - cy) < Math.max(c.w, c.h) / 2 + 8) {
          held = c.end; grabOff = { x: c.end.x - x, y: c.end.y - y }; hx = held.x; hy = held.y; return true;
        }
      }
      if (Math.hypot(x - ring.x, y - ring.y) < RING_R + 12) {
        held = ring; grabOff = { x: ring.x - x, y: ring.y - y }; hx = ring.x; hy = ring.y; return true;
      }
      return false;
    },
    move(x, y) { hx = x + grabOff.x; hy = y + grabOff.y; },
    release() { held = null; }, // verlet keeps the throw velocity
    swing() { pts.forEach((p, i) => { if (!p.pinned) p.px -= 4 + i * 0.25; }); }, // little sway on arrival
  };
})();

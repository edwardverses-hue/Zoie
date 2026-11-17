// Blind-box opening, after the "I turned myself into a blind box" prototype
// (instagram.com/reel/DfmiY23Pn9h, sumins.studio), studied frame by frame:
//   1. a six-sided kraft box in crinkled shrink-wrap; dragging over it tears the wrap
//      away piece by piece where you rub, and the bits fly off to the side
//   2. a small tab on a perforated line just under the lid: pulling it tears a strip
//      all the way round while the box turns
//   3. the lid lifts and tips off, warm light rays shine out
//   4. the six sides fall open flat, like a star
// Here, step 4 releases the gallery: photos fly up out of the box, and the page's own
// burst (intro.js) carries them out to their places on the map.
import * as THREE from "./vendor/three.module.min.js";

const R = 0.62;            // hexagon corner radius = side length
const HB = 2.2;            // body height
const LID_H = 0.26;        // lid skirt height
const BAND_Y = HB - LID_H - 0.075, BAND_W = 0.085;   // tear strip
const RIN = R * Math.cos(Math.PI / 6);
const KRAFT = "#b98e5e";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- textures
function noiseCanvas(w, h, base, seed, opts = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // mottling
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w, y = rnd() * h, r = 60 + rnd() * 260;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const d = rnd() < 0.5 ? "0,0,0" : "255,240,220";
    gr.addColorStop(0, `rgba(${d},${0.035 + rnd() * 0.05})`); gr.addColorStop(1, `rgba(${d},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fibres
  for (let i = 0; i < (opts.fibres || 4200); i++) {
    const x = rnd() * w, y = rnd() * h, l = 4 + rnd() * 16, a = rnd() * Math.PI;
    g.strokeStyle = rnd() < 0.55 ? `rgba(70,45,20,${0.05 + rnd() * 0.08})` : `rgba(255,236,205,${0.05 + rnd() * 0.08})`;
    g.lineWidth = 0.6 + rnd() * 0.8;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // grain
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
  return { c, g, rnd };
}

function marker(g, fn, w = 6) {
  // white paint-marker: slightly uneven stroke drawn twice
  g.save(); g.strokeStyle = "rgba(255,252,246,0.92)"; g.fillStyle = "rgba(255,252,246,0.92)";
  g.lineCap = "round"; g.lineJoin = "round";
  g.lineWidth = w; fn(g, 0); g.lineWidth = w * 0.7; g.globalAlpha = 0.55; fn(g, 1.2);
  g.restore();
}

// one canvas wrapped round all six sides (U runs right-to-left round the box),
// so the drawing can cross a fold like the reel's
function sideTexture() {
  const W = 3072, H = Math.round(3072 * HB / (6 * R));
  const { c, g } = noiseCanvas(W, H, KRAFT, 3);
  const px = (u) => u * W, py = (yWorld) => (1 - yWorld / HB) * H;
  // fold shading at the corners
  for (let k = 0; k <= 6; k++) {
    const x = px(k / 6), gr = g.createLinearGradient(x - 40, 0, x + 40, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(60,35,10,0.10)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - 40, 0, 80, H);
  }
  // perforation: dashed lines both sides of the tear strip, all the way round
  g.strokeStyle = "rgba(70,45,22,0.55)"; g.lineWidth = 2.2; g.setLineDash([9, 7]);
  for (const yy of [BAND_Y + BAND_W / 2, BAND_Y - BAND_W / 2]) { g.beginPath(); g.moveTo(0, py(yy)); g.lineTo(W, py(yy)); g.stroke(); }
  g.setLineDash([]);
  // small chevrons pointing to the tab (corner 0 = right end of the canvas)
  g.fillStyle = "rgba(70,45,22,0.6)"; g.font = "bold 22px sans-serif";
  g.fillText("› › ›", W - 120, py(BAND_Y) + 8);

  // ---- front art (placeholder until Edward's doodle): her name in white paint marker
  const fx = px(4.5 / 6);                       // centre of the front face
  g.font = `400 ${Math.round(W * 0.115)}px "Reenie Beanie", cursive`;
  g.textAlign = "center"; g.textBaseline = "middle";
  marker(g, (gg, j) => {
    gg.save(); gg.translate(fx + j, py(HB * 0.56) + j); gg.rotate(-0.12);
    gg.strokeText("zoie", 0, 0); gg.fillText("zoie", 0, 0); gg.restore();
  }, 5);
  marker(g, (gg, j) => {            // hand-drawn heart, crossing onto the next face
    gg.save(); gg.translate(fx + W * 0.115 + j, py(HB * 0.7) + j); gg.rotate(0.25);
    gg.beginPath(); gg.moveTo(0, 46);
    gg.bezierCurveTo(-70, -6, -40, -62, 0, -24); gg.bezierCurveTo(40, -66, 76, -4, 0, 46); gg.stroke(); gg.restore();
  }, 9);
  g.font = `400 ${Math.round(W * 0.05)}px "Reenie Beanie", cursive`;
  marker(g, (gg, j) => {
    gg.save(); gg.translate(fx - W * 0.02 + j, py(HB * 0.3) + j); gg.rotate(-0.06);
    gg.strokeText("11.17", 0, 0); gg.fillText("11.17", 0, 0); gg.restore();
  }, 3);

  // ---- back: small print, barcode (like the reel's back face)
  const bx = px(1.5 / 6) - 150, by = py(0.42);
  g.fillStyle = "rgba(40,25,10,0.75)";
  for (let i = 0; i < 46; i++) { const w = [2, 3, 5][i % 3] + (i * 7 % 3); g.fillRect(bx + i * 6.2, by, w, 70); }
  g.font = "16px monospace"; g.fillText("1117 2026 0000 1", bx + 140, by + 92);
  g.font = "15px sans-serif"; g.textAlign = "left"; g.fillStyle = "rgba(40,25,10,0.6)";
  ["BLIND BOX · 1 OF 1", "CONTENTS: OUR PHOTOS", "AGES: ONLY ZOIE", "OPEN WITH CARE"].forEach((t, i) => g.fillText(t, bx, by - 140 + i * 24));
  return c;
}

function plainKraft(w, h, seed, base = KRAFT) { return noiseCanvas(w, h, base, seed, { fibres: 1600 }).c; }

function crinkleNormal() {
  // crinkled-film normal map: random creases
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d"); g.fillStyle = "rgb(128,128,255)"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, l = 30 + Math.random() * 140, a = Math.random() * Math.PI;
    const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
    g.strokeStyle = `rgba(${128 + nx * 90},${128 + ny * 90},230,0.5)`; g.lineWidth = 1 + Math.random() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    g.strokeStyle = `rgba(${128 - nx * 90},${128 - ny * 90},230,0.5)`;
    g.beginPath(); g.moveTo(x + nx * 3, y + ny * 3); g.lineTo(x + nx * 3 + Math.cos(a) * l, y + ny * 3 + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

function raysTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d"); g.translate(256, 256);
  const core = g.createRadialGradient(0, 0, 0, 0, 0, 256);
  core.addColorStop(0, "rgba(255,236,170,1)"); core.addColorStop(0.25, "rgba(255,210,120,0.55)"); core.addColorStop(1, "rgba(255,190,90,0)");
  g.fillStyle = core; g.fillRect(-256, -256, 512, 512);
  for (let i = 0; i < 22; i++) {
    g.rotate((Math.PI * 2) / 22 + (Math.random() - 0.5) * 0.12);
    const w = 6 + Math.random() * 16;
    const gr = g.createLinearGradient(0, 0, 0, -256);
    gr.addColorStop(0, "rgba(255,226,150,0.85)"); gr.addColorStop(1, "rgba(255,200,110,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(-w / 6, 0); g.lineTo(-w, -256); g.lineTo(w, -256); g.lineTo(w / 6, 0); g.fill();
  }
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------- scene
let renderer, scene, camera, canvas, raf = 0, state = null;

function setup() {
  canvas = document.createElement("canvas");
  canvas.id = "blindbox";
  document.body.appendChild(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const small = Math.min(innerWidth, innerHeight) < 600;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));   // phones: less to draw per frame
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  // soft studio environment for the plastic's reflections
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x9aa6c0, side: THREE.BackSide }));
  env.add(room);
  for (const [x, y, z, sx, sy, sz, k] of [[0, 5.8, 0, 10, 0.1, 10, 2.6], [-9.8, 2.5, 1.5, 0.1, 6, 7, 1.7], [9.8, 3, -2, 0.1, 5, 6, 1.3]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k) }));
    p.position.set(x, y, z); env.add(p);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fb0ea, 0.55));
  const key = new THREE.DirectionalLight(0xfff1dd, 2.4);
  key.position.set(4.2, 6.5, 4.6); key.castShadow = true;
  key.shadow.mapSize.set(small ? 512 : 1024, small ? 512 : 1024); key.shadow.radius = 6; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdbe6ff, 0.45); fill.position.set(-5, 2.5, 1.5); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onDown);
  addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  addEventListener("pointercancel", onUp);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // box (with lid) fills ~52% of the height, or 62% of a narrow screen's width
  const tall = HB + 0.1, wide = 2 * R;
  const fov = (camera.fov * Math.PI) / 180;
  const dH = (tall / 0.52) / 2 / Math.tan(fov / 2);
  const dW = (wide / 0.36) / 2 / Math.tan(fov / 2) / camera.aspect;
  const d = Math.max(dH, dW);
  camera.position.set(0, HB * 0.62 + d * 0.16, d);
  camera.lookAt(0, HB * 0.47, 0);
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- the box
function makeBox() {
  const root = new THREE.Group();           // turns while the strip is pulled
  const sideCanvas = sideTexture();
  const sideTex = new THREE.CanvasTexture(sideCanvas); sideTex.colorSpace = THREE.SRGBColorSpace; sideTex.anisotropy = 8;
  const innerTex = new THREE.CanvasTexture(plainKraft(512, 1024, 7, "#c9a273")); innerTex.colorSpace = THREE.SRGBColorSpace;
  const lidTex = new THREE.CanvasTexture(plainKraft(1024, 1024, 11)); lidTex.colorSpace = THREE.SRGBColorSpace;

  const panels = [];
  for (let k = 0; k < 6; k++) {
    const phi = ((60 * k + 30) * Math.PI) / 180;           // outward normal of face k
    const pivot = new THREE.Group();
    pivot.position.set(RIN * Math.cos(phi), 0, RIN * Math.sin(phi));
    pivot.rotation.order = "YXZ"; pivot.rotation.y = Math.PI / 2 - phi;
    const t = sideTex.clone(); t.needsUpdate = true; t.repeat.set(1 / 6, 1); t.offset.set((5 - k) / 6, 0);
    const out = new THREE.Mesh(new THREE.PlaneGeometry(R, HB), new THREE.MeshStandardMaterial({ map: t, roughness: 0.86, envMapIntensity: 0.35 }));
    out.position.y = HB / 2; out.castShadow = true; out.receiveShadow = true;
    const inn = new THREE.Mesh(new THREE.PlaneGeometry(R, HB), new THREE.MeshStandardMaterial({ map: innerTex, roughness: 0.9, side: THREE.BackSide, envMapIntensity: 0.3 }));
    inn.position.set(0, HB / 2, -0.004);
    pivot.add(out, inn); root.add(pivot); panels.push(pivot);
  }
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 6), new THREE.MeshStandardMaterial({ map: innerTex, roughness: 0.9 }));
  bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.002; bottom.receiveShadow = true; root.add(bottom);

  // lid: top + skirt, a hair wider than the body
  const lid = new THREE.Group(); const LR = R * 1.035, LRIN = LR * Math.cos(Math.PI / 6);
  const lidMat = new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.84, envMapIntensity: 0.35 });
  const top = new THREE.Mesh(new THREE.CircleGeometry(LR, 6), lidMat);
  top.rotation.x = -Math.PI / 2; top.position.y = LID_H; top.castShadow = true; lid.add(top);
  for (let k = 0; k < 6; k++) {
    const phi = ((60 * k + 30) * Math.PI) / 180;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(LR, LID_H), lidMat);
    s.position.set(LRIN * Math.cos(phi), LID_H / 2, LRIN * Math.sin(phi)); s.rotation.y = Math.PI / 2 - phi; s.castShadow = true;
    const si = s.clone(); si.material = new THREE.MeshStandardMaterial({ map: innerTex, side: THREE.BackSide, roughness: 0.9 });
    lid.add(s, si);
  }
  lid.position.y = HB - LID_H + 0.002;
  root.add(lid);

  // shrink-wrap: alpha map we paint holes into where she rubs
  const ac = document.createElement("canvas"); ac.width = 512; ac.height = 512;
  const ag = ac.getContext("2d"); ag.fillStyle = "#fff"; ag.fillRect(0, 0, 512, 512);
  const alphaTex = new THREE.CanvasTexture(ac);
  const wrapMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7ff, transparent: true, opacity: 0.3, roughness: 0.12, metalness: 0,
    normalMap: crinkleNormal(), normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.9,
    alphaMap: alphaTex, depthWrite: false, side: THREE.DoubleSide,
  });
  const wrapGeo = new THREE.CylinderGeometry(R * 1.07, R * 1.08, HB + 0.1, 6, 24, true);
  // gentle bulges/wrinkles so it reads as film, not glass
  const pos = wrapGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + 0.025 * Math.sin(y * 9 + x * 5) + 0.018 * Math.sin(y * 23 + z * 11);
    pos.setXYZ(i, x * n, y, z * n);
  }
  wrapGeo.computeVertexNormals();
  const wrap = new THREE.Mesh(wrapGeo, wrapMat);
  wrap.position.y = (HB + 0.1) / 2 - 0.02; wrap.rotation.y = Math.PI / 6; wrap.renderOrder = 2;
  const wrapTop = new THREE.Mesh(new THREE.CircleGeometry(R * 1.1, 6), wrapMat.clone());
  wrapTop.material.alphaMap = null; wrapTop.rotation.x = -Math.PI / 2; wrapTop.position.y = HB + 0.09; wrapTop.renderOrder = 2;
  root.add(wrap, wrapTop);

  // glow inside (shown when the lid comes off)
  const glow = new THREE.PointLight(0xffc977, 0, 4, 1.6); glow.position.set(0, HB * 0.75, 0); root.add(glow);
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: raysTexture(), blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  rays.position.set(0, HB * 0.95, 0); rays.scale.set(0.1, 0.1, 1); root.add(rays);

  scene.add(root);

  // tear strip: a ribbon rebuilt every frame (world space)
  const ribbonMat = new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.35 });
  const ribbon = new THREE.Mesh(new THREE.BufferGeometry(), ribbonMat); ribbon.castShadow = true; scene.add(ribbon);

  return { root, panels, lid, wrap, wrapTop, wrapMat, ac, ag, alphaTex, glow, rays, ribbon, textures: [sideTex, innerTex, lidTex, alphaTex] };
}

// point on the strip's path, s in [0, 6R], starting at corner 0, local coords
const PERIM = 6 * R;
function perimPoint(s, rr) {
  const k = Math.floor(s / R) % 6, f = (s - k * R) / R;
  const a0 = (60 * k * Math.PI) / 180, a1 = (60 * (k + 1) * Math.PI) / 180;
  return new THREE.Vector3(rr * ((1 - f) * Math.cos(a0) + f * Math.cos(a1)), 0, rr * ((1 - f) * Math.sin(a0) + f * Math.sin(a1)));
}

function buildRibbon(st) {
  const rr = R * 1.012, y = BAND_Y, pts = [];
  const s0 = st.tear * PERIM;
  const rot = st.root.rotation.y, cos = Math.cos(rot), sin = Math.sin(rot);
  const toWorld = (p) => new THREE.Vector3(p.x * cos + p.z * sin, y + p.y, -p.x * sin + p.z * cos);
  // pulled-out piece: from the tear point out to the right, sagging a little
  const tp = toWorld(perimPoint(s0, rr));
  const pull = 0.13 + Math.min(st.tear * PERIM, 0.75);
  const dir = new THREE.Vector3(1, 0, 0.35).normalize();
  for (let i = 12; i >= 1; i--) {
    const d = (pull * i) / 12;
    pts.push(new THREE.Vector3(tp.x + dir.x * d, tp.y - 0.05 * d * d + st.wiggle * Math.sin(i) * 0.01, tp.z + dir.z * d));
  }
  // still attached: the rest of the way round
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const s = s0 + ((PERIM - s0) * i) / steps;
    if (s >= PERIM - 1e-4 && i === steps && s0 < 1e-4) break;
    pts.push(toWorld(perimPoint(Math.min(s, PERIM - 1e-4), rr)));
  }
  const n = pts.length, P = new Float32Array(n * 2 * 3), U = new Float32Array(n * 2 * 2), I = [];
  let len = 0;
  for (let i = 0; i < n; i++) {
    if (i) len += pts[i].distanceTo(pts[i - 1]);
    P.set([pts[i].x, pts[i].y + BAND_W / 2, pts[i].z, pts[i].x, pts[i].y - BAND_W / 2, pts[i].z], i * 6);
    U.set([len / 1.2, 0.52, len / 1.2, 0.48], i * 4);
    if (i) { const a = (i - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
  g.setIndex(I); g.computeVertexNormals();
  st.ribbon.geometry.dispose(); st.ribbon.geometry = g;
}

// ---------------------------------------------------------------- interaction
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
const frags = [];

function hint(text) {
  const el = document.getElementById("bb-hint");
  if (!el) return;
  el.classList.remove("on");
  clearTimeout(hint.t);
  hint.t = setTimeout(() => { el.textContent = text; if (text) el.classList.add("on"); }, text ? 260 : 0);
}

function onDown(e) {
  if (!state || state.done) return;
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  down = { x: e.clientX, y: e.clientY };
  rub(e.clientX, e.clientY);
}
function onMove(e) {
  if (!state || !down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y; down.x = e.clientX; down.y = e.clientY;
  if (state.stage === "wrap") rub(e.clientX, e.clientY);
  else if (state.stage === "tab") {
    // any drag pulls; a drag to the right (the tab's side) pulls faster
    const m = Math.hypot(dx, dy), k = dx > 0 ? 1 : 0.6;
    state.tearTarget = Math.min(1, state.tearTarget + (m * k) / (Math.min(innerWidth, innerHeight) * 3.4));
    state.wiggle = Math.min(1, state.wiggle + m * 0.02);
  }
}
function onUp() { down = null; }

function rub(x, y) {
  if (state.stage !== "wrap") return;
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(state.wrap, false)[0];
  if (!hit || !hit.uv) return;
  const g = state.ag, u = hit.uv.x * 512, v = (1 - hit.uv.y) * 512;
  g.globalCompositeOperation = "destination-out";
  for (const du of [0, 512, -512]) {           // wrap round the seam
    g.beginPath(); g.ellipse(u + du, v, 58 + Math.random() * 16, 52 + Math.random() * 14, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalCompositeOperation = "source-over";
  state.alphaTex.needsUpdate = true;
  // torn-off bits fly away to the side
  for (let i = 0; i < 3; i++) spawnFrag(hit.point);
  state.rubbed++;
  if (state.rubbed % 4 === 0) {               // how much is left?
    // only count the half of the wrap facing her (u in 0-0.25 and 0.75-1 faces the camera)
    const d = g.getImageData(0, 0, 512, 512).data; let on = 0, all = 0;
    for (let y = 0; y < 512; y += 4) for (let x = 0; x < 512; x += 4) {
      if (x > 128 && x < 384) continue;
      all++; on += d[(y * 512 + x) * 4 + 3] > 128;
    }
    state.wrapLeft = on / all;
    if (state.wrapLeft < 0.45) stripWrap();
  }
}

function spawnFrag(p) {
  const s = 0.05 + Math.random() * 0.1;
  const geo = new THREE.PlaneGeometry(s, s * (0.6 + Math.random()), 2, 2);
  const a = geo.attributes.position; for (let i = 0; i < a.count; i++) a.setZ(i, (Math.random() - 0.5) * s * 0.5);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf4f7ff, transparent: true, opacity: 0.6, roughness: 0.1, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
  m.position.copy(p);
  m.userData = { v: new THREE.Vector3(1.4 + Math.random() * 1.6, 0.6 + Math.random() * 1.4, (Math.random() - 0.3) * 1.2), w: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9), life: 0 };
  scene.add(m); frags.push(m);
}

function stripWrap() {
  if (state.stage !== "wrap") return;
  state.stage = "wrapping-off";
  for (let i = 0; i < 26; i++) spawnFrag(new THREE.Vector3((Math.random() - 0.5) * R * 2, Math.random() * HB, R * 0.9).applyMatrix4(state.root.matrixWorld));
  state.wrapFade = 1;
  hint("");
  setTimeout(() => { if (!state || state.done) return; state.stage = "tab"; hint("drag and pull the tab"); }, 650);
}

// ---------------------------------------------------------------- timeline
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const bounce = (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };

function openUp(now) {
  state.stage = "opening"; state.t0 = now; hint("");
}

// photos that fly out of the box: loaded while she unwraps it, so they're ready
let preload = [];
function preloadCards() {
  const items = (window.GALLERY_MEDIA || []).filter((m) => m.thumb && !m.loop);
  const loader = new THREE.TextureLoader();
  preload = items.slice().sort(() => Math.random() - 0.5).slice(0, 14).map((m) => {
    const t = loader.load(m.thumb, (tx) => { if (renderer) renderer.initTexture(tx); });   // GPU upload now, not mid-burst
    t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}

function photoBurst() {
  if (state.cards) return;
  const ready = preload.filter((t) => t.image && t.image.width);
  state.cards = ready.map((t, i) => {
    const pick = ready;
    const card = new THREE.Group(); card.scale.set(t.image.width / t.image.height, 1, 1);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t }));
    ph.position.z = 0.002; card.add(back, ph);
    const holder = new THREE.Group(); holder.add(card);
    holder.position.set(0, HB * 0.5, 0); holder.scale.setScalar(0.001); holder.visible = false;
    const a = (i / ready.length) * Math.PI * 2 + Math.random() * 0.4;
    holder.userData = {
      to: new THREE.Vector3(Math.cos(a) * (1.6 + Math.random() * 2.2), HB * 0.62 + Math.sin(a) * (1.2 + Math.random() * 1.4), 2.6 + Math.random() * 2.6),
      spin: (Math.random() - 0.5) * 0.5, delay: i * 0.012, size: 1.1 + Math.random() * 0.7,
    };
    scene.add(holder);
    return holder;
  });
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!state) return;
  const dt = Math.min(0.05, (now - (state.last || now)) / 1000); state.last = now;
  const st = state;

  // idle: a slow turn so the box reads as an object, like the reel's first beats
  if (st.stage === "wrap" || st.stage === "wrapping-off" || (st.stage === "tab" && st.tearTarget === 0)) {
    st.idle += dt;
    st.root.rotation.y = Math.sin(st.idle * 0.6) * 0.12;
  }
  if (st.wrapFade !== undefined && st.wrapFade > 0) {
    st.wrapFade = Math.max(0, st.wrapFade - dt * 2.2);
    st.wrapMat.opacity = 0.3 * st.wrapFade; st.wrapTop.material.opacity = 0.3 * st.wrapFade;
    st.wrap.scale.setScalar(1 + (1 - st.wrapFade) * 0.25); st.wrap.position.x = (1 - st.wrapFade) * 0.6;
    if (!st.wrapFade) { st.wrap.visible = st.wrapTop.visible = false; }
  }

  // tab: tear follows the drag; the box turns so the tear stays on the right
  if (st.stage === "tab") {
    st.tear += (st.tearTarget - st.tear) * Math.min(1, dt * 10);
    st.wiggle *= 0.9;
    const base = Math.sin(st.idle * 0.6) * 0.12;
    st.root.rotation.y = base * (1 - Math.min(1, st.tear * 8)) + st.tear * Math.PI * 2;
    if (st.tear > 0.15 && !st.cards) { photoBurst(); st.cards.forEach((c) => (c.visible = true)); renderer.compile(scene, camera); st.cards.forEach((c) => (c.visible = false)); }
    if (st.tear > 0.985) { st.tear = 1; st.stage = "strip-off"; st.stripT = 0; st.ribbonDrop = 0; }
  }
  if (st.stage === "tab" || st.stage === "wrap" || st.stage === "wrapping-off") buildRibbon(st);
  if (st.stage === "strip-off") {
    st.stripT += dt;
    st.ribbon.position.y -= (st.ribbonDrop += dt * 9) * dt; st.ribbon.rotation.z -= dt * 0.8;
    st.ribbon.material.transparent = true; st.ribbon.material.opacity = Math.max(0, 1 - st.stripT * 1.6);
    if (st.stripT > 0.35) openUp(now);
  }

  // opening: lid lifts and tips off, light pours out, sides fall open, photos fly out
  if (st.stage === "opening") {
    const t = (now - st.t0) / 1000;
    const lt = Math.min(1, t / 0.55);
    st.lid.position.y = HB - LID_H + ease(lt) * 0.55 + Math.max(0, t - 0.45) * Math.max(0, t - 0.45) * 9;
    st.lid.position.x = Math.max(0, t - 0.35) * 2.6;
    st.lid.rotation.z = -ease(Math.min(1, Math.max(0, t - 0.25) / 0.6)) * 1.1;
    const g = Math.min(1, Math.max(0, t - 0.2) / 0.45);
    st.glow.intensity = g * 6;
    st.rays.material.opacity = 0.55 * g * (t < 1.1 ? 1 : Math.max(0, 1 - (t - 1.1) * 2.5));
    const sc = 0.4 + ease(g) * 2.0; st.rays.scale.set(sc, sc, 1); st.rays.material.rotation = t * 0.15;
    st.panels.forEach((p, k) => {
      const pt = Math.min(1, Math.max(0, t - 0.75 - k * 0.025) / 0.62);
      p.rotation.x = bounce(pt) * (Math.PI / 2 - 0.004);
    });
    if (!st.cards) photoBurst();
    if (st.cards) {
      st.cards.forEach((c) => {
        const u = c.userData, ct = Math.min(1, Math.max(0, t - 1.05 - u.delay) / 0.75), e = ease(ct);
        c.position.lerpVectors(new THREE.Vector3(0, HB * 0.5, 0), u.to, e);
        c.scale.setScalar(0.001 + e * u.size);
        c.quaternion.copy(camera.quaternion); c.rotateZ(u.spin * (1 - e * 0.4));
      });
    }
    // hand over to the page: its photos burst out from the centre as the 3D ones arrive
    if (t > 1.35 && !st.handed) { st.handed = true; finish(true); }
  }

  // plastic bits
  for (let i = frags.length - 1; i >= 0; i--) {
    const f = frags[i], u = f.userData; u.life += dt;
    u.v.y -= 4.5 * dt; f.position.addScaledVector(u.v, dt);
    f.rotation.x += u.w.x * dt; f.rotation.y += u.w.y * dt; f.rotation.z += u.w.z * dt;
    f.material.opacity = Math.max(0, 0.6 * (1 - u.life / 1.1));
    if (u.life > 1.1) { scene.remove(f); f.geometry.dispose(); f.material.dispose(); frags.splice(i, 1); }
  }
  renderer.render(scene, camera);
}

let onDone = null;
function finish(fromOpen) {
  if (!state || state.done) return;
  state.done = true;
  hint("");
  document.body.classList.remove("boxing");
  if (onDone) onDone(fromOpen);
  canvas.classList.add("gone");
  setTimeout(() => {
    cancelAnimationFrame(raf); raf = 0;
    if (state) { scene.remove(state.root, state.ribbon); (state.cards || []).forEach((c) => scene.remove(c)); state.textures.forEach((t) => t.dispose()); }
    state = null;
    canvas.style.display = "none";
  }, fromOpen ? 650 : 50);
}

window.BlindBox = {
  async play(done) {
    onDone = done;
    // the box's writing uses the site's handwriting font: wait for it (max 2 s)
    try { await Promise.race([document.fonts.load('80px "Reenie Beanie"'), new Promise((r) => setTimeout(r, 2000))]); } catch (_) {}
    preloadCards();
    if (!renderer) setup();
    if (state) { scene.remove(state.root, state.ribbon); state = null; }
    canvas.style.display = "block"; canvas.classList.remove("gone");
    resize();
    const b = makeBox();
    // no shrink-wrap step (Edward's call): the box starts bare, straight to the tab
    b.wrap.visible = b.wrapTop.visible = false;
    state = Object.assign(b, { stage: "tab", idle: 0, tear: 0, tearTarget: 0, wiggle: 0, rubbed: 0, wrapLeft: 0, done: false });
    document.body.classList.add("boxing");
    hint("drag and pull the tab");
    if (!raf) raf = requestAnimationFrame(frame);
    if (reduce) finish(false);
  },
  skip() { finish(false); },
};
dispatchEvent(new Event("blindbox-ready"));

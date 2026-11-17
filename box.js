// Blind-box opening: a real Hirono single box, measured from Pop Mart's own render of the
// Hirono x Le Petit Prince box and retail / unboxing photos:
//   - tall box on a square base, 6.5 x 6.5 x 10 cm, cream paper with faint grey crumple
//   - front: wordmark, script title, one pencil-sketch figure; sides + back: a grid of
//     small sketches with captions; top: a small black label
//   - it opens at the top: a tuck flap hinged at the back edge, with a tuck tongue at the
//     front and two dust flaps under it
//   - inside: a white, matte, crinkled inner bag with crimped seals and a line drawing
// She lifts the flap, pulls the bag out, it tears open at the top and the photos fly out;
// the page's own opening (intro.js) takes it from there.
// Box art: tools/box/box_art.py (pencil sketches of their own photos, not Pop Mart's art).
import * as THREE from "./vendor/three.module.min.js";

const W = 1.3;             // width = depth (6.5 cm)
const HB = 2.0;            // height (10 cm)
const R = W / 2;           // kept for framing maths
const TONGUE = 0.30;       // tuck tongue
const DUST = 0.36;         // dust flap depth
const BW = W * 0.8, BH = 1.72, BAG_Y0 = 0.05;   // inner bag
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- textures
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  // soft studio environment for the plastic's reflections
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0xb4aea4, side: THREE.BackSide }));   // warm-neutral studio: cream paper stays cream
  env.add(room);
  for (const [x, y, z, sx, sy, sz, k] of [[0, 5.8, 0, 10, 0.1, 10, 2.6], [-9.8, 2.5, 1.5, 0.1, 6, 7, 1.7], [9.8, 3, -2, 0.1, 5, 6, 1.3]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k) }));
    p.position.set(x, y, z); env.add(p);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xcfc4b2, 0.5));
  const key = new THREE.DirectionalLight(0xfff1dd, 2.4);
  key.position.set(4.2, 6.5, 4.6); key.castShadow = true;
  key.shadow.mapSize.set(small ? 512 : 1024, small ? 512 : 1024); key.shadow.radius = 6; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf2ece2, 0.4); fill.position.set(-5, 2.5, 1.5); scene.add(fill);
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
  frameCamera(state ? Math.min(1, state.bagT * 1.1) : 0);
}
// k = 0: the box fills ~50% of the height (or 40% of a narrow screen's width);
// k = 1: framed higher and wider, so the pulled-out bag above it fits too
function frameCamera(k) {
  const tall = HB + 0.25 + k * (BH + 0.4), wide = W * 1.45;
  const fov = (camera.fov * Math.PI) / 180;
  const dH = (tall / (0.5 + k * 0.28)) / 2 / Math.tan(fov / 2);
  const dW = (wide / 0.40) / 2 / Math.tan(fov / 2) / camera.aspect;
  const d = Math.max(dH, dW);
  const cy = HB * 0.5 + k * (BH * 0.62);
  camera.position.set(0, cy + HB * 0.28 + d * 0.2, d);
  camera.lookAt(0, cy, 0);
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- the box
const texLoader = new THREE.TextureLoader();
function tex(name) {
  const t = texLoader.load(`assets/box/${name}.webp`, (tx) => { if (renderer) renderer.initTexture(tx); });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
let TEX = null;
function loadTextures() {
  if (TEX) return TEX;
  TEX = { front: tex("front"), right: tex("right"), back: tex("back"), left: tex("left"), top: tex("top"), inside: tex("inside") };
  TEX.inside.wrapS = TEX.inside.wrapT = THREE.RepeatWrapping;
  return TEX;
}
function paperMat(map, side = THREE.FrontSide) { return new THREE.MeshStandardMaterial({ map, roughness: 0.88, metalness: 0, envMapIntensity: 0.35, side }); }

// the inner bag's print: white, crimped seal bands top and bottom, a small line drawing
function bagCanvas() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#f3f2ef"; g.fillRect(0, 0, 512, 1024);
  // seal bands: fine vertical crimp
  for (const [y0, y1] of [[0, 70], [954, 1024]]) {
    g.fillStyle = "#e9e8e4"; g.fillRect(0, y0, 512, y1 - y0);
    g.strokeStyle = "rgba(120,118,112,0.35)"; g.lineWidth = 1.4;
    for (let x = 2; x < 512; x += 6) { g.beginPath(); g.moveTo(x, y0 + 6); g.lineTo(x, y1 - 6); g.stroke(); }
  }
  // tear notch arrow + "tear here" on the top seal, like the real bags' small print
  g.fillStyle = "rgba(60,58,55,0.8)"; g.font = "22px 'Patrick Hand SC', sans-serif"; g.textAlign = "center";
  g.fillText("tear here", 256, 108);
  // line drawing: a pencil heart, and her name small
  g.strokeStyle = "rgba(55,53,50,0.85)"; g.lineWidth = 5; g.lineJoin = g.lineCap = "round";
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const px = 256 + x * 6.2 + Math.sin(i * 1.7) * 1.5, py = 470 + y * 6.2 + Math.cos(i * 2.3) * 1.5;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke();
  g.font = "34px 'Patrick Hand SC', sans-serif"; g.fillText("for zoie", 256, 640);
  g.font = "20px 'Patrick Hand SC', sans-serif"; g.fillStyle = "rgba(60,58,55,0.6)";
  ["one bag of photos", "made by edward", "11.17.2026"].forEach((t, i) => g.fillText(t, 256, 860 + i * 26));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// serrated (pinked) edges of the heat seals
function bagAlpha() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 512;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#000";
  for (const top of [true, false]) {
    g.beginPath(); const y = top ? 0 : 512, s = top ? 1 : -1;
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 8) g.lineTo(x + 4, y + s * 5), g.lineTo(x + 8, y);
    g.closePath(); g.fill();
  }
  return new THREE.CanvasTexture(c);
}
// crumpled bag: a pillow (puffed in the middle, flat at the seals), creased
function bagGeometry(side) {
  const gx = 22, gy = 40, geo = new THREE.PlaneGeometry(BW, BH, gx, gy), p = geo.attributes.position;
  let seed = side > 0 ? 3 : 8; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const creases = Array.from({ length: 9 }, () => ({ a: rnd() * Math.PI, o: (rnd() - 0.5) * 1.6, k: 0.006 + rnd() * 0.012 }));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), u = x / BW + 0.5, v = y / BH + 0.5;
    const seal = Math.min(1, Math.max(0, Math.min(v - 0.06, 0.94 - v) / 0.1));          // 0 in the seal bands
    const puff = Math.pow(Math.sin(Math.PI * u), 0.7) * seal;
    let z = 0.17 * puff;
    for (const c of creases) { const d = x * Math.cos(c.a) + y * Math.sin(c.a) - c.o; z -= c.k * Math.exp(-d * d * 260) * puff * 3; }
    p.setXYZ(i, x * (1 - 0.07 * puff), y, side * z);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeBox() {
  const T = loadTextures();
  const root = new THREE.Group();
  const H2 = HB / 2, w2 = W / 2;
  const inMat = paperMat(T.inside, THREE.BackSide);
  // four walls: outside art, plain board inside
  const faces = [["front", 0], ["right", Math.PI / 2], ["back", Math.PI], ["left", -Math.PI / 2]];
  for (const [name, ry] of faces) {
    const wall = new THREE.Group(); wall.rotation.y = ry;
    const out = new THREE.Mesh(new THREE.PlaneGeometry(W, HB), paperMat(T[name]));
    out.position.set(0, H2, w2); out.castShadow = out.receiveShadow = true;
    const inn = new THREE.Mesh(new THREE.PlaneGeometry(W, HB), inMat);
    inn.position.set(0, H2, w2 - 0.004); inn.receiveShadow = true;
    wall.add(out, inn); root.add(wall);
  }
  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(W, W), paperMat(T.inside));
  bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.003; bottom.receiveShadow = true; root.add(bottom);

  // top flap, hinged on the back edge; tuck tongue on its front edge folds down inside the front wall
  const lid = new THREE.Group(); lid.position.set(0, HB, -w2);
  const lidTop = new THREE.Mesh(new THREE.PlaneGeometry(W, W), paperMat(T.top));
  lidTop.rotation.x = -Math.PI / 2; lidTop.position.set(0, 0.002, w2); lidTop.castShadow = true;
  const lidUnder = new THREE.Mesh(new THREE.PlaneGeometry(W, W), inMat);
  lidUnder.rotation.x = -Math.PI / 2; lidUnder.position.set(0, -0.002, w2);
  const tongue = new THREE.Group(); tongue.position.set(0, 0, W - 0.006);
  const tg = new THREE.Shape();                 // tuck tongue with rounded corners
  const tw = W * 0.97 / 2, r = 0.09;
  tg.moveTo(-tw, 0); tg.lineTo(-tw, -TONGUE + r); tg.quadraticCurveTo(-tw, -TONGUE, -tw + r, -TONGUE); tg.lineTo(tw - r, -TONGUE); tg.quadraticCurveTo(tw, -TONGUE, tw, -TONGUE + r); tg.lineTo(tw, 0);
  const tgeo = new THREE.ShapeGeometry(tg); const uv = tgeo.attributes.uv, tp = tgeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, tp.getX(i) / W + 0.5, tp.getY(i) / W + 0.5);
  const tongueM = new THREE.Mesh(tgeo, paperMat(T.inside, THREE.DoubleSide)); tongueM.castShadow = true;
  tongue.add(tongueM);
  lid.add(lidTop, lidUnder, tongue);
  root.add(lid);

  // dust flaps on the side walls, folded in under the lid
  const dust = [-1, 1].map((sx) => {
    const piv = new THREE.Group(); piv.position.set(sx * w2, HB - 0.006, 0);
    const sh = new THREE.Shape();             // trapezoid, tapered at the free edge
    const dd = W * 0.94 / 2;
    sh.moveTo(-dd, 0); sh.lineTo(-dd + 0.12, DUST); sh.lineTo(dd - 0.12, DUST); sh.lineTo(dd, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), paperMat(T.inside, THREE.DoubleSide));
    m.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;     // lies in the wall's plane, then folds in
    const fold = new THREE.Group(); fold.add(m); piv.add(fold); root.add(piv);
    return { piv, fold, sx };
  });

  // the inner bag
  const bag = new THREE.Group();
  const bagMat = new THREE.MeshStandardMaterial({ map: bagCanvas(), alphaMap: bagAlpha(), alphaTest: 0.5, roughness: 0.62, metalness: 0.05, envMapIntensity: 0.7, side: THREE.DoubleSide });
  const fGeo = bagGeometry(1), bGeo = bagGeometry(-1);
  const bf = new THREE.Mesh(fGeo, bagMat), bb = new THREE.Mesh(bGeo, bagMat);
  bf.castShadow = bb.castShadow = true;
  bag.add(bf, bb); bag.position.y = BAG_Y0 + BH / 2; root.add(bag);
  // the strip that tears off the top of the bag
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(BW, 0.13), bagMat); strip.position.y = BH / 2 - 0.065; strip.visible = false; bag.add(strip);

  // glow + rays out of the opened bag
  const glow = new THREE.PointLight(0xffd690, 0, 4, 1.6); bag.add(glow); glow.position.y = BH / 2 + 0.2;
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: raysTexture(), blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  rays.scale.set(0.1, 0.1, 1); rays.position.y = BH / 2 + 0.1; bag.add(rays);

  scene.add(root);
  return { root, lid, tongue, dust, bag, bf, bb, strip, glow, rays, textures: [bagMat.map, bagMat.alphaMap] };
}

// ---------------------------------------------------------------- interaction
let down = null;
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
}
function onMove(e) {
  if (!state || !down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y; down.x = e.clientX; down.y = e.clientY;
  const up = Math.max(0, -dy) + Math.abs(dx) * 0.15;           // lifting = dragging up
  const s = Math.min(innerWidth, innerHeight);
  if (state.stage === "lid") state.lidTarget = Math.min(1, state.lidTarget + up / (s * 0.45));
  else if (state.stage === "bag") state.bagTarget = Math.min(1, state.bagTarget + up / (s * 0.75));
}
function onUp() { down = null; }

// ---------------------------------------------------------------- timeline
const ease = (t) => 1 - Math.pow(1 - t, 3);
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
    holder.position.set(0, HB, 0); holder.scale.setScalar(0.001); holder.visible = false;
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
  st.idle += dt;
  // a slow turn so it reads as an object: front and right side, like the product shots
  const turn = -0.52 + Math.sin(st.idle * 0.55) * 0.14;
  st.root.rotation.y = turn * (st.stage === "lid" ? 1 : 1);

  // 1. the flap: follows the drag, springs open the last bit on its own
  if (st.stage === "lid" && st.lidTarget > 0.62) st.lidTarget = Math.min(1, st.lidTarget + dt * 2.2);
  st.lidT += (st.lidTarget - st.lidT) * Math.min(1, dt * 12);
  const L = st.lidT;
  st.lid.rotation.x = -L * 2.02;                                   // ~116 deg: rests leaning back
  // the tongue comes out of the box, then springs a little open from the flap
  st.tongue.rotation.x = -Math.min(1, Math.max(0, (L - 0.12) / 0.5)) * 0.95;   // 0 = hanging straight down inside the front wall
  // dust flaps: folded flat under the lid, spring up once the lid is past them
  st.dust.forEach((d) => {
    const k = Math.min(1, Math.max(0, (L - 0.25) / 0.45));
    // folded: rotated in to horizontal; open: standing up, tilted in a little
    d.fold.rotation.z = d.sx * (Math.PI / 2) * (1 - 0.78 * ease(k));
  });
  if (st.stage === "lid" && L > 0.97) { st.stage = "bag"; hint("pull out the bag"); }

  // 2. the bag: rises with the drag; the camera follows it up
  st.bagT += (st.bagTarget - st.bagT) * Math.min(1, dt * 10);
  const B = st.bagT;
  st.bag.position.y = BAG_Y0 + BH / 2 + (st.stage === "bag" || st.stage === "torn" ? 0.08 : 0) + ease(B) * (HB + 0.05);
  st.bag.rotation.z = Math.sin(st.idle * 2.1) * 0.02 * B;
  frameCamera(Math.min(1, B * 1.1));
  if (st.stage === "bag" && B > 0.97) { st.stage = "torn"; st.t0 = now; hint(""); st.strip.visible = true; }

  // 3. the top tears off, light comes out, the photos fly
  if (st.stage === "torn") {
    const t = (now - st.t0) / 1000;
    st.strip.position.x = t * 2.4; st.strip.position.y = BH / 2 - 0.065 + t * 1.4 - t * t * 3; st.strip.rotation.z = -t * 3;
    st.bf.scale.y = st.bb.scale.y = 0.93; st.bf.position.y = st.bb.position.y = -BH * 0.035;
    const g = Math.min(1, t / 0.35);
    st.glow.intensity = g * 5; st.rays.material.opacity = 0.5 * g;
    const sc = 0.4 + ease(g) * 2.2; st.rays.scale.set(sc, sc, 1); st.rays.material.rotation = t * 0.2;
    if (!st.cards) photoBurst();
    if (st.cards) {
      const from = new THREE.Vector3(); st.bag.getWorldPosition(from); from.y += BH * 0.45;
      st.cards.forEach((c) => {
        c.visible = true;
        const u = c.userData, ct = Math.min(1, Math.max(0, t - 0.12 - u.delay) / 0.75), e = ease(ct);
        c.position.lerpVectors(from, u.to, e);
        c.scale.setScalar(0.001 + e * u.size);
        c.quaternion.copy(camera.quaternion); c.rotateZ(u.spin * (1 - e * 0.4));
      });
    }
    if (t > 0.45 && !st.handed) { st.handed = true; finish(true); }
  }
  // build the photo cards once the bag is on its way, so the burst never stalls
  if (st.stage === "bag" && B > 0.3 && !st.cards) { photoBurst(); st.cards.forEach((c) => (c.visible = true)); renderer.compile(scene, camera); st.cards.forEach((c) => (c.visible = false)); }
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
    if (state) { scene.remove(state.root); (state.cards || []).forEach((c) => scene.remove(c)); state.textures.forEach((t) => t.dispose()); }
    state = null;
    canvas.style.display = "none";
  }, fromOpen ? 650 : 50);
}

window.BlindBox = {
  async play(done) {
    onDone = done;
    // the box's writing uses the site's handwriting font: wait for it (max 2 s)
    try { await Promise.race([document.fonts.load('30px "Patrick Hand SC"'), new Promise((r) => setTimeout(r, 2000))]); } catch (_) {}
    preloadCards();
    if (!renderer) setup();
    if (state) { scene.remove(state.root); state = null; }
    canvas.style.display = "block"; canvas.classList.remove("gone");
    const b = makeBox();
    state = Object.assign(b, { stage: "lid", idle: 0, lidT: 0, lidTarget: 0, bagT: 0, bagTarget: 0, done: false });
    resize();
    document.body.classList.add("boxing");
    hint("lift the lid");
    if (!raf) raf = requestAnimationFrame(frame);
    if (reduce) finish(false);
  },
  skip() { finish(false); },
};
dispatchEvent(new Event("blindbox-ready"));

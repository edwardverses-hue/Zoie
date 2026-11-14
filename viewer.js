// Tap a photo to see it bigger. Videos play in full here, with sound.
(() => {
  const viewer = document.getElementById("viewer");
  const fig = viewer.querySelector("figure");
  const list = () => window.GALLERY_MEDIA || [];
  let index = 0;

  function show(i) {
    const items = list();
    if (!items.length) return;
    index = (i + items.length) % items.length;
    const m = items[index];
    const old = fig.querySelector("video"); if (old) old.pause();
    fig.innerHTML = "";
    let el;
    if (m.video) {
      el = document.createElement("video");
      Object.assign(el, { src: m.video, controls: true, autoplay: true, playsInline: true });
      el.setAttribute("playsinline", "");
      if (m.thumb) el.poster = m.full || m.thumb;
    } else {
      el = document.createElement("img");
      // show the small one right away, swap to the big one when it's loaded
      el.src = m.thumb || m.full;
      if (m.full && m.full !== m.thumb) { const big = new Image(); big.onload = () => { if (el.isConnected) el.src = m.full; }; big.src = m.full; }
      el.alt = "";
      el.draggable = false;
    }
    fig.appendChild(el);
  }

  function open(i) { show(i); document.body.classList.add("viewing"); }
  function close() {
    document.body.classList.remove("viewing");
    const v = fig.querySelector("video"); if (v) v.pause();
  }

  viewer.querySelector(".close").addEventListener("click", close);
  viewer.querySelector(".prev").addEventListener("click", (e) => { e.stopPropagation(); show(index - 1); });
  viewer.querySelector(".next").addEventListener("click", (e) => { e.stopPropagation(); show(index + 1); });
  let swiped = false;
  viewer.addEventListener("click", (e) => { if (e.target === viewer && !swiped) close(); swiped = false; }); // tap outside the photo

  // swipe left/right to flip through
  let sx = null, sy = null;
  viewer.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; });
  viewer.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && e.target.tagName !== "VIDEO") { swiped = true; show(index + (dx < 0 ? 1 : -1)); }
    sx = sy = null;
  });

  addEventListener("keydown", (e) => {
    if (!document.body.classList.contains("viewing")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") show(index + 1);
    if (e.key === "ArrowLeft") show(index - 1);
  });

  window.Viewer = { open, close };
})();

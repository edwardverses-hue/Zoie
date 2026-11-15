// Two views on one page: #gallery (default) and #birthday (keychain).
(() => {
  const hint = document.getElementById("hint");
  const links = document.querySelectorAll("header a[data-view]");
  let first = true;
  function show() {
    const view = location.hash === "#birthday" ? "birthday" : "gallery";
    document.body.classList.toggle("birthday", view === "birthday");
    links.forEach((a) => a.classList.toggle("current", a.dataset.view === view));
    hint.textContent = view === "birthday" ? "" : "drag anywhere";
    if (!first) hint.classList.remove("gone");
    if (window.Keychain) window.Keychain.reset();
    first = false;
  }
  // opening "our gallery" (from the keychain, or clicking it again) replays the opening
  // ink loops: the stroke isn't scaled with the stretched SVG, so measure each loop's
  // real on-screen length for the draw-in dash
  const measureInk = () => document.querySelectorAll("header .ink path").forEach((p) => {
    const m = p.ownerSVGElement.getScreenCTM(); if (!m) return;
    const L = p.getTotalLength(); let len = 0, prev = null;
    for (let i = 0; i <= 60; i++) {
      const q = p.getPointAtLength((L * i) / 60), x = q.x * m.a + q.y * m.c, y = q.x * m.b + q.y * m.d;
      if (prev) len += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
    }
    p.style.setProperty("--len", Math.ceil(len + 4));
  });
  measureInk(); addEventListener("resize", measureInk);
  if (document.fonts) document.fonts.ready.then(measureInk);
  addEventListener("hashchange", () => { show(); if (location.hash !== "#birthday" && window.Intro) window.Intro.play(); });
  document.querySelector('header a[data-view="gallery"]').addEventListener("click", () => {
    if (location.hash === "#gallery" && window.Intro) window.Intro.play();   // same hash: no hashchange fires
  });
  show();
})();

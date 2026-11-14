// Hand-drawn heart cursor (mouse/trackpad only; phones keep normal touch).
// Over a photo it turns into a handwritten "open", while dragging it squishes flat,
// and over a charm on the birthday page it says "grab".
(() => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.documentElement.classList.add("heart-cursor");

  const el = document.createElement("div");
  el.id = "cursor";
  el.innerHTML = `
    <svg class="heart" width="34" height="32" viewBox="0 0 34 32" aria-hidden="true">
      <path d="M17.3 28.6c-.6-.4-4.9-3.4-8.6-7.2C5.1 17.8 2.4 14 2.6 9.9 2.8 5.8 6 2.7 9.7 2.9c3 .1 5.4 2.1 7.2 4.9.1.2.3.2.4 0 1.7-2.9 4.2-5.2 7.4-5.3 3.7-.1 6.7 2.9 6.6 6.9-.1 4.2-2.9 8-6.4 11.5-3.4 3.4-6.9 6.1-7.6 7.7"
        fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="label"></span>`;
  document.body.appendChild(el);
  const label = el.querySelector(".label");

  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, shown = false;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) { x = tx; y = ty; shown = true; el.classList.add("on"); }
    update(e.clientX, e.clientY);
  });
  document.addEventListener("mouseleave", () => { el.classList.remove("on"); shown = false; });
  addEventListener("pointerdown", () => el.classList.add("down"));
  addEventListener("pointerup", () => el.classList.remove("down"));
  addEventListener("pointercancel", () => el.classList.remove("down"));

  function setState(state, text = "") {
    if (el.dataset.state === state && label.textContent === text) return;
    el.dataset.state = state;
    label.textContent = text;
  }

  function update(px, py) {
    const body = document.body.classList;
    if (body.contains("viewing")) {
      const over = document.elementFromPoint(px, py);
      if (over && over.closest("button")) return setState("link");
      if (over && over.closest("#viewer figure")) return setState("heart");
      return setState("label", "close");
    }
    const t = document.elementFromPoint(px, py);
    if (t && t.closest("header a")) return setState("link");
    if (body.contains("birthday")) {
      return window.Keychain && window.Keychain.hits && window.Keychain.hits(px, py)
        ? setState("label", "grab") : setState("heart");
    }
    if (document.getElementById("stage").classList.contains("dragging")) return setState("heart");
    // photos have pointer-events on the slot, so hit-test them directly
    const slot = t && t.closest && t.closest(".photo[data-index]");
    return slot ? setState("label", "open") : setState("heart");
  }

  (function loop() {
    x += (tx - x) * 0.35; y += (ty - y) * 0.35;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(loop);
  })();
})();

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
  addEventListener("hashchange", () => { show(); if (location.hash !== "#birthday" && window.Intro) window.Intro.play(); });
  document.querySelector('header a[data-view="gallery"]').addEventListener("click", () => {
    if (location.hash === "#gallery" && window.Intro) window.Intro.play();   // same hash: no hashchange fires
  });
  show();
})();

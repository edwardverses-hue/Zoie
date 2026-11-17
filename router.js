// Two views on one page: #gallery (default) and #birthday (keychain). The way between them
// is the "click me!" under the title and the "back" on the keychain page (built in intro.js).
(() => {
  const hint = document.getElementById("hint");
  let first = true;
  function show() {
    const view = location.hash === "#birthday" ? "birthday" : "gallery";
    document.body.classList.toggle("birthday", view === "birthday");
    hint.textContent = view === "birthday" ? "" : "drag anywhere";
    if (!first) hint.classList.remove("gone");
    if (window.Keychain) window.Keychain.reset();
    // the gallery always opens centred on the headline, wherever she'd dragged it before
    if (view === "gallery" && window.Gallery) window.Gallery.reset();
    first = false;
  }
  // the blind box opening plays once, when she first enters the site (intro.js); switching
  // views afterwards just shows the gallery as it is
  addEventListener("hashchange", show);
  show();
})();

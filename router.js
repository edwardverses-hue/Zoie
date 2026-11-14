// Two views on one page: #gallery (default) and #birthday (keychain).
(() => {
  const hint = document.getElementById("hint");
  const links = document.querySelectorAll("header a[data-view]");
  let first = true;
  function show() {
    const view = location.hash === "#birthday" ? "birthday" : "gallery";
    document.body.classList.toggle("birthday", view === "birthday");
    links.forEach((a) => a.classList.toggle("current", a.dataset.view === view));
    hint.textContent = view === "birthday" ? "grab a charm" : "drag anywhere";
    if (!first) hint.classList.remove("gone");
    if (view === "birthday" && window.Keychain) window.Keychain.swing();
    first = false;
  }
  addEventListener("hashchange", show);
  show();
})();

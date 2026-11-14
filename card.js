// Card on the birthday page, after wildyriftian.com's About card:
// one charm hangs at a time and is swapped every ~1.03 s (their measured rate).
// The new charm swings in from the right with a springy overshoot while the old
// one flies off to the left; a handwritten label writes in for each charm.
(() => {
  // EDIT: label shown for each charm. Placeholders mirror the reference's words.
  // m: crop size and hanging point (fractions of the image), from the cut-outs.
  const CHARMS = [
    { src: "keychain/card/06photo.webp", label: "us, again", m: {"w": 366, "h": 646, "px": 0.5601, "py": 0.0124} },
    { src: "keychain/card/01motion.webp", label: "motion", m: {"w": 458, "h": 512, "px": 0.8384, "py": 0.0156} },
    { src: "keychain/card/02branding.webp", label: "Branding", m: {"w": 274, "h": 696, "px": 0.6606, "py": 0.0115} },
    { src: "keychain/card/03editorial.webp", label: "Editorial", m: {"w": 268, "h": 763, "px": 0.3396, "py": 0.0105} },
    { src: "keychain/card/04photoworks.webp", label: "Photo works", m: {"w": 343, "h": 769, "px": 0.1137, "py": 0.0104} },
    { src: "keychain/card/05illustration.webp", label: "Illustration", m: {"w": 374, "h": 450, "px": 0.1364, "py": 0.0178} },
  ];
  const HOLD = 1030;

  const hanger = document.querySelector("#bday .hanger");
  const label = document.querySelector("#bday .card-label");
  const scroller = document.getElementById("bday");
  CHARMS.forEach((c) => { const i = new Image(); i.src = c.src; });

  function make(c) {
    const img = document.createElement("img");
    img.src = c.src; img.alt = ""; img.draggable = false;
    // fit the whole charm inside the cell, centred on its body (not on its wire)
    const cell = hanger.parentElement;
    const maxH = cell.clientHeight * 0.84, maxW = cell.clientWidth * 0.78;
    const k = Math.min(maxH / c.m.h, maxW / c.m.w);
    const h = c.m.h * k, w = c.m.w * k;
    Object.assign(img.style, {
      height: h + "px", width: w + "px",
      left: -w / 2 + "px", top: -c.m.py * h + "px",
      transformOrigin: `${c.m.px * 100}% ${c.m.py * 100}%`,
    });
    hanger.appendChild(img);
    return img;
  }

  let i = 0, cur = null, timer = null, running = false;
  function step() {
    const c = CHARMS[i % CHARMS.length]; i++;
    if (cur) {
      const old = cur;
      old.animate([{ transform: "translateX(0) rotate(0deg)" }, { transform: "translateX(-1100px) rotate(45deg)" }],
        { duration: 600, easing: "cubic-bezier(.55,0,.8,.4)", fill: "forwards" }).onfinish = () => old.remove();
    }
    cur = make(c);
    // spring in from the right (their curve: +240 px, -45 deg, 0.92 scale -> overshoot -> rest)
    cur.animate([
      { transform: "translateX(260px) rotate(-45deg) scale(.92)", offset: 0 },
      { transform: "translateX(-8px) rotate(9deg) scale(1.01)", offset: 0.45 },
      { transform: "translateX(3px) rotate(-4deg) scale(1)", offset: 0.68 },
      { transform: "translateX(-1px) rotate(1.5deg) scale(1)", offset: 0.85 },
      { transform: "translateX(0) rotate(0deg) scale(1)", offset: 1 },
    ], { duration: 950, easing: "cubic-bezier(.2,.7,.3,1)" });
    // handwriting: reveal the label left to right
    label.textContent = c.label;
    label.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
      { duration: 520, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
    timer = setTimeout(step, HOLD);
  }

  // only cycle while the card is on screen and the birthday page is open
  const grid = document.querySelector("#bday .card-grid");
  let visible = false;
  const check = () => {
    const on = visible && document.body.classList.contains("birthday");
    if (on && !running) { running = true; step(); }
    if (!on && running) { running = false; clearTimeout(timer); }
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; check(); }, { threshold: 0.25 }).observe(grid);
  addEventListener("hashchange", check);

  // keychain drifts up at 1/10 of the scroll, as in the reference hero
  const kc = document.getElementById("keychain");
  scroller.addEventListener("scroll", () => {
    kc.style.marginTop = -scroller.scrollTop * 0.1 + "px";
    const card = document.querySelector("#bday .bday-card").getBoundingClientRect();
    document.body.classList.toggle("on-card", card.top < 70 && card.bottom > 40);
  }, { passive: true });
  window.BdayReset = () => { scroller.scrollTop = 0; kc.style.marginTop = "0px"; document.body.classList.remove("on-card"); };
})();

/* The shared light / dark / auto setting. Every one of the owner's pages is on the same origin, so one
   localStorage value ("theme": light, dark, auto; absent means auto) covers them all. The inline script in
   <head> has already put data-theme-mode (what was chosen) and data-theme (what is showing) on <html>;
   this file wires the segmented control, keeps the attributes in step, and announces every change as a
   "themechange" event on window so the canvas and anything else that caches colours can re-read them.
   A change made on another page arrives as a "storage" event and applies live. */
(function (root) {
  "use strict";
  var doc = root.document, html = doc.documentElement, KEY = "theme";
  var mq = root.matchMedia ? root.matchMedia("(prefers-color-scheme: dark)") : null;
  var seg = doc.querySelector(".theme-seg");
  var P = root.MT_PREFS, S = root.MT_SFX;
  function clean(m) { return m === "light" || m === "dark" ? m : "auto"; }
  function resolve(m) { return m === "auto" ? (mq && mq.matches ? "dark" : "light") : m; }
  var mode = clean(html.getAttribute("data-theme-mode")), theme = resolve(mode);

  function paint() {
    html.setAttribute("data-theme-mode", mode); html.setAttribute("data-theme", theme); html.style.colorScheme = theme;
    if (!seg) return;
    seg.setAttribute("data-mode", mode);
    [].forEach.call(seg.querySelectorAll("[data-theme-mode]"), function (b) {
      var on = b.getAttribute("data-theme-mode") === mode;
      b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1;
    });
  }
  function announce() { root.dispatchEvent(new CustomEvent("themechange", { detail: { mode: mode, theme: theme } })); }
  function animated() { return !!(P && P.motion()) && !(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  // run `commit` inside a short circle reveal that opens from `origin` (a View Transition), or just commit
  function transition(commit, origin) {
    if (!animated() || !doc.startViewTransition) { commit(); return; }
    var r = (origin || seg || doc.body).getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var radius = Math.hypot(Math.max(x, root.innerWidth - x), Math.max(y, root.innerHeight - y)) + 40;
    try {
      var vt = doc.startViewTransition(commit);
      vt.ready.then(function () {
        html.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
          { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both", pseudoElement: "::view-transition-new(root)" });
      }).catch(function () {});
    } catch (e) { commit(); }
  }
  function apply(nextMode, origin, persist, cue) {
    nextMode = clean(nextMode);
    if (nextMode === mode) return;
    mode = nextMode;
    if (persist) { try { localStorage.setItem("theme", mode); } catch (e) {} }
    var next = resolve(mode);
    if (next === theme) { paint(); announce(); return; }
    transition(function () { theme = next; paint(); announce(); }, origin);
    if (cue && S) S.play("theme");
  }

  paint();
  if (seg) {
    seg.addEventListener("click", function (e) { var b = e.target.closest("[data-theme-mode]"); if (b) apply(b.getAttribute("data-theme-mode"), b, true, true); });
    seg.addEventListener("keydown", function (e) {
      var k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
      var all = [].slice.call(seg.querySelectorAll("[data-theme-mode]")), n = all[(all.indexOf(doc.activeElement) + k + all.length) % all.length];
      e.preventDefault(); n.focus(); apply(n.getAttribute("data-theme-mode"), n, true, true);
    });
  }
  // another page of this site changed the choice: apply it here, live, without writing it back
  root.addEventListener("storage", function (e) {
    if (e.key !== null && e.key !== KEY) return;
    var m; try { m = localStorage.getItem("theme"); } catch (x) {}
    apply(clean(m), null, false, false);
  });
  // in auto, follow the system
  if (mq && mq.addEventListener) mq.addEventListener("change", function () {
    if (mode !== "auto" || resolve("auto") === theme) return;
    transition(function () { theme = resolve("auto"); paint(); announce(); }, seg && seg.querySelector('[data-theme-mode="auto"]'));
  });
  root.MT_THEME = { mode: function () { return mode; }, theme: function () { return theme; }, set: function (m) { apply(m, null, true, false); } };
})(window);

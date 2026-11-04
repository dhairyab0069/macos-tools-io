/* The page's three switches (Sound, Motion, Effects) and the Quiet-everything button.
   Defaults on a first visit: sound on, motion on (off only if the system asks for reduced motion),
   effects on. Saved choices use fresh keys, so older saved values cannot carry over.
   The rules are plain functions (tested with node); the DOM wiring runs only in a browser.
   Everything else on the page reads MT_PREFS (or the data-sound / data-motion / data-fx
   attributes on <html>) instead of keeping its own flag. */
(function (root) {
  "use strict";
  var KEYS = { sound: "mt2-sound", motion: "mt2-motion", fx: "mt2-fx" };
  var NAMES = { sound: "Sound", motion: "Motion", fx: "Effects" };

  // stored: {sound, motion, fx} each "on", "off" or null (never chosen).
  function resolve(stored, reduced) {
    stored = stored || {};
    return { sound: stored.sound !== "off", motion: !reduced && stored.motion !== "off", fx: stored.fx !== "off" };
  }
  // Quiet everything: turns all three off and remembers them; pressed again it restores them
  // (motion stays off if the system asks for reduced motion).
  function quiet(cur, q, reduced) {
    if (!q || !q.on) return { state: { sound: false, motion: false, fx: false }, q: { on: true, prev: { sound: cur.sound, motion: cur.motion, fx: cur.fx } } };
    var p = q.prev || { sound: true, motion: true, fx: true };
    return { state: { sound: p.sound, motion: p.motion && !reduced, fx: p.fx }, q: { on: false, prev: null } };
  }
  function label(key, on) { return NAMES[key] + (on ? " on" : " off"); }
  function tip(key, on, reduced) {
    var extra = key === "motion" && reduced ? " Your system asks for reduced motion, so motion stays off." : "";
    var what = key === "fx" ? " (sparks, glow and magnetic buttons)" : "";
    return NAMES[key] + (on ? " on" : " off") + what + ". Press to turn " + (on ? "off" : "on") + "." + extra;
  }

  var API = { resolve: resolve, quiet: quiet, label: label, tip: tip, KEYS: KEYS };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }

  /* ---------------- browser ---------------- */
  var doc = root.document, html = doc.documentElement;
  var reduced = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var stored = {};
  Object.keys(KEYS).forEach(function (k) { try { stored[k] = localStorage.getItem(KEYS[k]); } catch (e) { stored[k] = null; } });
  var state = resolve(stored, reduced), q = { on: false, prev: null }, subs = [];

  function apply(announce) {
    html.classList.add("js");
    html.setAttribute("data-sound", state.sound ? "on" : "off");
    html.setAttribute("data-motion", state.motion ? "on" : "off");
    html.setAttribute("data-fx", state.fx ? "on" : "off");
    paint();
    subs.forEach(function (fn) { try { fn(state); } catch (e) {} });
    if (announce) say(announce);
  }
  function say(msg) { var el = doc.getElementById("mt-live"); if (el) { el.textContent = ""; setTimeout(function () { el.textContent = msg; }, 30); } }
  function save() { Object.keys(KEYS).forEach(function (k) { try { localStorage.setItem(KEYS[k], state[k] ? "on" : "off"); } catch (e) {} }); }
  var btns = {};
  function paint() {
    Object.keys(NAMES).forEach(function (k) {
      var b = btns[k]; if (!b) return;
      b.setAttribute("aria-pressed", String(state[k]));
      b.setAttribute("aria-label", label(k, state[k]));
      b.title = tip(k, state[k], reduced);
    });
    if (btns.quiet) btns.quiet.setAttribute("aria-pressed", String(q.on));
  }
  function set(k, v, silent) {
    if (k === "motion" && v && reduced) { say("Your system asks for reduced motion, so motion stays off."); return; }
    if (state[k] === v) return;
    state[k] = v;
    var anyOn = state.sound || state.motion || state.fx;
    if (q.on && anyOn) q = { on: false, prev: null };   // turning something back on ends "quiet"
    save(); apply(silent ? "" : label(k, v) + ".");
  }
  function toggleQuiet() {
    var r = quiet(state, q, reduced); state = r.state; q = r.q; save();
    apply(q.on ? "Everything is quiet: sound, motion and effects are off." : "Sound, motion and effects are back.");
  }
  function bind() {
    btns.sound = doc.getElementById("b-sound"); btns.motion = doc.getElementById("b-motion");
    btns.fx = doc.getElementById("b-fx"); btns.quiet = doc.getElementById("b-quiet");
    ["sound", "motion", "fx"].forEach(function (k) { if (btns[k]) btns[k].addEventListener("click", function () { set(k, !state[k]); }); });
    if (btns.quiet) btns.quiet.addEventListener("click", toggleQuiet);
    paint();
  }

  var P = {
    sound: function () { return state.sound; }, motion: function () { return state.motion; }, fx: function () { return state.fx; },
    reduced: function () { return reduced; },
    // sparks, glow and trails are both an effect and a movement
    sparks: function () { return state.fx && state.motion; },
    state: function () { return { sound: state.sound, motion: state.motion, fx: state.fx }; },
    on: function (fn) { subs.push(fn); }, set: set, say: say, toggleQuiet: toggleQuiet
  };
  root.MT_PREFS = P;
  apply("");   // data attributes now, so CSS and scripts agree before first paint of the body
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", bind); else bind();
  // the system setting can change while the page is open
  if (root.matchMedia) {
    var mq = root.matchMedia("(prefers-reduced-motion: reduce)"), onmq = function () { reduced = mq.matches; if (reduced && state.motion) set("motion", false, true); paint(); };
    if (mq.addEventListener) mq.addEventListener("change", onmq);
  }
})(typeof window !== "undefined" ? window : globalThis);

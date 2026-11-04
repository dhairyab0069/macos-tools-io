/* Toolbox sounds, synthesized with the Web Audio API: filtered noise and a few inharmonic sine
   partials for metal (the same approach as the clink / thump / hiss helpers in the garage page).
   No audio files, no requests. The Sound switch (MT_PREFS) turns it on and off; browsers only let audio
   start after a first pointer, key or touch, so the context is created and resumed then.
   Quiet by design: a low master gain and compressor, hover ticks are rate-limited, and at most
   MAX voices sound at once. Nothing plays while the tab is hidden. */
(function (root) {
  "use strict";
  var MAX = 36, on = true, ctx = null, master = null, noise = null, voices = 0, last = {}, started = false;

  function ensure() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0.2;
      master.connect(comp); comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function ready() { return on && ctx && ctx.state === "running" && !document.hidden; }
  function gap(k, ms) { var n = Date.now(); if (n - (last[k] || 0) < ms) return true; last[k] = n; return false; }
  function R(a, b) { return a + Math.random() * (b - a); }

  /* a note: o = {f, to, type, gain, dur, at, attack} */
  function tone(o) {
    if (voices >= MAX) return;
    var t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.1, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    voices++; osc.onended = function () { voices--; };
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  /* filtered noise: o = {type, f, to, q, gain, dur, at, attack} */
  function hiss(o) {
    if (voices >= MAX) return;
    var t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.1, src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise;
    fl.type = o.type || "bandpass"; fl.Q.value = o.q || 1;
    fl.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(master);
    voices++; src.onended = function () { voices--; };
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }
  /* a struck piece of steel: three inharmonic partials that ring and die, plus the tick of the hit */
  function clink(at, f, gain) {
    tone({ at: at, f: f, dur: 0.24, gain: gain, attack: 0.001 });
    tone({ at: at, f: f * 2.76, dur: 0.12, gain: gain * 0.5, attack: 0.001 });
    tone({ at: at, f: f * 5.4, dur: 0.06, gain: gain * 0.25, attack: 0.001 });
    hiss({ at: at, type: "highpass", f: 5000, dur: 0.012, gain: gain * 0.6, attack: 0.001 });
  }
  function thump(at, gain, f) {
    hiss({ at: at, type: "lowpass", f: 300, q: 0.7, dur: 0.08, gain: gain, attack: 0.002 });
    tone({ at: at, f: f || 100, to: (f || 100) * 0.6, dur: 0.12, gain: gain * 0.6, attack: 0.002 });
  }
  /* one pawl click of a ratchet: a dry tick and a tiny spring ping */
  function pawl(at, f, gain) {
    hiss({ at: at, type: "highpass", f: 4200, dur: 0.012, gain: gain, attack: 0.001 });
    tone({ at: at, f: f, dur: 0.02, gain: gain * 0.6, attack: 0.001, type: "triangle" });
  }

  var FX = {
    tick: function () { pawl(0, R(1900, 2300), 0.014); },                                   // hover
    click: function () { thump(0, 0.04, 150); clink(0.004, 2200, 0.016); },                // a switch
    ratchet: function (n) {                                                                  // n pawl clicks, speeding up
      var t = 0; n = n || 6;
      for (var i = 0; i < n; i++) { pawl(t, 1700 + i * 60, 0.03); thump(t, 0.015, 170); t += Math.max(0.035, 0.09 - i * 0.008); }
    },
    ratchetRun: function () {                                                                // Update All
      var t = 0;
      for (var i = 0; i < 14; i++) { pawl(t, 1750 + (i % 3) * 90, 0.028); if (i % 2 === 0) thump(t, 0.014, 160); t += 0.055; }
      clink(t + 0.02, 2600, 0.03);
    },
    spanner: function () {                                                                   // tightening: slow clicks that rise, then bite
      for (var i = 0; i < 5; i++) { pawl(i * 0.1, 1500 + i * 140, 0.032); thump(i * 0.1, 0.02, 130 - i * 8); }
      thump(0.52, 0.07, 95); clink(0.52, 1500, 0.03);
    },
    screw: function () {                                                                     // a screwdriver turning: grip scrape and small ticks
      hiss({ type: "bandpass", f: 1800, to: 3200, q: 1.8, dur: 0.22, gain: 0.03, attack: 0.04 });
      for (var i = 0; i < 4; i++) pawl(0.02 + i * 0.055, R(1500, 1900), 0.016);
    },
    drawer: function () {                                                                    // a drawer rolling out on runners, stopping at the end
      hiss({ type: "lowpass", f: 900, to: 300, q: 0.6, dur: 0.28, gain: 0.06, attack: 0.04 });
      for (var i = 0; i < 4; i++) clink(R(0, 0.26), R(900, 1500), 0.008);
      thump(0.28, 0.07, 110); clink(0.28, 1800, 0.022);
    },
    shut: function () {                                                                      // drawer or lid pushed home
      hiss({ type: "lowpass", f: 300, to: 900, q: 0.6, dur: 0.2, gain: 0.05, attack: 0.03 });
      thump(0.2, 0.09, 95);
    },
    latch: function () { thump(0, 0.06, 130); clink(0.01, 2900, 0.03); clink(0.07, 2100, 0.025); },   // clack-clack
    bolt: function () {                                                                      // a bolt dropped into a tray: bounces getting smaller
      thump(0, 0.05, 170); clink(0.01, 3100, 0.04); clink(0.11, 3100, 0.022); clink(0.17, 3100, 0.011);
    },
    tape: function () {                                                                      // a measuring tape: zip out, then the snap back
      hiss({ type: "bandpass", f: 1400, to: 4800, q: 0.7, dur: 0.16, gain: 0.04, attack: 0.02 });
      thump(0.17, 0.07, 210); hiss({ at: 0.17, type: "highpass", f: 3500, dur: 0.05, gain: 0.05, attack: 0.001 }); tone({ at: 0.17, f: 2600, to: 1800, dur: 0.12, gain: 0.02, attack: 0.001 });
    },
    lid: function () {                                                                       // a toolbox lid: hinge, bang, rattle, latch
      hiss({ type: "bandpass", f: 700, to: 1100, q: 2, dur: 0.14, gain: 0.025, attack: 0.03 });
      thump(0.15, 0.1, 80);
      for (var i = 0; i < 5; i++) clink(0.17 + R(0, 0.14), R(1200, 2600), 0.01);
      clink(0.34, 2800, 0.028);
    },
    pickup: function () { clink(0, 3000, 0.03); thump(0.02, 0.04, 190); },
    drop: function () { thump(0, 0.06, 150); clink(0.03, 2500, 0.025); },
    clunk: function () { thump(0, 0.09, 85); tone({ f: 120, to: 70, type: "triangle", dur: 0.16, gain: 0.04 }); hiss({ type: "lowpass", f: 500, dur: 0.1, gain: 0.04 }); },   // dull: a failed update
    key: function () { pawl(0, R(1800, 2400), 0.012); },
    snap: function () { thump(0, 0.035, 200); clink(0, 3300, 0.022); },                      // a label snapping on
    theme: function () { clink(0, 2000, 0.02); clink(0.07, 2700, 0.016); },                 // a soft two-note cue when the theme changes
    on: function () { clink(0, 2400, 0.035); clink(0.09, 3200, 0.035); }
  };
  // names the two recreations already use, mapped to tool sounds
  var ALIAS = { tab: "tick", open: "latch", close: "shut", refresh: "screw", done: "bolt", error: "clunk", trash: "shut", start: "latch", toggle: "ratchet", pop: "drawer" };
  var LIMIT = { tick: 90, key: 45, snap: 70, click: 40, pickup: 80, drop: 80 };

  function play(name, arg) {
    name = ALIAS[name] || name;
    if (!ready() || !FX[name]) return;
    if (LIMIT[name] && gap(name, LIMIT[name])) return;
    if (name === "tick" && gap("any-hover", 60)) return;
    if (gap("any", 30)) return;                 // two sounds never start within 30 ms of each other
    try { FX[name](arg); } catch (e) { /* audio must never break the page */ }
  }
  function wake() { if (on && ensure() && ctx.state === "suspended") ctx.resume().catch(function () {}); }
  // the first pointer, key or touch lets the browser start audio
  function unlock() {
    started = true;
    wake();
    ["pointerdown", "keydown", "touchstart"].forEach(function (n) { root.removeEventListener(n, unlock, true); });
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function (n) { root.addEventListener(n, unlock, true); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) wake(); });

  var Sfx = {
    play: play,
    isOn: function () { return on; },
    set: function (v) {
      var was = on; on = !!v;
      if (on && !was && started && ensure()) {
        var go = function () { play("on"); };
        if (ctx.state === "suspended") ctx.resume().then(go).catch(function () {}); else go();
      }
      return on;
    }
  };
  root.MT_SFX = Sfx;
  if (root.MT_PREFS) { Sfx.set(root.MT_PREFS.sound()); root.MT_PREFS.on(function (s) { Sfx.set(s.sound); }); }
})(typeof window !== "undefined" ? window : globalThis);

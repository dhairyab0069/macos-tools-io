/* Optional sound effects. Off until the Sound switch is pressed; synthesized with the Web Audio API,
   so there are no audio files and no requests. Nothing plays while the tab is hidden. */
(function (root) {
  "use strict";
  var KEY = "macos-tools-sound", on = false, ctx = null, master = null, noise = null, voices = 0;
  try { on = localStorage.getItem(KEY) === "1"; } catch (e) {}

  function ensure() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0.28;
      master.connect(comp); comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function ready() { return on && ctx && ctx.state === "running" && !document.hidden; }
  function tone(o) {
    if (voices >= 24) return;
    var t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.06, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.06, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    voices++; osc.onended = function () { voices--; };
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function hiss(o) {
    if (voices >= 24) return;
    var t0 = ctx.currentTime, src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; fl.type = o.type || "bandpass"; fl.frequency.value = o.f || 3000; fl.Q.value = 1;
    g.gain.setValueAtTime(o.gain || 0.04, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (o.dur || 0.03));
    src.connect(fl); fl.connect(g); g.connect(master);
    voices++; src.onended = function () { voices--; };
    src.start(t0, Math.random() * 0.5); src.stop(t0 + (o.dur || 0.03) + 0.05);
  }
  function hz(n) { return 523.25 * Math.pow(2, n / 12); }
  var FX = {
    click: function () { tone({ f: 1500, type: "triangle", dur: 0.025, gain: 0.05 }); hiss({ type: "highpass", f: 5000, dur: 0.012, gain: 0.03 }); },
    tab: function () { tone({ f: 900, type: "triangle", dur: 0.04, gain: 0.045 }); },
    open: function () { tone({ f: 660, type: "triangle", dur: 0.06, gain: 0.05 }); tone({ f: 990, type: "triangle", dur: 0.08, gain: 0.05, at: 0.05 }); },
    close: function () { tone({ f: 990, type: "triangle", dur: 0.05, gain: 0.045 }); tone({ f: 660, type: "triangle", dur: 0.07, gain: 0.045, at: 0.05 }); },
    refresh: function () { tone({ f: 300, to: 800, type: "sine", dur: 0.35, gain: 0.04 }); },
    done: function () { [0, 4, 7].forEach(function (n, i) { tone({ f: hz(n), type: "triangle", dur: 0.28, gain: 0.06, at: i * 0.07 }); }); },
    error: function () { tone({ f: 220, type: "sawtooth", dur: 0.18, gain: 0.04 }); tone({ f: 165, type: "sawtooth", dur: 0.25, gain: 0.04, at: 0.12 }); },
    trash: function () { hiss({ f: 1200, dur: 0.12, gain: 0.07 }); tone({ f: 180, to: 90, type: "triangle", dur: 0.1, gain: 0.06 }); },
    start: function () { [0, 4, 7, 12].forEach(function (n, i) { tone({ f: hz(n - 5), type: "triangle", dur: 0.22, gain: 0.05, at: i * 0.06 }); }); },
    key: function () { tone({ f: 1100 + Math.random() * 300, type: "square", dur: 0.012, gain: 0.02 }); },
    toggle: function () { tone({ f: 740, type: "triangle", dur: 0.04, gain: 0.05 }); tone({ f: 1100, type: "triangle", dur: 0.05, gain: 0.04, at: 0.04 }); },
    pop: function () { tone({ f: 420, to: 900, type: "sine", dur: 0.12, gain: 0.05 }); }
  };

  var Sfx = {
    play: function (name, arg) { if (ready() && FX[name]) { try { FX[name](arg); } catch (e) {} } },
    isOn: function () { return on; },
    set: function (v) {
      on = !!v;
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
      if (on && ensure()) {
        var go = function () { Sfx.play("open"); };
        if (ctx.state === "suspended") ctx.resume().then(go); else go();
      }
      return on;
    }
  };
  root.MT_SFX = Sfx;
})(typeof window !== "undefined" ? window : globalThis);

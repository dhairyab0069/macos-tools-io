/* The workbench around the tools: one canvas and one animation loop for the pegboard background
   (dots that glow and shift around the pointer, tool silhouettes that drift and tilt toward it,
   sparks on click, a short cursor trail), plus magnetic buttons, hover ticks and the scroll assembly.
   Everything obeys MT_PREFS: motion off stops the loop (the board is drawn once, still), effects off
   removes the glow, tilt, sparks, trail and magnets. The loop also stops while the tab is hidden. */
(function (root) {
  "use strict";
  var P = root.MT_PREFS, S = root.MT_SFX, doc = document, html = doc.documentElement;
  var cv = doc.getElementById("bg");
  if (!P) return;

  /* ---------------- pegboard canvas ---------------- */
  var ctx = cv && cv.getContext ? cv.getContext("2d") : null;
  var W = 0, H = 0, dpr = 1, raf = 0, last = 0, frame = 0;
  var ptr = { x: -999, y: -999, gx: -999, gy: -999, seen: false, glow: 0 };
  var parts = [], colors = { ink: "28,29,34", acc: "106,92,255", warm: "255,196,64" };
  // silhouettes drawn as outlines, centred on (0, 0), about 160 units long
  var TOOLS = [
    { p: "M-80 -11 h45 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 h-45 a8 8 0 0 1 -8 -8 v-6 a8 8 0 0 1 8 -8z M-29 -3 H64 L76 -6 V6 L64 3 H-29z", at: [0.07, 0.24], r: -0.6, s: 1.15, ph: 0.0 },                       // screwdriver
    { p: "M-78 -6 H20 V6 H-78 a6 6 0 0 1 0 -12z M20 -6 L26 -22 A24 24 0 0 1 62 -12 L42 -3 H66 V3 H42 L62 12 A24 24 0 0 1 26 22 L20 6", at: [0.92, 0.18], r: 0.5, s: 1.2, ph: 1.7 },        // open-end spanner
    { p: "M-76 -6 H14 V6 H-76 a6 6 0 0 1 0 -12z M62 0 L51 19.100 H29 L18 0 L29 -19.100 H51z M49 0 A9 9 0 1 0 31 0 A9 9 0 1 0 49 0", at: [0.1, 0.66], r: 0.35, s: 1.1, ph: 3.1 },                                  // ring spanner
    { p: "M-64 -5 H34 V5 H-64z M26 -22 H46 V22 H26z M46 -15 H70 L80 -24 V24 L70 15 H46", at: [0.9, 0.6], r: -0.45, s: 1.0, ph: 4.2 },                                                                          // hammer
    { p: "M0 -20 L17.300 -10 V10 L0 20 L-17.300 10 V-10z M9 0 A9 9 0 1 0 -9 0 A9 9 0 1 0 9 0", at: [0.52, 0.9], r: 0.2, s: 1.3, ph: 5.3 },                                                                 // hex nut
    { p: "M-50 -4 H50 V4 H-50z M-50 -12 H-36 V12 H-50z M-30 -3 L-30 3 M-10 -3 L-10 3 M10 -3 L10 3 M30 -3 L30 3", at: [0.74, 0.9], r: -0.12, s: 1.0, ph: 6.0 }                                           // tape rule
  ];
  var paths = [];
  try { paths = TOOLS.map(function (t) { return new Path2D(t.p); }); } catch (e) { ctx = null; }

  function readColors() {
    var cs = getComputedStyle(html);
    function rgb(v, fb) {
      var m = (cs.getPropertyValue(v) || "").trim(), h = /^#([0-9a-f]{6})$/i.exec(m) || /^#([0-9a-f]{3})$/i.exec(m);
      if (!h) return fb; var x = h[1]; if (x.length === 3) x = x.replace(/./g, "$&$&");
      return parseInt(x.slice(0, 2), 16) + "," + parseInt(x.slice(2, 4), 16) + "," + parseInt(x.slice(4, 6), 16);
    }
    colors.ink = rgb("--ink", colors.ink); colors.acc = rgb("--dd", colors.acc);
  }
  function size() {
    if (!cv) return;
    dpr = Math.min(root.devicePixelRatio || 1, 1.5);
    W = root.innerWidth; H = root.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var GRID = 30;
  function draw(t) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var fx = P.fx(), moving = P.motion();
    var gx = ptr.gx, gy = ptr.gy, glow = fx ? ptr.glow : 0;
    // soft glow under the pointer
    if (glow > 0.01) {
      var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 260);
      g.addColorStop(0, "rgba(" + colors.acc + "," + (0.16 * glow) + ")"); g.addColorStop(1, "rgba(" + colors.acc + ",0)");
      ctx.fillStyle = g; ctx.fillRect(gx - 260, gy - 260, 520, 520);
    }
    // pegboard dots: they brighten, grow and are pushed away from the pointer
    var R = 170, off = (moving ? Math.sin(t / 5000) * 2 : 0);
    for (var y = GRID / 2; y < H + GRID; y += GRID) {
      for (var x = GRID / 2; x < W + GRID; x += GRID) {
        var dx = x - gx, dy = y - gy, d = Math.sqrt(dx * dx + dy * dy), k = glow && d < R ? (1 - d / R) * glow : 0;
        var px = x + off, py = y;
        if (k) { var m = (k * k) * 9 / (d || 1); px += dx * m; py += dy * m; }
        ctx.fillStyle = k ? "rgba(" + colors.acc + "," + (0.16 + 0.6 * k) + ")" : "rgba(" + colors.ink + ",0.11)";
        var r = 1.3 + 2.3 * k;
        ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
      }
    }
    // tool silhouettes: drift slowly, lean toward the pointer
    ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (var i = 0; i < TOOLS.length; i++) {
      var T = TOOLS[i], tx = T.at[0] * W, ty = T.at[1] * H, rot = T.r;
      if (moving) { tx += Math.sin(t / 3600 + T.ph) * 18; ty += Math.cos(t / 4300 + T.ph * 1.3) * 16; rot += Math.sin(t / 5200 + T.ph) * 0.1; }
      var near = 0;
      if (fx && glow > 0.01) {
        var ddx = gx - tx, ddy = gy - ty, dd = Math.sqrt(ddx * ddx + ddy * ddy);
        near = Math.max(0, 1 - dd / 420) * glow;
        // lean toward the pointer, by at most about 0.35 rad
        var want = Math.atan2(ddy, ddx), diff = Math.atan2(Math.sin(want - rot), Math.cos(want - rot));
        rot += diff * 0.25 * near; tx += ddx * 0.03 * near; ty += ddy * 0.03 * near;
      }
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot); ctx.scale(T.s, T.s);
      ctx.strokeStyle = "rgba(" + (near > 0.2 ? colors.acc : colors.ink) + "," + (0.1 + 0.22 * near) + ")";
      ctx.stroke(paths[i]); ctx.restore();
    }
    // sparks and trail
    if (parts.length) {
      for (var j = parts.length - 1; j >= 0; j--) {
        var a = parts[j]; a.life -= a.dt; if (a.life <= 0) { parts.splice(j, 1); continue; }
        a.x += a.vx; a.y += a.vy; a.vy += a.g; a.vx *= 0.985;
        ctx.fillStyle = "rgba(" + colors.warm + "," + Math.max(0, a.life) * 0.9 + ")";
        ctx.fillRect(a.x - a.s / 2, a.y - a.s / 2, a.s, a.s);
      }
    }
  }
  function loop(t) {
    raf = 0;
    if (!P.motion() || doc.hidden) return;
    raf = root.requestAnimationFrame(loop);
    if (t - last < 30) return;                   // about 30 frames a second is plenty for a backdrop
    last = t; frame++;
    ptr.gx += (ptr.x - ptr.gx) * 0.22; ptr.gy += (ptr.y - ptr.gy) * 0.22;
    ptr.glow += ((ptr.seen ? 1 : 0) - ptr.glow) * 0.12;
    draw(t);
  }
  function sync() {
    if (!ctx) return;
    if (P.motion() && !doc.hidden) { if (!raf) raf = root.requestAnimationFrame(loop); }
    else { if (raf) { root.cancelAnimationFrame(raf); raf = 0; } parts.length = 0; ptr.glow = 0; draw(0); }   // one still frame
  }
  function spark(x, y, n) {
    if (!P.sparks()) return;
    for (var i = 0; i < n && parts.length < 90; i++) {
      var a = Math.random() * 6.2832, v = 1.5 + Math.random() * 3.2;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, g: 0.12, s: 2 + Math.random() * 2, life: 1, dt: 0.035 + Math.random() * 0.02 });
    }
  }
  if (ctx) {
    readColors(); size(); draw(0);
    root.addEventListener("resize", function () { size(); sync(); if (!P.motion()) draw(0); });
    if (root.matchMedia) { var cm = root.matchMedia("(prefers-color-scheme: dark)"); if (cm.addEventListener) cm.addEventListener("change", function () { readColors(); sync(); }); }
    P.on(sync);
    doc.addEventListener("visibilitychange", sync);
    sync();
  }

  /* ---------------- pointer: glow, trail, sparks, magnets ---------------- */
  var lastTrail = 0, magnet = null;
  var MAG = ".btn, .chip, .tbtn, .dk, .ico, [data-magnet]";
  function resetMagnet() { if (magnet) { magnet.style.removeProperty("--mx"); magnet.style.removeProperty("--my"); magnet.classList.remove("mag"); magnet = null; } }
  doc.addEventListener("pointermove", function (e) {
    ptr.x = e.clientX; ptr.y = e.clientY; if (!ptr.seen) { ptr.gx = e.clientX; ptr.gy = e.clientY; } ptr.seen = true;
    if (e.pointerType === "touch") return;
    if (P.sparks()) {
      var n = performance.now();
      if (n - lastTrail > 45 && parts.length < 60) { lastTrail = n; parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 0.6, vy: Math.random() * 0.5, g: 0.02, s: 2.4, life: 0.8, dt: 0.06 }); }
    }
    if (!P.sparks()) { resetMagnet(); return; }
    var el = e.target.closest ? e.target.closest(MAG) : null;
    if (el !== magnet) { resetMagnet(); magnet = el; if (el) el.classList.add("mag"); }
    if (el) {
      var b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      el.style.setProperty("--mx", Math.max(-5, Math.min(5, (e.clientX - cx) * 0.14)).toFixed(1) + "px");
      el.style.setProperty("--my", Math.max(-4, Math.min(4, (e.clientY - cy) * 0.18)).toFixed(1) + "px");
    }
  }, { passive: true });
  doc.addEventListener("mouseout", function (e) { if (!e.relatedTarget) { ptr.seen = false; resetMagnet(); } });
  root.addEventListener("blur", function () { ptr.seen = false; });
  doc.addEventListener("pointerdown", function (e) { spark(e.clientX, e.clientY, 10); }, { passive: true });
  P.on(function () { if (!P.sparks()) resetMagnet(); });

  // hover ticks: a soft metal tick, mouse only, rate-limited inside the sound module too
  var TICK = ".btn, .chip, .tbtn, .dk, .ico, .tcard, .grip, .top nav a, .seg button, .mbtn";
  doc.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "mouse" || !e.target.closest) return;
    var el = e.target.closest(TICK);
    if (!el || el.disabled || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    if (S) S.play("tick");
  }, { passive: true });

  /* ---------------- scroll assembly: parts slide in, bolts tighten, labels snap on ---------------- */
  var targets = ".tool-head, .chips, .frame, .card, .code-card, .tcard, .slot, .built, .tray-sec > .lede, .build .lede";
  var items = [].slice.call(doc.querySelectorAll(targets));
  items.forEach(function (el) { el.classList.add("asm"); });
  var snapAt = 0;
  function reveal(el, i) {
    el.style.setProperty("--d", (i * 90) + "ms");
    el.classList.add("in");
    root.setTimeout(function () { el.classList.remove("asm"); }, 1600 + i * 90);   // later transforms (drag, magnets) must not inherit the entrance delay
    if (P.motion() && S && (el.matches(".card, .code-card, .tcard, .slot, .built"))) {
      var now = Date.now(); if (now - snapAt < 140) return; snapAt = now;
      root.setTimeout(function () { if (P.motion() && !doc.hidden) S.play(el.matches(".built") ? "tape" : (i % 2 ? "bolt" : "snap")); }, i * 90 + 260);
    }
  }
  if (root.IntersectionObserver) {
    var order = 0, lastBatch = 0;
    var io = new IntersectionObserver(function (en) {
      var batch = 0, now = Date.now(); if (now - lastBatch > 400) { order = 0; } lastBatch = now;
      en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); reveal(x.target, Math.min(order++, 4)); batch++; } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else items.forEach(function (el) { el.classList.add("in"); });

  root.MT_BENCH = { spark: spark, redraw: function () { draw(0); } };
})(window);

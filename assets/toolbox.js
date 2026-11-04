/* The toolbox: the draggable tool cards and the "Now using" slot, the feature chips that light up a
   part of the drawn screens, the quick-action dock, and the two "how it is built" diagrams.
   It only ever calls the two recreations' own entry points (MT_DD, MT_SH); nothing here runs a command. */
(function (root) {
  "use strict";
  var P = root.MT_PREFS, S = root.MT_SFX || { play: function () {} }, L = root.MT_LOGIC, D = root.MT_DATA, doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  function play(n, a) { S.play(n, a); }
  function smooth() { return P && P.motion() ? "smooth" : "auto"; }
  var dockLive = $("dock-live");
  function say(msg) { if (dockLive) { dockLive.textContent = ""; setTimeout(function () { dockLive.textContent = msg; }, 30); } }
  var NAME = { dd: "DepDeck", sh: "Desktop Shell" };

  var frames = { dd: doc.querySelector('.frame[data-tool="dd"]'), sh: doc.querySelector('.frame[data-tool="sh"]') };
  var state = { use: null };
  function nearest() {
    var best = "dd", bd = 1e9;
    ["dd", "sh"].forEach(function (id) { var r = frames[id].getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - root.innerHeight / 2); if (d < bd) { bd = d; best = id; } });
    return best;
  }
  function current() { return state.use || nearest(); }
  function spot(el) {
    if (!el) return;
    el.classList.remove("spot"); void el.offsetWidth; el.classList.add("spot");
    clearTimeout(el._spot); el._spot = setTimeout(function () { el.classList.remove("spot"); }, 1800);
  }
  function bring(frame) {
    var r = frame.getBoundingClientRect(), vh = root.innerHeight;
    // keep the frame clear of the sticky bar (72px) and the dock (about 76px)
    if (r.top < 72 || r.bottom > vh - 84) frame.scrollIntoView({ behavior: smooth(), block: r.height < vh - 170 ? "center" : "start" });
  }

  /* ---------------- tray, cards and the Now using slot ---------------- */
  var tray = $("tray"), slot = $("slot"), slotBody = $("slot-body"), slotEmpty = $("slot-empty"), eject = $("slot-eject"), slotNote = $("slot-note");
  var cards = { dd: $("card-dd"), sh: $("card-sh") };
  function lamps() {
    ["dd", "sh"].forEach(function (id) {
      var on = state.use === id;
      frames[id].classList.toggle("lit", on);
      var t = frames[id].querySelector(".inuse"); if (t) t.hidden = !on;
    });
    [].forEach.call(doc.querySelectorAll(".dk[data-dock='dd'], .dk[data-dock='sh']"), function (b) { b.classList.toggle("cur", b.getAttribute("data-dock") === state.use); });
  }
  function putBack(id, quiet) {
    var c = cards[id]; if (!c) return;
    var hadFocus = c.contains(doc.activeElement) ? doc.activeElement : null;
    c.classList.remove("docked", "lifted");
    if (id === "dd") tray.insertBefore(c, tray.firstChild); else tray.appendChild(c);
    if (state.use === id) state.use = null;
    slotEmpty.hidden = !!state.use; eject.hidden = !state.use;
    lamps();
    if (hadFocus && hadFocus.focus) hadFocus.focus({ preventScroll: true });
    if (!quiet) { slotNote.textContent = "Put " + NAME[id] + " back in the tray. The drawn screens are still below."; play("shut"); }
  }
  function useTool(id) {
    var c = cards[id]; if (!c) return;
    if (state.use && state.use !== id) putBack(state.use, true);
    var hadFocus = c.contains(doc.activeElement) ? doc.activeElement : null;
    c.classList.remove("lifted");
    slotBody.appendChild(c); c.classList.add("docked");
    state.use = id; slotEmpty.hidden = true; eject.hidden = false; slot.classList.remove("hot");
    lamps();
    if (hadFocus && hadFocus.focus) hadFocus.focus({ preventScroll: true });
    play("lid");
    slotNote.textContent = NAME[id] + " loaded in the Now using slot: its drawn screen (an in-page recreation) is lit below, and Reset, Shuffle and Copy build in the dock now act on it.";
    bring(frames[id]);
    setTimeout(function () {
      if (id === "dd" && root.MT_DD) { var st = root.MT_DD.state(); if (!st.quit && !st.open) root.MT_DD.open(true); spot($("dd-item")); }
      if (id === "sh" && root.MT_SH) spot($("sh-startbtn"));
    }, 200);
  }
  var justDragged = false;
  function flip(card, btn) {
    var back = card.querySelector(".back"), front = card.querySelector(".front"), to = back.hidden;
    back.hidden = !to; front.hidden = to;
    btn.setAttribute("aria-pressed", String(to)); btn.textContent = to ? "Flip back" : "Flip";
    card.classList.remove("flipped"); void card.offsetWidth; card.classList.add("flipped");
    play("latch");
  }
  tray.addEventListener("click", cardClick); slot.addEventListener("click", cardClick);
  function cardClick(e) {
    var b = e.target.closest("[data-do]"); if (!b) return;
    var card = b.closest(".tcard"); if (!card) return;
    var id = card.getAttribute("data-card"), a = b.getAttribute("data-do");
    if (a === "grip") { if (justDragged || e.detail > 0) return; if (state.use === id) putBack(id); else useTool(id); }   // a mouse click on the grip does nothing; Enter or Space (detail 0) loads the tool
    else if (a === "use") { if (state.use === id) putBack(id); else useTool(id); }
    else if (a === "flip") flip(card, b);
  }
  eject.addEventListener("click", function () { if (state.use) putBack(state.use); });
  // Drag by the grip. Nothing moves until the pointer has travelled 6 px (10 px for touch). Then a ghost of
  // the card follows the pointer and the real card stays behind as a dashed outline. Over the slot the slot
  // lights up solid; releasing there glides the ghost into the slot and seats the card. Released anywhere
  // else, the ghost glides straight back and a note says so (a card already in the slot goes back to the
  // tray only when released over the tray). Escape cancels. Reduced motion: no glide, the card just moves.
  (function () {
    var drag = null, glide = 0;
    function inside(el, x, y, pad) { var r = el.getBoundingClientRect(); return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad; }
    function paint(d, x, y) {
      var dx = x - d.x, dy = y - d.y;
      d.ghost.style.transform = "translate(" + Math.round(d.r.left + dx) + "px," + Math.round(d.r.top + dy) + "px)";
      d.ghost.style.rotate = Math.max(-4, Math.min(4, dx * 0.02)).toFixed(1) + "deg";
    }
    function clean(d) {
      if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
      d.card.classList.remove("lifted"); html().classList.remove("carrying"); slot.classList.remove("hot"); tray.classList.remove("back-here");
    }
    function html() { return doc.documentElement; }
    function glideTo(d, rect, done) {
      var g = d.ghost;
      if (!P || !P.motion()) { clean(d); done(); return; }
      g.classList.add("glide"); g.style.rotate = "0deg";
      g.style.transform = "translate(" + Math.round(rect.left) + "px," + Math.round(rect.top) + "px)";
      var fin = false; function end() { if (fin) return; fin = true; clean(d); done(); }
      g.addEventListener("transitionend", end, { once: true }); glide = setTimeout(end, 480);
    }
    function cancel(d, msg) {
      var home = d.card.getBoundingClientRect();
      glideTo(d, home, function () { if (msg) slotNote.textContent = msg; });
    }
    doc.addEventListener("pointerdown", function (e) {
      var g = e.target.closest && e.target.closest(".grip"); if (!g || e.button > 0 || drag) return;
      var card = g.closest(".tcard");
      drag = { card: card, id: card.getAttribute("data-card"), x: e.clientX, y: e.clientY, on: false, pid: e.pointerId, g: g, touch: e.pointerType === "touch" };
    });
    doc.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        var th = drag.touch ? 10 : 6;
        if (dx * dx + dy * dy < th * th) return;
        drag.on = true; clearTimeout(glide);
        var c = drag.card; drag.r = c.getBoundingClientRect();
        var gh = c.cloneNode(true); gh.removeAttribute("id"); gh.className = "tcard carry-ghost" + (c.classList.contains("sh") ? " sh" : "");
        gh.style.width = drag.r.width + "px"; gh.style.height = drag.r.height + "px"; gh.setAttribute("aria-hidden", "true");
        [].forEach.call(gh.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
        [].forEach.call(gh.querySelectorAll("button"), function (n) { n.tabIndex = -1; });
        doc.body.appendChild(gh); drag.ghost = gh;
        c.classList.add("lifted"); html().classList.add("carrying");
        if (state.use === drag.id) tray.classList.add("back-here");
        try { drag.g.setPointerCapture(e.pointerId); } catch (x) {}
        play("pickup");
      }
      paint(drag, e.clientX, e.clientY);
      slot.classList.toggle("hot", inside(slot, e.clientX, e.clientY, 16));
    });
    function end(e, abort) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag; drag = null;
      try { d.g.releasePointerCapture(e.pointerId); } catch (x) {}
      if (!d.on) return;
      justDragged = true; setTimeout(function () { justDragged = false; }, 120);
      var overSlot = !abort && inside(slot, e.clientX, e.clientY, 16), overTray = !abort && inside(tray, e.clientX, e.clientY, 0);
      slot.classList.remove("hot");
      if (overSlot && state.use !== d.id) {
        glideTo(d, slotBody.getBoundingClientRect(), function () { useTool(d.id); });
      } else if (state.use === d.id && overTray) {
        var spot0 = tray.getBoundingClientRect();
        glideTo(d, { left: spot0.left + 16, top: spot0.top + 16 }, function () { putBack(d.id); });
      } else if (state.use === d.id) {
        cancel(d, NAME[d.id] + " stays in the Now using slot. Drop it on the tray, or press Put it back, to return it.");
        play("drop");
      } else {
        cancel(d, "Not over the Now using slot, so " + NAME[d.id] + " stayed in the tray. Drag it onto the dashed slot to load it.");
        play("drop");
      }
    }
    doc.addEventListener("pointerup", function (e) { end(e, false); });
    doc.addEventListener("pointercancel", function (e) { end(e, true); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && drag && drag.on) { var d = drag; drag = null; slot.classList.remove("hot"); cancel(d, "Move cancelled."); } });
  })();

  /* ---------------- chips: light up a part of the drawn screens ---------------- */
  function ddShow(part) {
    var dd = root.MT_DD, pop = $("dd-pop"); if (!dd) return;
    var st = dd.state();
    if (st.quit) $("dd-relaunch-btn").click();
    if (part === "badge") { spot($("dd-item")); return; }
    if (!dd.state().open) dd.open(true);
    var tab = part === "updateAll" ? "updates" : part;
    var tb = pop.querySelector('[data-act="tab:' + tab + '"]'); if (tb && !tb.classList.contains("on")) tb.click();
    setTimeout(function () {
      var sel = { installed: ".p-body", updates: ".p-tabs .tab.on", updateAll: '[data-act="updateAll"]', issues: ".p-body", search: ".p-body", settings: ".p-body .form" }[part];
      var el = pop.querySelector(sel);
      if (!el && part === "updateAll") { el = pop.querySelector(".p-body"); say("Nothing is outdated right now, so there is no Update All button. Shuffle the sample data to get some updates."); }
      spot(el);
    }, 80);
  }
  function esc() { var st = $("sh-stage"); for (var i = 0; i < 2; i++) st.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }
  function shShow(part) {
    var sh = root.MT_SH; if (!sh) return;
    esc();
    if (part === "taskbar") spot($("sh-bar"));
    else if (part === "start") { sh.openStart(); setTimeout(function () { spot($("sh-start")); }, 60); }
    else if (part === "folders") { sh.openFolderById(D.folders[0].id); setTimeout(function () { spot($("sh-overlay").querySelector(".fo-panel") || $("sh-folders")); }, 120); }
    else if (part === "widgets") { if (sh.state().collapsed) { var f = $("sh-widgets").querySelector('[data-act="fold"]'); if (f) f.click(); } setTimeout(function () { spot($("sh-widgets")); }, 40); }
    else if (part === "terminal") { sh.openApp("ghostty"); setTimeout(function () { sh.runIn("desktopctl status"); var w = $("sh-wins").querySelectorAll(".win"); spot(w[w.length - 1]); }, 160); }
    else if (part === "zones") { var z = $("sh-zones"); if (!z.checked) z.click(); spot($("sh-zoneview")); }
  }
  doc.addEventListener("click", function (e) {
    var c = e.target.closest && e.target.closest("[data-show]"); if (!c) return;
    var a = c.getAttribute("data-show").split(":"), tool = a[0], part = a[1];
    bring(frames[tool]);
    play("ratchet", 3);
    setTimeout(function () { if (tool === "dd") ddShow(part); else shShow(part); }, P && P.motion() ? 120 : 0);
  });

  /* ---------------- dock ---------------- */
  function jump(id) { var sec = $(id === "dd" ? "depdeck" : "shell"); sec.scrollIntoView({ behavior: smooth(), block: "start" }); play("drawer"); }
  function copyText(text) {
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, no) {
      var t = doc.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;left:-999px;top:0";
      doc.body.appendChild(t); t.select();
      try { doc.execCommand("copy") ? ok() : no(); } catch (x) { no(x); } doc.body.removeChild(t);
    });
  }
  function copyBuild(id, btn) {
    var pre = $(id === "dd" ? "cmd-dd" : "cmd-sh"), orig = btn && btn.querySelector("span") ? btn.querySelector("span").textContent : (btn ? btn.textContent : "");
    copyText(pre.textContent.trim()).then(function () {
      play("tape"); say("Copied the " + NAME[id] + " build commands.");
      if (btn) { var sp = btn.querySelector("span") || btn; btn.classList.add("done"); sp.textContent = "Copied"; setTimeout(function () { sp.textContent = orig; btn.classList.remove("done"); }, 1500); }
    }, function () { say("Could not copy here. The commands are in the Build section."); play("clunk"); });
  }
  $("dock").addEventListener("click", function (e) {
    var b = e.target.closest("[data-dock]"); if (!b) return;
    var a = b.getAttribute("data-dock"), id = current();
    if (a === "dd" || a === "sh") jump(a);
    else if (a === "reset") { $(id === "dd" ? "dd-reset" : "sh-reset").click(); play("lid"); say("Reset the " + NAME[id] + " recreation."); }
    else if (a === "shuffle") {
      var api = id === "dd" ? root.MT_DD : root.MT_SH; if (api && api.shuffle) api.shuffle();
      if (id === "dd" && root.MT_DD && !root.MT_DD.state().open) root.MT_DD.open(true);
      play("ratchet", 6); say("Shuffled the " + NAME[id] + " sample data.");
    }
    else if (a === "copy") copyBuild(id, b);
  });
  [].forEach.call(doc.querySelectorAll("[data-copy]"), function (b) { b.addEventListener("click", function () { copyBuild(b.getAttribute("data-copy"), b); }); });

  /* ---------------- diagrams ---------------- */
  var LANE_TEXT = {
    brew: "Homebrew: runs brew info --json=v2 --installed through a login shell, decodes the JSON, skips formulae that are not actually installed, and takes a Replace with suggestion from the disable or deprecation fields.",
    npm: "npm: lists global packages with npm ls -g --json --depth=0 and asks npm outdated -g --json for newer versions (it exits 1 when something is outdated, which is ignored). npm view <package> deprecated supplies deprecation notices.",
    cargo: "cargo: parses cargo install --list (only the top-level lines; crates installed from a path or git URL are marked because crates.io says nothing about them) and asks the crates.io API for each newest stable version, the only request DepDeck makes itself."
  };
  var ddg = $("dg-dd");
  function setLane(n, quiet) {
    [].forEach.call(ddg.querySelectorAll(".lane"), function (g) { g.classList.toggle("act", g.getAttribute("data-lane") === n); });
    [].forEach.call(ddg.querySelectorAll("[data-lane].chip"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lane") === n)); });
    $("dg-dd-note").textContent = LANE_TEXT[n];
    if (!quiet) play("ratchet", 3);
  }
  ddg.addEventListener("click", function (e) { var b = e.target.closest("button[data-lane]"); if (b) setLane(b.getAttribute("data-lane")); });
  setLane("brew", true);

  var shg = $("dg-sh"), SIZES = { taskbar: 30, dock: 44, column: 172, strip: 118, folders: 138 }, MW = 960, MH = 600, K = 0.23;
  var EDGE_TEXT = {
    Right: "Widgets on the right: the panel takes a column on the right, the folders take the left, the taskbar the bottom.",
    Left: "Widgets on the left: the folders move to the opposite side, so the two columns never collide.",
    Top: "Widgets on top: the panel is a strip along the top. Folders keep to the free side.",
    Bottom: "Widgets on the bottom: the panel is a strip just above the taskbar."
  };
  function drawMap(edge, quiet) {
    var z = L.layout(MW, MH, { showTaskbar: true, showWidgets: true, showFolders: true, edge: edge }, SIZES);
    var free = L.freeArea({ x: 0, y: 0, w: MW, h: MH }, [z.taskbar, z.widgets, z.folders]);
    function r(o, cls, label) {
      if (!o) return "";
      var x = 9 + o.x * K, y = 5 + o.y * K, w = o.w * K, h = o.h * K;
      return '<rect class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2"/>' +
        (label ? '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (y + h / 2 + 3).toFixed(1) + '" text-anchor="middle" class="mt">' + label + '</text>' : "");
    }
    $("dg-map").innerHTML = r({ x: 0, y: 0, w: MW, h: MH }, "scr") + r(z.taskbar, "z tb", "taskbar") + r(z.widgets, "z wd", "widgets") + r(z.folders, "z fo", "folders") + r(free, "free", "windows");
    $("dg-sh-note").textContent = (edge ? EDGE_TEXT[edge] + " " : "") + "Each service publishes its own strip into the shared settings; everyone else cuts those strips out of the screen, trimming the side that loses the least (DesktopLayout.cut), plus an 8 pt gap. Windows are kept in the dashed area: " + Math.round(free.w) + " by " + Math.round(free.h) + " of " + MW + " by " + MH + " here.";
    [].forEach.call(shg.querySelectorAll("[data-edge]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-edge") === edge)); });
    if (!quiet) play("spanner");
  }
  shg.addEventListener("click", function (e) { var b = e.target.closest("button[data-edge]"); if (b) drawMap(b.getAttribute("data-edge")); });
  drawMap("Right", true);
  $("dg-sh-note").textContent = "launchd starts each of the four services at login and restarts one that crashes, so one misbehaving part never takes the others down. They share ShellKit: the Aero look, desktop-level windows, one preferences domain with a changed notification every service listens to, and a tiling map of the screen. " + $("dg-sh-note").textContent;

  // diagram flow runs only while the figure is on screen and the tab is visible (CSS gates it on motion)
  if (root.IntersectionObserver) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { x.target.classList.toggle("run", x.isIntersecting); }); });
    [ddg, shg].forEach(function (f) { io.observe(f); });
  } else { ddg.classList.add("run"); shg.classList.add("run"); }
  doc.addEventListener("visibilitychange", function () { [ddg, shg].forEach(function (f) { f.classList.toggle("hid", doc.hidden); }); });
  lamps();
})(window);

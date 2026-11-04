/* Desktop Shell recreation: Luna taskbar, Start menu, iOS-style folders, Aero widgets, drawn windows.
   Layout rules come from logic.js (a port of the app's tiling map); everything else is sample data. */
(function (root) {
  "use strict";
  var D = root.MT_DATA, L = root.MT_LOGIC, S = root.MT_SFX;
  var W = 960, H = 600, SIZES = { taskbar: 30, dock: 44, column: 172, strip: 118, folders: 138 };
  var reduce = function () { return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce() ? 0 : ms); }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var FILE_ICON = { doc: "doc", pdf: "doc", csv: "doc", zip: "zip", dmg: "zip", image: "image", png: "image", music: "music", code: "code", folder: "folder" };
  var TYPE_COLOR = { doc: "#6ea0f5", pdf: "#6ea0f5", csv: "#6ea0f5", zip: "#e7b84e", dmg: "#e7b84e", image: "#59b36c", png: "#59b36c", music: "#f4476a", code: "#2f7fd8", folder: "#f0c24b" };
  function g(id, size, cls) { size = size || 16; return '<svg class="gi ' + (cls || "") + '" width="' + size + '" height="' + size + '" aria-hidden="true"><use href="#g-' + id + '"/></svg>'; }
  function app(id) { return D.apps.filter(function (a) { return a.id === id; })[0]; }
  var WALL =
    '<svg class="wall" viewBox="0 0 960 600" preserveAspectRatio="none" aria-hidden="true"><defs>' +
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d6fd6"/><stop offset=".55" stop-color="#78b4f2"/><stop offset="1" stop-color="#d4ecff"/></linearGradient>' +
    '<linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc24a"/><stop offset=".5" stop-color="#4c9a2c"/><stop offset="1" stop-color="#2f6f1c"/></linearGradient>' +
    '<radialGradient id="cloud"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="960" height="600" fill="url(#sky)"/>' +
    '<ellipse cx="190" cy="150" rx="150" ry="34" fill="url(#cloud)"/><ellipse cx="300" cy="170" rx="110" ry="26" fill="url(#cloud)"/>' +
    '<ellipse cx="640" cy="90" rx="170" ry="30" fill="url(#cloud)"/><ellipse cx="780" cy="120" rx="120" ry="24" fill="url(#cloud)"/>' +
    '<path d="M0 430 C 160 340 360 330 560 390 S 860 400 960 350 V600 H0 Z" fill="url(#hill)"/>' +
    '<path d="M0 500 C 220 440 420 470 640 450 S 880 430 960 450 V600 H0 Z" fill="#3b8a22" opacity=".55"/></svg>';

  function init() {
    var stage = document.getElementById("sh-stage"), statusEl = document.getElementById("sh-status"), zonesBox = document.getElementById("sh-zones");
    var viewport = document.getElementById("sh-viewport");
    var st, tid = 0, toastTimer = null, hovering = false;

    function fresh() {
      return {
        s: Object.assign({}, D.settingsDefaults), collapsed: false, pinned: D.defaultPinned.slice(), counts: {},
        order: null, svc: { taskbar: { run: true, dis: false }, folders: { run: true, dis: false }, widgets: { run: true, dis: false }, hotkeys: { run: true, dis: false } },
        wins: [], z: 10, startOpen: false, query: "", files: [], openFolder: null, playing: true, pos: 62, battery: { level: 78, charging: true }, cpu: 0.22, mem: 0.58,
        started: false, cal: new Date()
      };
    }
    function say(msg) { statusEl.textContent = msg; }
    function toast(msg) {
      say(msg);
      var t = stage.querySelector(".balloon"); t.textContent = msg; t.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 4200);
    }

    /* ---- derived state ---- */
    function on(name) { return st.svc[name].run; }
    function zones() {
      var s = Object.assign({}, st.s);
      s.showTaskbar = true; // the bottom strip is always reserved: by the taskbar, or by the Dock when the taskbar is off
      s.showWidgets = st.s.showWidgets && on("widgets") && !st.collapsed;
      s.showFolders = st.s.showFolders && on("folders");
      var sizes = Object.assign({}, SIZES); sizes.taskbar = st.s.showTaskbar && on("taskbar") ? SIZES.taskbar : SIZES.dock;
      return L.layout(W, H, s, sizes);
    }
    function taskbarShown() { return st.s.showTaskbar && on("taskbar"); }
    function windowArea(z) {
      return L.freeArea({ x: 0, y: 0, w: W, h: H }, st.s.keepWindowsClear ? [z.taskbar, z.widgets, z.folders] : [z.taskbar]);
    }
    function folderList() {
      var list = D.folders.map(function (f) { return f; });
      if (st.s.foldersIncludeDownloads) list = list.concat([{ id: "downloads", title: "Downloads", color: "#3b82f0", items: D.downloads.map(function (d) { return { name: d.name, type: d.type }; }) }]);
      if (st.order) {
        var pos = function (f) { var i = st.order.indexOf(f.id); return i < 0 ? 99 : i; };
        list = list.slice().sort(function (a, b) { return pos(a) - pos(b); });
      }
      return list;
    }

    /* ---- scaffold ---- */
    stage.innerHTML = WALL +
      '<div class="zones" id="sh-zoneview" aria-hidden="true"></div>' +
      '<button type="button" class="finder-icon" id="sh-finder" aria-label="Macintosh HD (Finder\'s own desktop icon)">' + g("computer", 40) + '<span>Macintosh HD</span></button>' +
      '<div class="folders" id="sh-folders" role="group" aria-label="Desktop folders"></div>' +
      '<div class="widgets" id="sh-widgets" role="region" aria-label="Desktop widgets"></div>' +
      '<div class="windows" id="sh-wins"></div>' +
      '<div class="fold-overlay" id="sh-overlay" hidden></div>' +
      '<div class="dock" id="sh-dock" aria-label="macOS Dock (the real one, back while the taskbar is off)"></div>' +
      '<div class="taskbar" id="sh-bar" role="toolbar" aria-label="Taskbar"></div>' +
      '<div class="start" id="sh-start" role="menu" aria-label="Start menu" hidden></div>' +
      '<div id="sh-fly"></div>' +
      '<div class="modal" id="sh-modal" hidden></div>' +
      '<div class="balloon" role="status" hidden></div>';
    var $ = function (id) { return document.getElementById(id); };
    var elFolders = $("sh-folders"), elWidgets = $("sh-widgets"), elWins = $("sh-wins"), elOverlay = $("sh-overlay"), elDock = $("sh-dock"),
      elBar = $("sh-bar"), elStart = $("sh-start"), elFly = $("sh-fly"), elModal = $("sh-modal"), elZones = $("sh-zoneview"), elFinder = $("sh-finder");

    /* ---- layout application ---- */
    function place(el, r) {
      if (!r) { el.hidden = true; return; }
      el.hidden = false; el.style.left = r.x + "px"; el.style.top = r.y + "px"; el.style.width = r.w + "px"; el.style.height = r.h + "px";
    }
    function relayout() {
      var z = zones();
      // taskbar / dock
      elBar.hidden = !taskbarShown();
      elDock.hidden = taskbarShown();
      var bottom = SIZES.taskbar;
      elBar.style.height = bottom + "px";
      elDock.style.height = SIZES.dock + "px";
      // widgets
      var wz = st.s.showWidgets && on("widgets") ? z.widgets : null;
      elWidgets.hidden = !(st.s.showWidgets && on("widgets"));
      elWidgets.className = "widgets edge-" + st.s.edge.toLowerCase() + (st.collapsed ? " collapsed" : "");
      if (!elWidgets.hidden) {
        if (st.collapsed) {
          var horiz = st.s.edge === "Top" || st.s.edge === "Bottom", full = L.layout(W, H, Object.assign({}, st.s, { showTaskbar: true, showFolders: false, showWidgets: true }), Object.assign({}, SIZES, { taskbar: taskbarShown() ? SIZES.taskbar : SIZES.dock })).widgets;
          var tab = horiz ? { x: full.x + full.w / 2 - 36, y: st.s.edge === "Top" ? full.y : full.y + full.h - 22, w: 72, h: 22 } : { x: st.s.edge === "Right" ? full.x + full.w - 22 : full.x, y: full.y + full.h / 2 - 36, w: 22, h: 72 };
          place(elWidgets, tab);
        } else place(elWidgets, wz);
        renderWidgets();
      }
      // folders
      elFolders.hidden = !(st.s.showFolders && on("folders"));
      if (!elFolders.hidden) { place(elFolders, z.folders); renderFolders(); }
      // finder's own icon: top right of what is left
      elFinder.hidden = st.s.hideFinderIcons;
      var rest = L.freeArea({ x: 0, y: 0, w: W, h: H }, [z.taskbar, z.widgets, z.folders]);
      elFinder.style.left = Math.max(rest.x, rest.x + rest.w - 92) + "px"; elFinder.style.top = (rest.y + 12) + "px";
      // reserved strips overlay
      elZones.hidden = !zonesBox.checked;
      if (zonesBox.checked) {
        var free = windowArea(z), parts = [];
        [["taskbar", z.taskbar, st.s.showTaskbar && on("taskbar") ? "taskbar" : "Dock"], ["widgets", z.widgets, "widgets"], ["folders", z.folders, "folders"]].forEach(function (p) {
          if (p[1]) parts.push('<div class="zone z-' + p[0] + '" style="left:' + p[1].x + 'px;top:' + p[1].y + 'px;width:' + p[1].w + 'px;height:' + p[1].h + 'px"><b>' + p[2] + ' strip</b></div>');
        });
        parts.push('<div class="zone z-free" style="left:' + free.x + 'px;top:' + free.y + 'px;width:' + free.w + 'px;height:' + free.h + 'px"><b>where app windows may go' + (st.s.keepWindowsClear ? "" : " (tiling is off: only the bottom strip is kept clear)") + '</b></div>');
        elZones.innerHTML = parts.join("");
      }
      renderBar(); renderDock();
      st.wins.forEach(clampWindow);
    }

    /* ---- widgets ---- */
    function renderWidgets() {
      var now = st.cal, grid = L.monthGrid(now.getFullYear(), now.getMonth()), today = new Date();
      var title = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][now.getMonth()] + " " + now.getFullYear();
      var cal = '<table class="mini-cal" aria-label="' + title + '"><caption>' + title + '</caption><thead><tr>' + "SMTWTFS".split("").map(function (d, i) { return '<th scope="col" abbr="' + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i] + '">' + d + '</th>'; }).join("") + '</tr></thead><tbody>' +
        grid.map(function (w) { return "<tr>" + w.map(function (d) { var t = d && d === today.getDate() && now.getMonth() === today.getMonth() && now.getFullYear() === today.getFullYear(); return "<td" + (t ? ' class="today" aria-current="date"' : "") + ">" + (d || "") + "</td>"; }).join("") + "</tr>"; }).join("") + '</tbody></table>';
      var np = D.nowPlaying, bat = st.battery, used = D.storage.totalGB - D.storage.freeGB;
      elWidgets.innerHTML =
        '<button type="button" class="w-fold" data-act="fold" aria-label="' + (st.collapsed ? "Unfold the widget panel" : "Fold the widget panel into a tab") + '" title="' + (st.collapsed ? "Unfold" : "Fold into a tab") + '">' + (st.collapsed ? "◀" : "▶") + '</button>' +
        (st.collapsed ? "" : '<div class="w-cards">' +
        (st.s.showNowPlaying ? '<section class="wc np" aria-label="Now Playing (sample)"><div class="np-top"><div class="art' + (st.playing ? " live" : "") + '">' + (st.s.youtubeLoops ? '<i title="With no Apple Music motion artwork, the app loops a part of the song\'s YouTube video">loop</i>' : "") + '</div><div class="np-t"><b>' + esc(np.title) + '</b><span>' + esc(np.artist) + '</span></div></div>' +
          '<input class="scrub" type="range" min="0" max="' + np.length + '" value="' + Math.round(st.pos) + '" data-act="scrub" aria-label="Song position"><div class="np-time"><span>' + L.mmss(st.pos) + '</span><span>-' + L.mmss(np.length - st.pos) + '</span></div>' +
          '<div class="np-ctl"><button type="button" data-act="prev" aria-label="Previous">' + g("prev", 14) + '</button><button type="button" data-act="play" aria-label="' + (st.playing ? "Pause" : "Play") + '">' + g(st.playing ? "pause" : "play", 16) + '</button><button type="button" data-act="next" aria-label="Next">' + g("next", 14) + '</button></div></section>' : "") +
        '<section class="wc cal" aria-label="Calendar">' + cal + '</section>' +
        '<section class="wc bat" aria-label="Battery (sample)"><b>Battery</b><button type="button" class="batt" data-act="plug" aria-label="Battery ' + bat.level + ' percent, ' + (bat.charging ? "charging" : "on battery") + '. Press to plug or unplug."><span class="cell"><i style="width:' + bat.level + '%"></i></span><span class="pct">' + bat.level + '%</span>' + (bat.charging ? '<span class="bolt">' + g("bolt", 12) + '</span>' : "") + '</button></section>' +
        '<section class="wc sys" aria-label="CPU and memory (sample)"><b>CPU &amp; Memory</b><div class="meter"><span>CPU</span><i><u style="width:' + Math.round(st.cpu * 100) + '%"></u></i><em>' + Math.round(st.cpu * 100) + '%</em></div><div class="meter"><span>RAM</span><i><u style="width:' + Math.round(st.mem * 100) + '%"></u></i><em>' + Math.round(st.mem * 100) + '%</em></div></section>' +
        '<section class="wc disk" aria-label="Storage (sample)"><b>Storage</b><div class="meter"><i><u style="width:' + Math.round(used / D.storage.totalGB * 100) + '%"></u></i></div><small>' + D.storage.freeGB + ' GB free of ' + D.storage.totalGB + ' GB</small></section></div>');
    }
    elWidgets.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return; var a = b.getAttribute("data-act");
      if (a === "fold") { st.collapsed = !st.collapsed; S.play("toggle"); relayout(); say(st.collapsed ? "Widget panel folded into a tab; its strip is given back to windows." : "Widget panel unfolded."); }
      else if (a === "play") { st.playing = !st.playing; S.play("click"); renderWidgets(); }
      else if (a === "prev") { st.pos = 0; S.play("click"); renderWidgets(); }
      else if (a === "next") { st.pos = 0; S.play("click"); toast("Sample Song has no next track. The real widget controls Apple Music."); renderWidgets(); }
      else if (a === "plug") { st.battery.charging = !st.battery.charging; S.play("toggle"); renderWidgets(); }
    });
    elWidgets.addEventListener("input", function (e) { if (e.target.getAttribute("data-act") === "scrub") { st.pos = +e.target.value; var t = elWidgets.querySelector(".np-time"); if (t) t.innerHTML = "<span>" + L.mmss(st.pos) + "</span><span>-" + L.mmss(D.nowPlaying.length - st.pos) + "</span>"; } });
    function tickWidgets() {
      if (document.hidden || !visible) return;
      var np = D.nowPlaying;
      if (st.playing) { st.pos += 1; if (st.pos >= np.length) st.pos = 0; }
      st.cpu = Math.min(0.9, Math.max(0.05, st.cpu + (Math.random() - 0.5) * 0.12));
      st.mem = Math.min(0.85, Math.max(0.4, st.mem + (Math.random() - 0.5) * 0.02));
      if (st.battery.charging && st.battery.level < 100 && Math.random() < 0.05) st.battery.level++;
      var a = document.activeElement;
      if (!elWidgets.hidden && !st.collapsed && !(a && elWidgets.contains(a) && a.type === "range")) {
        var fa = a && elWidgets.contains(a) ? a.getAttribute("data-act") : null;
        renderWidgets(); if (fa) { var again = elWidgets.querySelector('[data-act="' + fa + '"]'); if (again) again.focus(); }
      }
    }

    /* ---- folders ---- */
    function folderIcons(items) {
      var n = items.slice(0, 9).map(function (it) { return '<i style="background:' + (TYPE_COLOR[it.type] || "#bbb") + '"></i>'; });
      while (n.length < 9) n.push("<i class=\"blank\"></i>");
      return n.join("");
    }
    function renderFolders() {
      var list = folderList();
      elFolders.innerHTML = '<ul class="f-grid">' + list.map(function (f) {
        return '<li><button type="button" class="ftile" draggable="true" data-id="' + f.id + '" aria-label="' + esc(f.title) + ' folder, ' + f.items.length + ' items. Alt and arrow keys rearrange."><span class="fbox">' + folderIcons(f.items) + '</span><span class="flabel">' + esc(f.title) + '</span></button></li>';
      }).join("") + '</ul><p class="f-hint">Drag to rearrange</p>';
    }
    var dragId = null;
    elFolders.addEventListener("dragstart", function (e) { var t = e.target.closest(".ftile"); if (!t) return; dragId = t.getAttribute("data-id"); try { e.dataTransfer.setData("text/plain", dragId); e.dataTransfer.effectAllowed = "move"; } catch (x) {} t.classList.add("drag"); });
    elFolders.addEventListener("dragend", function () { dragId = null; Array.prototype.forEach.call(elFolders.querySelectorAll(".drag"), function (n) { n.classList.remove("drag"); }); });
    elFolders.addEventListener("dragover", function (e) { if (dragId) e.preventDefault(); });
    elFolders.addEventListener("drop", function (e) {
      var t = e.target.closest(".ftile"); if (!t || !dragId) return; e.preventDefault();
      move(dragId, t.getAttribute("data-id")); dragId = null;
    });
    function move(id, targetId) {
      var ids = folderList().map(function (f) { return f.id; }), from = ids.indexOf(id), to = ids.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]); st.order = ids; S.play("pop"); renderFolders();
      var again = elFolders.querySelector('[data-id="' + id + '"]'); if (again) again.focus();
      say("Folders rearranged; the app remembers the order.");
    }
    elFolders.addEventListener("keydown", function (e) {
      var t = e.target.closest(".ftile"); if (!t || !e.altKey) return;
      var ids = folderList().map(function (f) { return f.id; }), i = ids.indexOf(t.getAttribute("data-id")), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d && ids[i + d]) { e.preventDefault(); move(ids[i], ids[i + d]); }
    });
    elFolders.addEventListener("click", function (e) {
      var t = e.target.closest(".ftile"); if (!t) return;
      var f = folderList().filter(function (x) { return x.id === t.getAttribute("data-id"); })[0];
      if (f) openFolder(f, t);
    });
    function rel(el) { var r = el.getBoundingClientRect(), s = r.width / el.offsetWidth || 1, sr = stage.getBoundingClientRect(); return { x: (r.left - sr.left) / s, y: (r.top - sr.top) / s, w: r.width / s, h: r.height / s }; }
    var overlayFrom = null;
    function openFolder(f, tile) {
      st.openFolder = { stack: [{ title: f.title, items: f.items }] }; overlayFrom = tile; S.play("pop");
      renderOverlay(true);
    }
    function renderOverlay(animate) {
      var o = st.openFolder; if (!o) { elOverlay.hidden = true; return; }
      var cur = o.stack[o.stack.length - 1], z = zones(), area = windowArea(z);
      var pw = 380, ph = 300, px = area.x + (area.w - pw) / 2, py = area.y + (area.h - ph) / 2;
      elOverlay.hidden = false;
      elOverlay.innerHTML = '<div class="fo-dim" data-act="close"></div><div class="fo-panel" role="dialog" aria-label="' + esc(cur.title) + ' folder" style="left:' + px + 'px;top:' + py + 'px;width:' + pw + 'px;height:' + ph + 'px">' +
        '<div class="fo-head">' + (o.stack.length > 1 ? '<button type="button" class="fo-back" data-act="back" aria-label="Back">‹</button>' : "") + '<strong>' + esc(cur.title) + '</strong><button type="button" class="fo-x" data-act="close" aria-label="Close folder">' + '×' + '</button></div>' +
        '<ul class="fo-grid">' + cur.items.map(function (it, i) {
          return '<li><button type="button" class="fo-item" data-i="' + i + '">' + g(FILE_ICON[it.type] || "doc", 44) + '<span>' + esc(it.name) + '</span></button></li>';
        }).join("") + '</ul><p class="fo-foot">Click a file to open it, a folder to zoom in. Esc or a click outside closes.</p></div>';
      var panel = elOverlay.querySelector(".fo-panel");
      if (animate && overlayFrom && !reduce()) {
        var r = rel(overlayFrom), dx = r.x + r.w / 2 - (px + pw / 2), dy = r.y + r.h / 2 - (py + ph / 2);
        panel.style.transform = "translate(" + dx + "px," + dy + "px) scale(.2)"; panel.style.opacity = "0";
        requestAnimationFrame(function () { requestAnimationFrame(function () { panel.style.transform = ""; panel.style.opacity = ""; }); });
      }
      var first = elOverlay.querySelector(".fo-item") || elOverlay.querySelector(".fo-x"); if (first) first.focus({ preventScroll: true });
    }
    function closeFolder() {
      if (!st.openFolder) return; st.openFolder = null; elOverlay.hidden = true; S.play("close");
      if (overlayFrom && document.body.contains(overlayFrom)) overlayFrom.focus({ preventScroll: true });
    }
    elOverlay.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act],.fo-item"); if (!b) return;
      if (b.classList.contains("fo-item")) {
        var cur = st.openFolder.stack[st.openFolder.stack.length - 1], it = cur.items[+b.getAttribute("data-i")];
        if (it.type === "folder") { st.openFolder.stack.push({ title: it.name, items: it.items || [] }); S.play("pop"); renderOverlay(false); }
        else { S.play("click"); toast(it.name + " would open in its default app on your Mac."); }
        return;
      }
      var a = b.getAttribute("data-act");
      if (a === "close") closeFolder();
      if (a === "back") { st.openFolder.stack.pop(); S.play("pop"); renderOverlay(false); }
    });

    /* ---- Dock (the macOS Dock, back while the taskbar is off) ---- */
    function renderDock() {
      elDock.innerHTML = '<div class="dock-bar">' + ["finder", "browser", "ghostty", "calendar", "notes", "music", "code"].map(function (id) { return '<button type="button" data-app="' + id + '" aria-label="' + app(id).name + '">' + g(app(id).glyph, 30) + '</button>'; }).join("") + '</div>';
    }
    elDock.addEventListener("click", function (e) { var b = e.target.closest("[data-app]"); if (b) openApp(b.getAttribute("data-app")); });

    /* ---- taskbar ---- */
    function renderBar() {
      var topWin = topVisible();
      elBar.innerHTML =
        '<button type="button" class="start-btn' + (st.startOpen ? " on" : "") + (st.started ? "" : " pulse") + '" id="sh-startbtn" aria-haspopup="menu" aria-expanded="' + st.startOpen + '" aria-controls="sh-start"><span class="fruit">' + g("fruit", 17) + '</span><em>start</em></button>' +
        '<span class="ql" role="group" aria-label="Quick launch">' + D.quickLaunch.map(function (id) { return '<button type="button" data-app="' + id + '" aria-label="' + app(id).name + '" title="' + app(id).name + '">' + g(app(id).glyph, 20) + '</button>'; }).join("") + '</span>' +
        '<span class="tasks" role="group" aria-label="Open apps">' + st.wins.map(function (w) {
          var active = topWin && topWin.id === w.id;
          return '<button type="button" class="task' + (active ? " on" : "") + '" data-win="' + w.id + '" aria-pressed="' + !!active + '">' + g(w.glyph, 16) + '<span>' + esc(w.title) + '</span></button>';
        }).join("") + '</span>' +
        '<button type="button" class="dl-btn" data-act="downloads">' + g("download", 16) + '<span>Downloads</span></button>' +
        '<span class="tray"><button type="button" class="clock" id="sh-clock" aria-label="Clock, opens Calendar">' + L.clock(new Date()) + '</button></span>';
    }
    function topVisible() {
      var v = st.wins.filter(function (w) { return !w.min; }); if (!v.length) return null;
      return v.reduce(function (a, b) { return b.z > a.z ? b : a; });
    }
    elBar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.id === "sh-startbtn") { toggleStart(); return; }
      if (b.hasAttribute("data-app")) { openApp(b.getAttribute("data-app")); return; }
      if (b.hasAttribute("data-win")) {
        var w = winById(+b.getAttribute("data-win")), top = topVisible();
        if (w && !w.min && top && top.id === w.id) { w.min = true; S.play("close"); } else if (w) { w.min = false; focusWin(w); S.play("open"); }
        syncWins(); renderBar(); return;
      }
      if (b.getAttribute("data-act") === "downloads") { openExplorer("downloads"); return; }
      if (b.id === "sh-clock") openApp("calendar");
    });
    elBar.addEventListener("contextmenu", function (e) {
      var b = e.target.closest("[data-win]"); if (!b) return; e.preventDefault();
      var w = winById(+b.getAttribute("data-win")); if (!w) return;
      var r = rel(b);
      showCtx(r.x, r.y - 56, [{ label: "Hide", act: function () { w.min = true; syncWins(); renderBar(); } }, { label: "Quit", act: function () { closeWin(w.id); } }]);
    });

    /* ---- windows ---- */
    function winById(id) { return st.wins.filter(function (w) { return w.id === id; })[0]; }
    function focusWin(w) { w.z = ++st.z; syncWins(); }
    function openApp(id, opts) {
      var a = app(id); if (!a) return;
      closeStart(); S.play("open"); st.started = true;
      st.counts[id] = (st.counts[id] || 0) + 1;
      var existing = st.wins.filter(function (w) { return w.app === id && !w.explorer; })[0];
      if (existing) { existing.min = false; focusWin(existing); renderBar(); return; }
      newWin({ app: id, title: a.name, glyph: a.glyph, kind: a.kind, w: a.kind === "terminal" ? 470 : 420, h: a.kind === "terminal" ? 290 : 280 });
    }
    function openExplorer(place) {
      closeStart(); var p = D.places.filter(function (x) { return x.id === place; })[0] || { id: place, title: place, glyph: "folder" };
      var existing = st.wins.filter(function (w) { return w.explorer === place; })[0];
      if (existing) { existing.min = false; focusWin(existing); renderBar(); S.play("open"); return; }
      S.play("open"); newWin({ app: "finder", explorer: place, title: p.title, glyph: p.glyph, kind: "explorer", w: 460, h: 300 });
    }
    function newWin(o) {
      var z = zones(), area = windowArea(z), n = st.wins.length;
      o.w = Math.min(o.w, area.w); o.h = Math.min(o.h, area.h);
      o.x = Math.round(area.x + (area.w - o.w) / 2 + ((n % 4) - 1.5) * 22); o.y = Math.round(area.y + (area.h - o.h) / 2 + ((n % 4) - 1.5) * 18);
      o.id = ++tid; o.z = ++st.z; o.min = false; o.log = o.kind === "terminal" ? ["Last login: " + new Date().toDateString() + " on ttys001", "Try: desktopctl status   (or desktopctl stop widgets)"] : null;
      st.wins.push(o); clampWindow(o); syncWins(); renderBar();
      var el = elWins.querySelector('[data-id="' + o.id + '"] .term-in, [data-id="' + o.id + '"] textarea'); if (el) el.focus({ preventScroll: true });
    }
    function closeWin(id) { st.wins = st.wins.filter(function (w) { return w.id !== id; }); S.play("close"); syncWins(); renderBar(); }
    function clampWindow(w) {
      var area = windowArea(zones());
      if (!st.s.keepWindowsClear) { w.y = Math.min(w.y, area.y + area.h - 24); return; }
      w.w = Math.min(w.w, area.w); w.h = Math.min(w.h, area.h);
      w.x = Math.max(area.x, Math.min(w.x, area.x + area.w - w.w)); w.y = Math.max(area.y, Math.min(w.y, area.y + area.h - w.h));
      var el = elWins.querySelector('[data-id="' + w.id + '"]'); if (el) { el.style.left = w.x + "px"; el.style.top = w.y + "px"; el.style.width = w.w + "px"; el.style.height = w.h + "px"; }
    }
    function content(w) {
      if (w.kind === "terminal") return '<div class="term" aria-label="Terminal"><div class="term-out" role="log" aria-live="polite">' + w.log.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join("") + '</div><label class="term-line"><span>~ %</span><input class="term-in" type="text" spellcheck="false" autocomplete="off" aria-label="Terminal input"></label></div>';
      if (w.kind === "browser") return '<div class="browser"><div class="addr">about:blank</div><div class="page">' + g("globe", 40) + '<p>A drawn browser. Nothing loads here.</p></div></div>';
      if (w.kind === "calendar") {
        var d = new Date(), grid = L.monthGrid(d.getFullYear(), d.getMonth());
        return '<div class="bigcal"><h4>' + ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()] + " " + d.getFullYear() + '</h4><table><thead><tr>' + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (x) { return "<th>" + x + "</th>"; }).join("") + '</tr></thead><tbody>' + grid.map(function (wk) { return "<tr>" + wk.map(function (x) { return "<td" + (x === d.getDate() ? ' class="today"' : "") + ">" + (x || "") + "</td>"; }).join("") + "</tr>"; }).join("") + '</tbody></table></div>';
      }
      if (w.kind === "explorer") return explorer(w.explorer);
      if (w.kind === "finder") return explorer("documents");
      if (["notes", "textedit", "code"].indexOf(w.app) >= 0) return '<textarea class="pad" aria-label="' + esc(w.title) + ' text" placeholder="A sample text area. Type here; nothing is saved."></textarea>';
      return '<div class="standin">' + g(w.glyph, 44) + '<p>A stand-in for ' + esc(w.title) + '.<br>The real app opens on your Mac.</p></div>';
    }
    function explorer(place) {
      var rows = [];
      if (place === "downloads") rows = D.downloads.map(function (d) { return { name: d.name, meta: d.when + " · " + d.size, type: d.type }; });
      else if (place === "documents") rows = [{ name: "thesis-draft.pdf", meta: "1.4 MB", type: "doc" }, { name: "budget.xlsx", meta: "88 KB", type: "doc" }, { name: "notes.txt", meta: "2 KB", type: "doc" }, { name: "Taxes", meta: "Folder", type: "folder" }];
      else if (place === "pictures") rows = D.folders[2].items.map(function (i) { return { name: i.name, meta: "Image", type: "image" }; });
      else if (place === "music") rows = D.folders[3].items.map(function (i) { return { name: i.name, meta: "Audio", type: "music" }; });
      else if (place === "desktop") rows = D.folders.map(function (f) { return { name: f.title, meta: f.items.length + " items", type: "folder" }; });
      else rows = [{ name: "Macintosh HD", meta: place === "computer" ? "512 GB, 187 GB free (sample)" : "", type: "folder" }];
      return '<div class="expl"><div class="expl-side"><b>' + (place === "downloads" ? "Downloads tasks" : "File tasks") + '</b><span>Open folder</span><span>Show newest</span></div><ul class="expl-list">' +
        rows.map(function (r) { return '<li><button type="button" class="exrow" data-name="' + esc(r.name) + '">' + g(FILE_ICON[r.type] || "doc", 22) + '<span class="exn">' + esc(r.name) + '</span><span class="exm">' + esc(r.meta) + '</span></button></li>'; }).join("") + '</ul></div>';
    }
    function winHtml(w) {
      return '<div class="titlebar" data-drag>' + g(w.glyph, 15) + '<span class="tt">' + esc(w.title) + '</span><span class="grow"></span>' +
        '<button type="button" class="tb" data-wact="min" aria-label="Minimize ' + esc(w.title) + '"><i class="min"></i></button><button type="button" class="tb x" data-wact="close" aria-label="Close ' + esc(w.title) + '"><svg width="9" height="9" aria-hidden="true"><use href="#i-x"/></svg></button></div><div class="client k-' + w.kind + '">' + content(w) + '</div>';
    }
    function syncWins() {
      var seen = {};
      st.wins.forEach(function (w) {
        seen[w.id] = true;
        var el = elWins.querySelector('[data-id="' + w.id + '"]');
        if (!el) {
          el = document.createElement("div"); el.className = "win"; el.setAttribute("data-id", w.id); el.setAttribute("role", "dialog"); el.setAttribute("aria-label", w.title);
          el.innerHTML = winHtml(w); elWins.appendChild(el);
        }
        el.style.left = w.x + "px"; el.style.top = w.y + "px"; el.style.width = w.w + "px"; el.style.height = w.h + "px"; el.style.zIndex = w.z; el.hidden = !!w.min;
        el.classList.toggle("active", topVisible() && topVisible().id === w.id);
      });
      Array.prototype.forEach.call(elWins.children, function (el) { if (!seen[el.getAttribute("data-id")]) elWins.removeChild(el); });
      renderBar();
    }
    elWins.addEventListener("pointerdown", function (e) {
      var el = e.target.closest(".win"); if (!el) return;
      var w = winById(+el.getAttribute("data-id")); if (!w) return;
      if (!(topVisible() && topVisible().id === w.id)) { w.z = ++st.z; el.style.zIndex = w.z; Array.prototype.forEach.call(elWins.children, function (x) { x.classList.toggle("active", x === el); }); renderBar(); }
      var bar = e.target.closest("[data-drag]"); if (!bar || e.target.closest("button")) return;
      var sr = stage.getBoundingClientRect(), s = sr.width / W, sx = e.clientX, sy = e.clientY, ox = w.x, oy = w.y;
      bar.setPointerCapture(e.pointerId); el.classList.add("moving");
      function mv(ev) { w.x = ox + (ev.clientX - sx) / s; w.y = oy + (ev.clientY - sy) / s; el.style.left = w.x + "px"; el.style.top = w.y + "px"; }
      function up() { bar.removeEventListener("pointermove", mv); bar.removeEventListener("pointerup", up); bar.removeEventListener("pointercancel", up); el.classList.remove("moving"); clampWindow(w); el.style.left = w.x + "px"; el.style.top = w.y + "px"; }
      bar.addEventListener("pointermove", mv); bar.addEventListener("pointerup", up); bar.addEventListener("pointercancel", up);
    });
    elWins.addEventListener("click", function (e) {
      var el = e.target.closest(".win"); if (!el) return; var w = winById(+el.getAttribute("data-id"));
      var b = e.target.closest("[data-wact]");
      if (b) { if (b.getAttribute("data-wact") === "close") closeWin(w.id); else { w.min = true; S.play("close"); syncWins(); } return; }
      var row = e.target.closest(".exrow"); if (row) { S.play("click"); toast(row.getAttribute("data-name") + " would open on your Mac."); }
    });
    elWins.addEventListener("keydown", function (e) {
      var inp = e.target.closest(".term-in"); if (!inp) { if (e.key === "Escape" && e.target.closest(".win")) { var w0 = winById(+e.target.closest(".win").getAttribute("data-id")); w0.min = true; syncWins(); } return; }
      if (e.key.length === 1) S.play("key");
      if (e.key !== "Enter") return;
      var el = inp.closest(".win"), w = winById(+el.getAttribute("data-id")), line = inp.value; inp.value = "";
      w.log.push("~ % " + line); runCommand(line, w);
      var out = el.querySelector(".term-out"); out.innerHTML = w.log.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join(""); out.scrollTop = out.scrollHeight;
    });

    /* ---- terminal: desktopctl, as in the repo's script ---- */
    var PIDS = { taskbar: 4211, folders: 4212, widgets: 4213, hotkeys: 4214 };
    function runCommand(line, w) {
      var t = line.trim(); if (!t) return;
      if (t === "clear") { w.log.length = 0; return; }
      if (t === "help") { w.log.push("desktopctl status | stop | start | restart | disable | enable  <taskbar|folders|widgets|hotkeys|all>"); return; }
      var cmd = L.parseCtl(t, D.services);
      if (cmd.error) { w.log.push(cmd.error); return; }
      if (cmd.usage) { w.log.push("usage: desktopctl status | stop | start | restart | disable | enable  <service|all>"); return; }
      cmd.targets.forEach(function (name) {
        var s = st.svc[name];
        if (cmd.verb === "status") w.log.push((name + "        ").slice(0, 8) + " " + (s.run ? "running (pid " + PIDS[name] + ")" : "stopped") + (s.dis ? " (disabled at login)" : ""));
        else { if (cmd.verb === "stop") s.run = false; if (cmd.verb === "start" || cmd.verb === "restart") s.run = true; if (cmd.verb === "disable") { s.run = false; s.dis = true; } if (cmd.verb === "enable") { s.dis = false; s.run = true; }
          w.log.push(name + " " + { stop: "stopped", start: "started", restart: "restarted", disable: "disabled", enable: "enabled" }[cmd.verb]); }
      });
      if (cmd.verb !== "status") { relayout(); if (cmd.targets.indexOf("taskbar") >= 0 && !on("taskbar")) say("Taskbar stopped: the normal Dock is back."); }
    }

    /* ---- Start menu ---- */
    function toggleStart() { if (st.startOpen) closeStart(); else openStart(); }
    function openStart() {
      if (!taskbarShown()) return;
      st.startOpen = true; st.started = true; st.query = ""; st.files = []; closeFly(0); renderStart(); elStart.hidden = false; S.play("start");
      elStart.style.left = "0px"; elStart.style.bottom = SIZES.taskbar + "px"; renderBar();
      var first = elStart.querySelector(".srow"); if (first) first.focus({ preventScroll: true });
    }
    function closeStart() {
      if (!st.startOpen) return; st.startOpen = false; elStart.hidden = true; closeFly(0); closeCtx(); renderBar();
      var b = $("sh-startbtn"); if (b && elStart.contains(document.activeElement)) b.focus({ preventScroll: true });
    }
    function srow(o) {
      return '<button type="button" role="menuitem" class="srow' + (o.bold ? " bold" : "") + (o.arrow ? " has-sub" : "") + '" tabindex="-1" data-k="' + esc(o.k) + '"' + (o.disabled ? " disabled" : "") + '>' + (o.glyph ? g(o.glyph, o.big ? 26 : 22) : "") + '<span class="sl">' + esc(o.label) + '</span>' + (o.arrow ? '<span class="sa" aria-hidden="true">▸</span>' : "") + '</button>';
    }
    function startLeft() {
      if (st.query.trim()) {
        var apps = L.searchApps(D.apps, st.query), h = "";
        if (apps.length) h += '<div class="shd">Programs</div>' + apps.map(function (a) { return srow({ k: "app:" + a.id, glyph: a.glyph, label: a.name }); }).join("");
        if (st.files.length) h += '<div class="shd">Files</div>' + st.files.map(function (f) { return srow({ k: "file:" + f, glyph: "doc", label: f }); }).join("");
        if (!apps.length && !st.files.length) h += '<p class="none">No items match your search.</p>';
        return h;
      }
      var freq = L.frequent(st.counts, st.pinned, 5);
      return st.pinned.map(function (id) { return srow({ k: "app:" + id, glyph: app(id).glyph, label: app(id).name, big: 1 }); }).join("") +
        (freq.length ? '<hr>' + freq.map(function (id) { return srow({ k: "app:" + id, glyph: app(id).glyph, label: app(id).name }); }).join("") : "");
    }
    function renderStart() {
      elStart.innerHTML =
        '<div class="s-head"><span class="avatar">' + g("fruit", 26) + '</span><strong>' + esc(D.user) + '</strong></div>' +
        '<div class="s-body"><div class="s-left"><input class="s-search" type="search" placeholder="Search programs and files" aria-label="Search programs and files" value="' + esc(st.query) + '"><div class="s-list" id="sl-list">' + startLeft() + '</div>' +
        '<div class="s-all"><hr>' + srow({ k: "all", glyph: "play", label: "All Programs", bold: 1, arrow: 1 }) + '</div></div>' +
        '<div class="s-right">' + D.places.map(function (p) { return srow({ k: "place:" + p.id, glyph: p.glyph, label: p.title, bold: 1 }); }).join("") + '<hr>' +
        srow({ k: "recent", glyph: "clock", label: "My Recent Documents", bold: 1, arrow: 1 }) + srow({ k: "cp", glyph: "gear", label: "Control Panel" }) +
        srow({ k: "settings", glyph: "chart", label: "Desktop Settings", arrow: 1 }) + srow({ k: "spot", glyph: "computer", label: "Spotlight Search" }) + srow({ k: "run", glyph: "terminal", label: "Run… (Ghostty)" }) + '</div></div>' +
        '<div class="s-foot"><button type="button" class="sfoot" data-k="logoff">' + g("key", 20) + '<span>Log Off</span></button><button type="button" class="sfoot" data-k="off">' + g("off", 20) + '<span>Turn Off Computer</span></button></div>';
    }
    function refreshList() {
      var list = $("sl-list"); if (!list) return; list.innerHTML = startLeft();
    }
    var searchSeq = 0;
    elStart.addEventListener("input", function (e) {
      if (!e.target.classList.contains("s-search")) return;
      st.query = e.target.value; st.files = []; refreshList(); closeFly(0);
      var seq = ++searchSeq; if (!st.query.trim()) return;
      wait(300).then(function () { if (seq !== searchSeq) return; st.files = L.searchFiles(D.files, st.query); refreshList(); });
    });
    function startAction(k) {
      var a = k.split(":"), v = a.slice(1).join(":");
      if (a[0] === "app") openApp(v);
      else if (a[0] === "file") { closeStart(); toast(v + " would open in its default app on your Mac."); }
      else if (a[0] === "place") openExplorer(v);
      else if (a[0] === "cp") { closeStart(); toast("Control Panel opens System Settings on a Mac."); }
      else if (a[0] === "spot") { closeStart(); toast("On a Mac this sends ⌘Space to open Spotlight."); }
      else if (a[0] === "run") { closeStart(); openApp("ghostty"); }
      else if (a[0] === "logoff") { closeStart(); toast("Log Off does nothing here. On a Mac, macOS shows its usual confirmation first."); }
      else if (a[0] === "off") { showPower(); }
    }
    elStart.addEventListener("click", function (e) {
      var b = e.target.closest("[data-k]"); if (!b) return; var k = b.getAttribute("data-k");
      S.play("click");
      if (k === "all" || k === "recent" || k === "settings") { openSub(b, k); return; }
      startAction(k);
    });
    elStart.addEventListener("contextmenu", function (e) {
      var b = e.target.closest('[data-k^="app:"]'); if (!b) return; e.preventDefault(); appMenu(b, b.getAttribute("data-k").slice(4));
    });
    elStart.addEventListener("mouseover", function (e) {
      var b = e.target.closest(".srow"); if (!b) return; var k = b.getAttribute("data-k");
      if (k === "all" || k === "recent" || k === "settings") { if (!(flyAnchor && flyAnchor === b)) { clearTimeout(hoverT); hoverT = setTimeout(function () { openSub(b, k); }, 140); } }
      else if (b.closest(".s-left,.s-right")) { clearTimeout(hoverT); if (flyAnchor && !flyAnchor.contains(b)) closeFly(0); }
    });
    var hoverT = null, flyAnchor = null, flyLevels = [];
    function appMenu(row, id) {
      var r = rel(row), pinned = st.pinned.indexOf(id) >= 0;
      showCtx(r.x + 40, r.y + 10, [{ label: "Open", act: function () { openApp(id); } },
        { label: pinned ? "Unpin from Start menu" : "Pin to Start menu", act: function () { st.pinned = L.togglePin(st.pinned, id); S.play("toggle"); refreshList(); toast((pinned ? "Unpinned " : "Pinned ") + app(id).name + ". The app remembers your pins."); } }]);
    }
    function showCtx(x, y, items) {
      closeCtx(); var m = document.createElement("div"); m.className = "xpmenu ctx"; m.setAttribute("role", "menu");
      m.style.left = Math.min(x, W - 170) + "px"; m.style.top = Math.min(y, H - 80) + "px"; m.style.zIndex = 90;
      items.forEach(function (it) { var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem"); b.className = "xrow"; b.textContent = it.label; b.addEventListener("click", function () { closeCtx(); it.act(); }); m.appendChild(b); });
      m.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); closeCtx(); } if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); var bs = Array.prototype.slice.call(m.children), i = bs.indexOf(document.activeElement); bs[(i + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length].focus(); } });
      stage.appendChild(m); m.firstChild.focus();
    }
    function closeCtx() { var c = stage.querySelector(".xpmenu.ctx"); if (c) c.parentNode.removeChild(c); }

    /* cascading XP menus: level 0 hangs off a Start row, deeper levels off a flyout row */
    function closeFly(level) { while (flyLevels.length > level) { var m = flyLevels.pop(); m.el.parentNode && m.el.parentNode.removeChild(m.el); } if (level === 0) flyAnchor = null; }
    function menuItems(k) {
      if (k === "all") return D.apps.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (a) { return { label: a.name, glyph: a.glyph, ctx: a.id, act: function () { openApp(a.id); } }; });
      if (k === "recent") return D.recentDocuments.map(function (d) { return { label: d, glyph: "doc", act: function () { closeStart(); toast(d + " would open on your Mac."); } }; }).concat([{ sep: true }, { label: "Open Recents in Finder", glyph: "clock", act: function () { closeStart(); toast("Opens Finder's Recents on a Mac."); } }]);
      if (k === "settings") return D.settingsMenu.map(function (m) {
        if (m === "-") return { sep: true };
        if (m.key === "edge") return { label: m.label, enabled: st.s.showWidgets, sub: "edge" };
        var val = m.key === "keepWindowsClear" ? st.s.keepWindowsClear : st.s[m.key];
        return { label: m.label, checked: !!val, enabled: L.enabledByKey(m.key, st.s), key: m.key, act: function () { toggleSetting(m.key); } };
      });
      if (k === "edge") return D.edges.map(function (e) { return { label: e + (e === "Left" || e === "Right" ? " (column)" : " (strip)"), checked: st.s.edge === e, act: function () { st.s.edge = e; S.play("toggle"); relayout(); refreshFly(); say("Widgets docked " + e.toLowerCase() + ". The folders move to the opposite side when they can."); } }; });
      return [];
    }
    function toggleSetting(key) {
      st.s[key] = !st.s[key]; S.play("toggle"); if (key === "showWidgets" && st.s.showWidgets) st.collapsed = false;
      relayout(); refreshFly();
      say({ true: "On", false: "Off" }[st.s[key]] + ": " + D.settingsMenu.filter(function (m) { return m.key === key; })[0].label + ". Every service re-reads settings when one changes.");
    }
    function refreshFly() { var saved = flyLevels.map(function (m) { return { k: m.k, a: m.anchor }; }); if (!saved.length) return; var f = document.activeElement && document.activeElement.getAttribute("data-fi"); closeFly(0); saved.forEach(function (m, i) { openMenu(m.k, m.a, i); }); if (f) { var again = elFly.querySelector('[data-fi="' + f + '"]'); if (again) again.focus(); } }
    function openSub(row, k) { closeFly(0); flyAnchor = row; openMenu(k, row, 0); var first = flyLevels[0] && flyLevels[0].el.querySelector(".xrow:not([disabled])"); if (first && document.activeElement === row) first.focus({ preventScroll: true }); }
    function openMenu(k, anchor, level) {
      closeFly(level);
      var items = menuItems(k), el = document.createElement("div"); el.className = "xpmenu" + (k === "all" ? " scroll" : ""); el.setAttribute("role", "menu");
      el.innerHTML = items.map(function (it, i) {
        if (it.sep) return "<hr>";
        return '<button type="button" role="' + (it.checked !== undefined ? "menuitemcheckbox" : "menuitem") + '"' + (it.checked !== undefined ? ' aria-checked="' + it.checked + '"' : "") + ' class="xrow" data-fi="' + level + "-" + i + '"' + (it.enabled === false ? " disabled" : "") + '>' +
          '<span class="chk">' + (it.checked ? "✓" : "") + '</span>' + (it.glyph ? g(it.glyph, 18) : "") + '<span class="sl">' + esc(it.label) + '</span>' + (it.sub ? '<span class="sa">▸</span>' : "") + '</button>';
      }).join("");
      var a = anchor.closest("#sh-start") ? rel(anchor) : rel(anchor), startR = rel(elStart);
      var left = level === 0 ? (k === "all" ? rel(elStart.querySelector(".s-left")).x + rel(elStart.querySelector(".s-left")).w - 4 : startR.x + startR.w - 4) : a.x + a.w - 4;
      var top = a.y - 4; var maxTop = H - SIZES.taskbar - 30 - items.length * 22;
      el.style.zIndex = 80 + level; el.style.left = Math.min(left, W - 250) + "px"; el.style.top = Math.max(8, Math.min(top, maxTop)) + "px";
      if (left > W - 250) el.style.left = Math.max(0, a.x - 246) + "px";
      elFly.appendChild(el); flyLevels.push({ el: el, k: k, anchor: anchor, items: items });
      el.addEventListener("click", function (e) {
        var b = e.target.closest(".xrow"); if (!b) return; var idx = +b.getAttribute("data-fi").split("-")[1], it = items[idx]; if (!it || it.enabled === false) return;
        S.play("click");
        if (it.sub) { openMenu(it.sub, b, level + 1); var f = flyLevels[level + 1] && flyLevels[level + 1].el.querySelector(".xrow"); if (f) f.focus(); return; }
        if (it.act) it.act();
      });
      el.addEventListener("mouseover", function (e) { var b = e.target.closest(".xrow"); if (!b) return; var it = items[+b.getAttribute("data-fi").split("-")[1]]; if (it && it.sub) { if (!(flyLevels[level + 1] && flyLevels[level + 1].anchor === b)) openMenu(it.sub, b, level + 1); } else if (flyLevels.length > level + 1) closeFly(level + 1); });
      el.addEventListener("contextmenu", function (e) { var b = e.target.closest(".xrow"); if (!b) return; var it = items[+b.getAttribute("data-fi").split("-")[1]]; if (it && it.ctx) { e.preventDefault(); var r = rel(b); var pinned = st.pinned.indexOf(it.ctx) >= 0; showCtx(r.x + 30, r.y + 8, [{ label: "Open", act: function () { openApp(it.ctx); } }, { label: pinned ? "Unpin from Start menu" : "Pin to Start menu", act: function () { st.pinned = L.togglePin(st.pinned, it.ctx); S.play("toggle"); if (st.startOpen) refreshList(); toast((pinned ? "Unpinned " : "Pinned ") + app(it.ctx).name + "."); } }]); } });
      el.addEventListener("keydown", function (e) {
        var bs = Array.prototype.slice.call(el.querySelectorAll(".xrow:not([disabled])")), i = bs.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); bs[(i + bs.length - 1) % bs.length].focus(); }
        else if (e.key === "ArrowRight" && document.activeElement.querySelector(".sa")) { e.preventDefault(); document.activeElement.click(); }
        else if (e.key === "ArrowLeft" || e.key === "Escape") { e.preventDefault(); e.stopPropagation(); var anc = flyLevels[level].anchor; closeFly(level); if (anc && anc.focus) anc.focus(); }
      });
    }
    // keyboard through the Start menu: arrows move within a column, left/right between the two columns
    elStart.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t.classList.contains("s-search")) { if (e.key === "ArrowDown") { e.preventDefault(); var f = elStart.querySelector(".s-list .srow"); if (f) f.focus(); } return; }
      var row = t.closest(".srow, .sfoot"); if (!row) return;
      var col = row.closest(".s-left") ? ".s-left .srow" : row.closest(".s-right") ? ".s-right .srow" : null;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!col) return; e.preventDefault(); var rows = Array.prototype.slice.call(elStart.querySelectorAll(col)), i = rows.indexOf(row);
        if (e.key === "ArrowUp" && i === 0 && col === ".s-left .srow") { elStart.querySelector(".s-search").focus(); return; }
        rows[(i + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length].focus();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (row.classList.contains("has-sub")) { row.click(); return; }
        if (col === ".s-left .srow") { var r0 = elStart.querySelector(".s-right .srow"); if (r0) r0.focus(); }
      } else if (e.key === "ArrowLeft" && col === ".s-right .srow") { e.preventDefault(); var l0 = elStart.querySelector(".s-left .srow"); if (l0) l0.focus(); }
    });
    function showPower() {
      closeStart(); elModal.hidden = false;
      elModal.innerHTML = '<div class="m-dim"></div><div class="m-box" role="dialog" aria-modal="true" aria-label="Turn off computer"><div class="m-title">Turn off computer</div><div class="m-btns">' +
        ["Stand By", "Turn Off", "Restart"].map(function (n) { return '<button type="button" class="m-btn" data-p="' + n + '">' + g("off", 38) + '<span>' + n + '</span></button>'; }).join("") + '</div><button type="button" class="m-cancel" data-p="">Cancel</button></div>';
      var first = elModal.querySelector(".m-btn"); if (first) first.focus(); S.play("open");
    }
    elModal.addEventListener("click", function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var p = b.getAttribute("data-p"); elModal.hidden = true; if (p) toast(p + " does nothing here. On a Mac, macOS asks “Are you sure?” first."); S.play("close"); });
    elModal.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); elModal.hidden = true; } if (e.key === "Tab") { var bs = elModal.querySelectorAll("button"), f = bs[0], l = bs[bs.length - 1]; if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); } else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); } } });

    /* ---- global-ish events ---- */
    stage.addEventListener("pointerdown", function (e) {
      if (st.startOpen && !elStart.contains(e.target) && !elFly.contains(e.target) && !e.target.closest("#sh-startbtn")) closeStart();
      if (!e.target.closest(".xpmenu.ctx")) closeCtx();
    });
    stage.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!elModal.hidden) return;
      if (st.openFolder) { closeFolder(); e.preventDefault(); return; }
      if (st.startOpen) { closeStart(); e.preventDefault(); }
    });
    var optDown = false, optOther = false;
    function active() { return hovering || stage.contains(document.activeElement) || viewport.contains(document.activeElement); }
    document.addEventListener("keydown", function (e) {
      if (!active()) return;
      if (e.key === "Alt") { if (!e.repeat) { optDown = true; optOther = false; } return; }
      if (optDown) optOther = true;
      if (e.metaKey && e.ctrlKey && (e.key === "t" || e.key === "T") && st.s.ghosttyHotkey && on("hotkeys")) { e.preventDefault(); openApp("ghostty"); say("⌘⌃T: a new Ghostty window."); }
    });
    document.addEventListener("keyup", function (e) {
      if (e.key !== "Alt") return;
      if (optDown && !optOther && active() && st.s.optionOpensStart && on("hotkeys")) { toggleStart(); say(st.startOpen ? "Option tap: Start menu opened." : "Option tap: Start menu closed."); }
      optDown = false;
    });
    viewport.addEventListener("pointerenter", function () { hovering = true; });
    viewport.addEventListener("pointerleave", function () { hovering = false; });
    zonesBox.addEventListener("change", function () { relayout(); S.play("toggle"); });
    $("sh-reset").addEventListener("click", function () { var z = zonesBox.checked; closeStart(); closeCtx(); closeFly(0); elModal.hidden = true; st = fresh(); elWins.innerHTML = ""; elOverlay.hidden = true; relayout(); say("Desktop reset."); });

    var visible = true;
    if (root.IntersectionObserver) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.01 }).observe(stage);
    setInterval(tickWidgets, 1000);
    setInterval(function () { var c = document.getElementById("sh-clock"); if (c) c.textContent = L.clock(new Date()); }, 20000);

    st = fresh(); relayout();
    root.MT_SH = { state: function () { return st; }, openStart: openStart, openApp: openApp, openFolderById: function (id) { var t = elFolders.querySelector('[data-id="' + id + '"]'); if (t) t.click(); }, openExplorer: openExplorer, runIn: function (line) { var w = st.wins.filter(function (x) { return x.kind === "terminal"; })[0]; if (w) { w.log.push("~ % " + line); runCommand(line, w); syncWins(); var out = elWins.querySelector('[data-id="' + w.id + '"] .term-out'); if (out) out.innerHTML = w.log.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join(""); } }, openSub: function (k) { openSub(elStart.querySelector('[data-k="' + k + '"]'), k); } };
  }
  root.MT_initShell = init;
})(window);

/* DepDeck recreation: a drawn menu bar and the popover's five tabs, driven by sample data. */
(function (root) {
  "use strict";
  var D = root.MT_DATA, L = root.MT_LOGIC, S = root.MT_SFX;
  var reduce = function () { return (root.MT_PREFS && !root.MT_PREFS.motion()) || (root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce() ? Math.min(ms, 120) : ms); }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var TABS = [
    { id: "installed", label: "Installed", icon: "i-box" }, { id: "updates", label: "Updates", icon: "i-sync" },
    { id: "issues", label: "Issues", icon: "i-warn-o" }, { id: "search", label: "Search", icon: "i-search" },
    { id: "settings", label: "Settings", icon: "i-gear" }
  ];

  function init() {
    var stage = document.getElementById("dd-stage"), pop = document.getElementById("dd-pop"), item = document.getElementById("dd-item");
    var count = document.getElementById("dd-count"), hint = document.getElementById("dd-hint"), relaunch = document.getElementById("dd-relaunch");
    var statusEl = document.getElementById("dd-status"), failBox = document.getElementById("dd-fail");
    var st;

    function fresh() {
      return {
        pkgs: D.packages.map(function (p) { var q = Object.assign({}, p); q.id = L.id(p); q.outdated = !!p.outdated; return q; }),
        tab: "installed", filter: "", query: "", results: [], searching: false, searched: false, busy: {}, error: null,
        refreshed: null, refreshing: false, auto: false, interval: 6, open: false, quit: false
      };
    }
    function say(msg) { statusEl.textContent = msg; }
    function nBusy() { return Object.keys(st.busy).length; }
    function sorted() { return L.sortByName(st.pkgs); }

    function updateBar() {
      var lab = L.menuBarLabel(st.pkgs), o = L.outdated(st.pkgs).length, i = L.issues(st.pkgs).length;
      item.querySelector("use").setAttribute("href", lab.filled ? "#i-box-fill" : "#i-box");
      count.textContent = lab.text;
      item.setAttribute("aria-label", "DepDeck" + (o ? ", " + L.updatesHeadline(o) : "") + (i ? ", " + i + (i === 1 ? " issue" : " issues") : ""));
    }
    function spin() { return '<span class="spin" role="img" aria-label="Working"></span>'; }
    function mgr(m) { return '<span class="mgr" style="--mc:' + D.managers[m].color + '">' + m + '</span>'; }
    function btn(act, label, cls, extra) { return '<button type="button" class="mbtn ' + (cls || "") + '" data-act="' + act + '"' + (extra || "") + '>' + label + '</button>'; }
    function icon(id, cls) { return '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }

    function row(p) {
      var busy = st.busy[p.id];
      return '<li class="prow"><div class="pmain"><div class="pname"><code>' + esc(p.name) + '</code>' + mgr(p.manager) +
        (L.hasIssue(p) ? '<span class="warn" title="' + esc(p.reason || L.issueLabel(p)) + '">' + icon("i-warn") + '<span class="sr">' + L.issueLabel(p) + '</span></span>' : "") + '</div>' +
        (p.description ? '<div class="pdesc">' + esc(p.description) + '</div>' : "") +
        '<div class="pver' + (p.outdated ? " out" : "") + '">' + esc(L.versionText(p)) + '</div></div>' +
        '<div class="pact">' + (busy ? spin() :
          (p.outdated ? btn("update:" + p.id, "Update", "sm", ' aria-label="Update ' + esc(p.name) + '"') : "") +
          btn("uninstall:" + p.id, icon("i-trash"), "sm icon", ' aria-label="Uninstall ' + esc(p.name) + '" title="Uninstall ' + esc(p.name) + '"')) + '</div></li>';
    }
    function empty(iconId, color, text) { return '<div class="empty">' + icon(iconId, "big " + color) + '<p>' + text + '</p></div>'; }

    function bodyHtml() {
      var t = st.tab, h = "";
      if (t === "installed") {
        var list = L.filterInstalled(sorted(), st.filter);
        h = '<div class="pad"><input class="field" id="dd-filter" data-focus="filter" type="search" placeholder="Filter installed packages…" aria-label="Filter installed packages" value="' + esc(st.filter) + '"></div>';
        if (!st.pkgs.length && st.refreshing) h += '<div class="empty">' + spin() + '<p>Loading packages…</p></div>';
        else h += '<ul class="plist">' + list.map(row).join("") + '</ul>';
      } else if (t === "updates") {
        var ups = L.sortByName(L.outdated(st.pkgs));
        if (!ups.length) h = empty("i-check", "green", "Everything is up to date");
        else h = '<div class="pad bar"><span>' + L.updatesHeadline(ups.length) + '</span>' + btn("updateAll", "Update All", "", nBusy() ? " disabled" : "") + '</div><ul class="plist">' + ups.map(row).join("") + '</ul>';
      } else if (t === "issues") {
        var iss = L.issues(sorted());
        if (!iss.length) h = empty("i-shield", "green", "No deprecated or disabled packages");
        else h = '<ul class="plist">' + iss.map(function (p) {
          return '<li class="irow"><div class="pname"><code>' + esc(p.name) + '</code>' + mgr(p.manager) +
            '<span class="pill ' + (p.disabled ? "red" : "orange") + '">' + L.issueLabel(p) + '</span></div>' +
            (p.reason ? '<div class="pdesc long">' + esc(p.reason) + '</div>' : "") +
            '<div class="pact left">' + (st.busy[p.id] ? spin() :
              (p.replacement ? btn("replace:" + p.id, "Replace with " + esc(p.replacement), "sm") : "") + btn("uninstall:" + p.id, "Uninstall", "sm danger")) + '</div></li>';
        }).join("") + '</ul>';
      } else if (t === "search") {
        h = '<form class="pad bar" data-form="search"><input class="field" data-focus="query" type="search" placeholder="Search Homebrew and crates.io…" aria-label="Search Homebrew and crates.io" value="' + esc(st.query) + '">' +
          '<button class="mbtn" type="submit"' + (!st.query.trim() || st.searching ? " disabled" : "") + '>Search</button></form>';
        if (st.searching) h += '<div class="empty">' + spin() + '<p>Searching…</p></div>';
        else if (!st.results.length) h += '<div class="empty"><p>' + (st.searched ? "No results in the sample catalog" : "Search for a tool to install") + '</p></div>';
        else h += '<ul class="plist">' + st.results.map(function (r) {
          var rid = L.id(r), have = st.pkgs.some(function (p) { return p.id === rid; });
          return '<li class="prow slim"><div class="pname"><code>' + esc(r.name) + '</code>' + mgr(r.manager) + '</div><div class="pact">' +
            (st.busy[rid] ? spin() : have ? '<span class="dimtxt">Installed</span>' : btn("install:" + rid, "Install", "sm", ' aria-label="Install ' + esc(r.name) + '"')) + '</div></li>';
        }).join("") + '</ul>';
      } else {
        h = '<div class="form"><div class="grp"><label class="swrow"><span>Automatically install updates</span><input type="checkbox" role="switch" data-act="auto"' + (st.auto ? " checked" : "") + '></label>' +
          '<p class="cap">When enabled, outdated packages are upgraded during each scheduled check.</p></div>' +
          '<div class="grp"><label class="swrow"><span>Check for updates every</span><select data-act="interval">' + D.intervals.map(function (o) { return '<option value="' + o.hours + '"' + (o.hours === st.interval ? " selected" : "") + '>' + o.label + '</option>'; }).join("") + '</select></label></div>' +
          '<div class="grp"><div class="kv"><span>Tracked managers</span><span>Homebrew, npm (global), cargo</span></div><div class="kv"><span>Packages tracked</span><span>' + st.pkgs.length + '</span></div></div></div>';
      }
      return h;
    }

    function render() {
      var o = L.outdated(st.pkgs).length, i = L.issues(st.pkgs).length;
      var active = document.activeElement, focusKey = active && pop.contains(active) && active.getAttribute("data-focus");
      var selStart = active && active.selectionStart, selEnd = active && active.selectionEnd;
      var tabHtml = TABS.map(function (t) {
        var b = "";
        if (t.id === "updates" && o) b = '<span class="cbadge blue">' + o + '</span>';
        if (t.id === "issues" && i) b = '<span class="cbadge orange">' + i + '</span>';
        return '<button type="button" role="tab" class="tab' + (st.tab === t.id ? " on" : "") + '" aria-selected="' + (st.tab === t.id) + '" data-act="tab:' + t.id + '">' + icon(t.icon) + t.label + b + '</button>';
      }).join("");
      pop.innerHTML =
        '<div class="p-head"><strong>DepDeck</strong><span class="grow"></span>' +
        (st.refreshed ? '<span class="cap">Updated ' + L.clock(st.refreshed) + '</span>' : "") +
        '<button type="button" class="plain" data-act="refresh" aria-label="Refresh (runs brew update)" title="Refresh (runs brew update)"' + (st.refreshing ? " disabled" : "") + '>' + (st.refreshing ? spin() : icon("i-refresh")) + '</button>' +
        '<button type="button" class="plain" data-act="quit" aria-label="Quit DepDeck" title="Quit DepDeck">' + icon("i-power") + '</button></div>' +
        '<div class="p-tabs" role="tablist" aria-label="DepDeck sections">' + tabHtml + '</div>' +
        '<div class="p-body" role="tabpanel">' + bodyHtml() + '</div>' +
        (st.error ? '<div class="p-err" role="alert">' + icon("i-octagon", "red") + '<span>' + esc(st.error) + '</span><button type="button" class="plain" data-act="dismiss" aria-label="Dismiss error">' + icon("i-x") + '</button></div>' : "");
      if (focusKey) {
        var again = pop.querySelector('[data-focus="' + focusKey + '"]');
        if (again) { again.focus(); try { again.setSelectionRange(selStart, selEnd); } catch (e) {} }
      }
      updateBar();
    }

    /* ---- actions ---- */
    function openPop(v) {
      if (st.quit) return;
      st.open = v; pop.hidden = !v;
      item.setAttribute("aria-expanded", String(v)); item.classList.toggle("on", v);
      if (v) { hint.hidden = true; render(); pop.setAttribute("tabindex", "-1"); pop.focus({ preventScroll: true }); S.play("open"); }
      else S.play("close");
    }
    function refresh(opts) {
      if (st.refreshing) return Promise.resolve();
      st.refreshing = true; st.error = null; render(); S.play("refresh");
      say("Refreshing: the real app runs brew update first, which can take about 30 s. Here it takes a second.");
      return wait(1300).then(function () { st.refreshing = false; st.refreshed = new Date(); render(); say("Package list refreshed (sample data)."); });
    }
    function after(p, work) { // runs one package action with a spinner
      st.busy[p.id || L.id(p)] = true; render();
      return work().then(function () { delete st.busy[p.id || L.id(p)]; render(); });
    }
    function byId(id) { return st.pkgs.filter(function (p) { return p.id === id; })[0]; }
    function update(id) {
      var p = byId(id); if (!p) return Promise.resolve();
      return after(p, function () {
        return wait(1500).then(function () {
          if (failBox.checked) {
            failBox.checked = false; st.error = L.failureMessage(L.upgradeCommand(p)); S.play("error"); say("The update failed on purpose; the red banner is what the app shows.");
          } else {
            Object.assign(p, L.upgraded(p)); S.play("done"); say(p.name + " updated to " + p.installed + " (sample data).");
          }
        });
      });
    }
    function updateAll() {
      var ids = L.outdated(st.pkgs).map(function (p) { return p.id; });
      if (ids.length) S.play("ratchetRun");
      return ids.reduce(function (chain, id) { return chain.then(function () { return update(id); }); }, Promise.resolve());
    }
    function uninstall(id) {
      var p = byId(id); if (!p) return;
      after(p, function () { return wait(700).then(function () { st.pkgs = st.pkgs.filter(function (x) { return x.id !== id; }); S.play("trash"); say(p.name + " uninstalled (sample data)."); }); });
    }
    function replace(id) {
      var p = byId(id); if (!p || !p.replacement) return;
      after(p, function () {
        return wait(1700).then(function () {
          st.pkgs = st.pkgs.filter(function (x) { return x.id !== id; });
          var r = { manager: p.manager, name: p.replacement, installed: "2024.11.04", latest: "2024.11.04", outdated: false };
          r.id = L.id(r); st.pkgs.push(r); S.play("done"); say("Installed " + p.replacement + ", then removed " + p.name + " (sample data).");
        });
      });
    }
    function install(rid) {
      var r = st.results.filter(function (x) { return L.id(x) === rid; })[0]; if (!r) return;
      st.busy[rid] = true; render();
      wait(1500).then(function () {
        delete st.busy[rid];
        var p = { manager: r.manager, name: r.name, installed: "1.0.0", latest: "1.0.0", outdated: false }; p.id = rid; st.pkgs.push(p);
        S.play("done"); render(); say(r.name + " installed (sample data).");
      });
    }
    function search() {
      var q = st.query; if (!q.trim()) return;
      st.searching = true; render();
      wait(700).then(function () { st.searching = false; st.searched = true; st.results = L.search(D.catalog, q); render(); });
    }
    function quit() {
      openPop(false); st.quit = true;
      item.parentNode.classList.add("gone"); item.hidden = true; relaunch.hidden = false;
      say("DepDeck quit. Use the Relaunch button.");
    }
    function relaunchIt() {
      st.quit = false; item.hidden = false; relaunch.hidden = true; item.parentNode.classList.remove("gone");
      refresh(); updateBar(); say("DepDeck relaunched.");
    }
    function fastForward() {
      say("Scheduled check (every " + (D.intervals.filter(function (o) { return o.hours === st.interval; })[0].label) + "): refreshing…");
      refresh().then(function () {
        if (!st.auto) { say("Scheduled check done. Auto-install is off, so the updates wait for you."); return; }
        var n = L.outdated(st.pkgs).length;
        if (!n) { say("Scheduled check done. Nothing to install."); return; }
        say("Scheduled check done. Auto-install is on: upgrading " + n + "…");
        updateAll();
      });
    }
    function reset() { var wasOpen = st.open; st = fresh(); st.refreshed = new Date(); failBox.checked = false; if (wasOpen) openPop(true); else updateBar(); relaunch.hidden = true; item.hidden = false; say("Sample data reset."); }

    /* ---- events ---- */
    pop.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT" || b.type === "checkbox") return;
      var a = b.getAttribute("data-act").split(":"), id = a.slice(1).join(":");
      S.play("click");
      if (a[0] === "tab") { st.tab = id; S.play("tab"); render(); var t = pop.querySelector(".tab.on"); if (t) t.focus(); }
      else if (a[0] === "refresh") refresh();
      else if (a[0] === "quit") quit();
      else if (a[0] === "update") update(id);
      else if (a[0] === "updateAll") updateAll();
      else if (a[0] === "uninstall") uninstall(id);
      else if (a[0] === "replace") replace(id);
      else if (a[0] === "install") install(id);
      else if (a[0] === "dismiss") { st.error = null; render(); }
    });
    pop.addEventListener("change", function (e) {
      var a = e.target.getAttribute("data-act");
      if (a === "auto") { st.auto = e.target.checked; S.play("toggle"); say(st.auto ? "Auto-install on: outdated packages are upgraded at each scheduled check." : "Auto-install off."); }
      if (a === "interval") { st.interval = parseFloat(e.target.value); say("Check interval set to " + e.target.options[e.target.selectedIndex].text + "."); }
    });
    pop.addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-focus");
      if (k === "filter") { st.filter = e.target.value; render(); }
      if (k === "query") { st.query = e.target.value; var sb = pop.querySelector('form [type="submit"]'); if (sb) sb.disabled = !st.query.trim() || st.searching; }
    });
    pop.addEventListener("submit", function (e) { e.preventDefault(); search(); });
    pop.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); openPop(false); item.focus(); return; }
      var tab = e.target.closest && e.target.closest('[role="tab"]');
      if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        var i = TABS.map(function (t) { return t.id; }).indexOf(st.tab), n = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
        st.tab = TABS[n].id; render(); pop.querySelector(".tab.on").focus(); S.play("tab"); e.preventDefault();
      }
    });
    item.addEventListener("click", function () { openPop(!st.open); });
    stage.addEventListener("pointerdown", function (e) { if (st.open && !pop.contains(e.target) && !item.contains(e.target)) openPop(false); });
    document.getElementById("dd-relaunch-btn").addEventListener("click", relaunchIt);
    document.getElementById("dd-ff").addEventListener("click", fastForward);
    document.getElementById("dd-reset").addEventListener("click", reset);

    var seg = document.querySelectorAll('[data-appearance]');
    function appearance(a) {
      stage.setAttribute("data-appearance", a);
      Array.prototype.forEach.call(seg, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-appearance") === a)); });
    }
    Array.prototype.forEach.call(seg, function (b) { b.addEventListener("click", function () { appearance(b.getAttribute("data-appearance")); S.play("tab"); }); });
    appearance(root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    var clock = document.getElementById("dd-clock");
    function tick() { var d = new Date(); clock.textContent = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] + " " + L.clock(d); }
    tick(); setInterval(tick, 30000);

    st = fresh(); st.refreshing = true; updateBar();
    wait(900).then(function () { st.refreshing = false; st.refreshed = new Date(); if (st.open) render(); });
    root.MT_DD = { state: function () { return st; }, open: openPop, reset: reset,
      // a new random set of outdated packages (sample data only)
      shuffle: function () { st.pkgs = L.shuffled(st.pkgs, Math.random); st.error = null; if (st.open) render(); updateBar(); say("Sample data shuffled: " + L.updatesHeadline(L.outdated(st.pkgs).length) + "."); } };
  }
  root.MT_initDepDeck = init;
})(window);

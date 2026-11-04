/* The recreations' logic, kept apart from the DOM so tests/ can run it with node.
   The rules follow the two apps' source: DepDeck's menu bar label and tabs, Desktop Shell's
   tiling map (DesktopLayout.cut) and Start-menu search. */
(function (root) {
  "use strict";

  /* ---------- DepDeck ---------- */
  function id(p) { return p.manager + ":" + p.name; }
  function hasIssue(p) { return !!(p.deprecated || p.disabled); }
  function issueLabel(p) { return p.disabled ? "Disabled" : "Deprecated"; }
  function outdated(list) { return list.filter(function (p) { return p.outdated; }); }
  function issues(list) { return list.filter(hasIssue); }

  // The menu bar item: a plain box when all is well, a box and the number of updates, and "N⚠︎M" when anything is deprecated or disabled.
  function menuBarLabel(list) {
    var o = outdated(list).length, i = issues(list).length;
    if (i > 0) return { filled: true, text: o + "⚠︎" + i };
    if (o > 0) return { filled: true, text: String(o) };
    return { filled: false, text: "" };
  }
  function versionText(p) {
    return p.outdated && p.latest ? p.installed + " → " + p.latest : p.installed;
  }
  function filterInstalled(list, query) {
    var q = String(query || "").trim().toLowerCase();
    return q ? list.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0; }) : list;
  }
  function sortByName(list) {
    return list.slice().sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0; });
  }
  // brew + cargo only, like the app's Search tab
  function search(catalog, query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    return catalog.filter(function (r) { return r.name.toLowerCase().indexOf(q) >= 0; });
  }
  function upgraded(p) {
    var q = Object.assign({}, p);
    q.installed = p.latest || p.installed; q.outdated = false;
    return q;
  }
  // "Shuffle sample data": a new random set of outdated packages (never touches deprecated or disabled ones,
  // and an outdated package always has a newer version than the installed one). rand() returns [0, 1).
  function bumpVersion(v) {
    var parts = String(v).split(".");
    for (var i = parts.length - 1; i >= 0; i--) if (/^\d+$/.test(parts[i])) { parts[i] = String(+parts[i] + 1); return parts.join("."); }
    return v + ".1";
  }
  function shuffled(list, rand) {
    return list.map(function (p) {
      var q = Object.assign({}, p);
      if (hasIssue(p)) return q;
      q.outdated = rand() < 0.4; q.latest = q.outdated ? bumpVersion(p.installed) : p.installed;
      return q;
    });
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function updatesHeadline(n) { return plural(n, "update", "updates") + " available"; }
  function failureMessage(cmd) {
    return "`" + cmd + "` exited with code 1:\nError: sample failure (the demo switch is on)";
  }
  function upgradeCommand(p) {
    if (p.manager === "brew") return "brew upgrade '" + p.name + "'";
    if (p.manager === "npm") return "npm install -g '" + p.name + "@latest'";
    return "cargo install '" + p.name + "' --force";
  }

  /* ---------- Desktop Shell ---------- */
  var GAP = 8;
  function intersects(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }
  // Remove an edge-attached strip from the free area by trimming the side that loses the least
  // (rects are {x, y, w, h} with a top-left origin; the app's code uses AppKit's bottom-left).
  function cut(zone, area) {
    if (!intersects(area, zone)) return area;
    var trimLeft = zone.x + zone.w + GAP - area.x;
    var trimRight = area.x + area.w - (zone.x - GAP);
    var trimTop = zone.y + zone.h + GAP - area.y;
    var trimBottom = area.y + area.h - (zone.y - GAP);
    var options = [
      { lost: trimLeft * area.h, r: { x: area.x + trimLeft, y: area.y, w: area.w - trimLeft, h: area.h } },
      { lost: trimRight * area.h, r: { x: area.x, y: area.y, w: area.w - trimRight, h: area.h } },
      { lost: trimTop * area.w, r: { x: area.x, y: area.y + trimTop, w: area.w, h: area.h - trimTop } },
      { lost: trimBottom * area.w, r: { x: area.x, y: area.y, w: area.w, h: area.h - trimBottom } }
    ].filter(function (o) { return o.r.w > 0 && o.r.h > 0; });
    if (!options.length) return area;
    return options.reduce(function (best, o) { return o.lost < best.lost ? o : best; }).r;
  }
  function freeArea(screen, zones) {
    return zones.reduce(function (area, z) { return z ? cut(z, area) : area; }, screen);
  }

  var FOLDER_WIDTH = 220 * 0.6; // the app's 220 pt strip, drawn at the recreation's scale
  // Where the widget panel, the folder strip and the taskbar sit on a screen of w x h.
  // The folders take the side opposite the widgets (left unless the widgets are on the left).
  function layout(w, h, s, sizes) {
    var bar = s.showTaskbar ? sizes.taskbar : 0;
    var zones = { taskbar: s.showTaskbar ? { x: 0, y: h - bar, w: w, h: bar } : null, widgets: null, folders: null };
    var vertical = s.edge === "Left" || s.edge === "Right";
    var top = 0, bottom = h - bar;
    if (s.showWidgets) {
      if (s.edge === "Right") zones.widgets = { x: w - sizes.column, y: top, w: sizes.column, h: bottom - top };
      else if (s.edge === "Left") zones.widgets = { x: 0, y: top, w: sizes.column, h: bottom - top };
      else if (s.edge === "Top") zones.widgets = { x: 0, y: top, w: w, h: sizes.strip };
      else zones.widgets = { x: 0, y: bottom - sizes.strip, w: w, h: sizes.strip };
    }
    if (s.showFolders) {
      var area = freeArea({ x: 0, y: 0, w: w, h: h }, [zones.taskbar, vertical || !zones.widgets ? null : zones.widgets]);
      var onRight = s.edge === "Left" && s.showWidgets;
      zones.folders = { x: onRight ? area.x + area.w - sizes.folders : area.x, y: area.y, w: sizes.folders, h: area.h };
    }
    return zones;
  }

  /* Start menu */
  function searchApps(apps, query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    return apps.filter(function (a) { return a.name.toLowerCase().indexOf(q) >= 0; });
  }
  function searchFiles(files, query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    return files.filter(function (f) { return f.toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
  }
  // Top apps by how often you switch to them, excluding pinned ones
  function frequent(counts, pinned, limit) {
    return Object.keys(counts)
      .filter(function (k) { return pinned.indexOf(k) < 0 && counts[k] > 0; })
      .sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); })
      .slice(0, limit || 5);
  }
  function togglePin(pinned, appId) {
    var i = pinned.indexOf(appId);
    return i >= 0 ? pinned.filter(function (x) { return x !== appId; }) : pinned.concat(appId);
  }
  // A setting is usable only if the setting it depends on is on (and so on up the chain)
  var NEEDS = { showNowPlaying: "showWidgets", youtubeLoops: "showNowPlaying", foldersIncludeDownloads: "showFolders" };
  function enabledByKey(key, s) { return !NEEDS[key] || (s[NEEDS[key]] && enabledByKey(NEEDS[key], s)); }

  /* desktopctl, as in the repo's script */
  function parseCtl(line, services) {
    var parts = String(line || "").trim().split(/\s+/).filter(Boolean);
    if (parts[0] !== "desktopctl") return { error: "command not found: " + (parts[0] || "") };
    var verb = parts[1] || "status", target = parts[2];
    if (verb === "status") return { verb: "status", targets: services.slice() };
    if (["stop", "start", "restart", "disable", "enable"].indexOf(verb) < 0) return { usage: true };
    if (target === "all") return { verb: verb, targets: services.slice() };
    if (services.indexOf(target) >= 0) return { verb: verb, targets: [target] };
    return { error: "Unknown service '" + (target || "") + "'. Use one of: " + services.join(" ") + " all" };
  }

  /* Calendar */
  function monthGrid(year, month) { // weeks of day numbers (null for blanks), weeks start on Sunday
    var first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate(), cells = [];
    for (var i = 0; i < first; i++) cells.push(null);
    for (var d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    var weeks = [];
    for (var k = 0; k < cells.length; k += 7) weeks.push(cells.slice(k, k + 7));
    return weeks;
  }
  function clock(d) {
    var h = d.getHours(), m = d.getMinutes();
    return ((h % 12) || 12) + ":" + (m < 10 ? "0" : "") + m + " " + (h < 12 ? "AM" : "PM");
  }
  function mmss(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60);
  }

  var API = {
    id: id, hasIssue: hasIssue, issueLabel: issueLabel, outdated: outdated, issues: issues, menuBarLabel: menuBarLabel,
    versionText: versionText, filterInstalled: filterInstalled, sortByName: sortByName, search: search, upgraded: upgraded,
    updatesHeadline: updatesHeadline, bumpVersion: bumpVersion, shuffled: shuffled, failureMessage: failureMessage, upgradeCommand: upgradeCommand,
    GAP: GAP, cut: cut, freeArea: freeArea, layout: layout, FOLDER_WIDTH: FOLDER_WIDTH,
    searchApps: searchApps, searchFiles: searchFiles, frequent: frequent, togglePin: togglePin, enabledByKey: enabledByKey,
    parseCtl: parseCtl, monthGrid: monthGrid, clock: clock, mmss: mmss
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.MT_LOGIC = API;
})(typeof window !== "undefined" ? window : globalThis);

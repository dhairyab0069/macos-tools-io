// Checks the page's logic, data and structure: node tests/run.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const D = require("../assets/data.js");
const L = require("../assets/logic.js");
const html = read("index.html"), css = read("assets/style.css");
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("ok", n, name); };
const pkg = (o) => Object.assign({ manager: "brew", name: "x", installed: "1", latest: "1" }, o);

/* ---------- DepDeck rules ---------- */
ok("menu bar label: plain box, count, then count with warnings (as the app's DepDeckApp does)", () => {
  assert.deepEqual(L.menuBarLabel([pkg({})]), { filled: false, text: "" });
  assert.deepEqual(L.menuBarLabel([pkg({ outdated: true }), pkg({ name: "y", outdated: true })]), { filled: true, text: "2" });
  assert.deepEqual(L.menuBarLabel([pkg({ outdated: true }), pkg({ name: "z", deprecated: true })]), { filled: true, text: "1⚠︎1" });
  assert.equal(L.menuBarLabel([pkg({ disabled: true })]).text, "0⚠︎1");
});
ok("versions, headlines and issue labels", () => {
  assert.equal(L.versionText(pkg({ installed: "1.0", latest: "1.1", outdated: true })), "1.0 → 1.1");
  assert.equal(L.versionText(pkg({ installed: "1.0", latest: "1.1" })), "1.0");
  assert.equal(L.updatesHeadline(1), "1 update available");
  assert.equal(L.updatesHeadline(3), "3 updates available");
  assert.equal(L.issueLabel(pkg({ deprecated: true })), "Deprecated");
  assert.equal(L.issueLabel(pkg({ deprecated: true, disabled: true })), "Disabled");
});
ok("upgrading clears the outdated flag and installs the latest", () => {
  const p = L.upgraded(pkg({ installed: "1.0", latest: "1.2", outdated: true }));
  assert.equal(p.installed, "1.2"); assert.equal(p.outdated, false);
});
ok("filter is case-insensitive and trims; search only returns matches", () => {
  const list = D.packages;
  assert.ok(L.filterInstalled(list, "  RIPG ").every((p) => p.name.includes("ripg")));
  assert.equal(L.filterInstalled(list, "").length, list.length);
  assert.deepEqual(L.search(D.catalog, "   "), []);
  assert.ok(L.search(D.catalog, "zox").length >= 2);
  assert.ok(L.search(D.catalog, "zox").every((r) => ["brew", "cargo"].includes(r.manager)), "search covers Homebrew and crates.io only");
});
ok("upgrade commands match the app's clients", () => {
  assert.equal(L.upgradeCommand(pkg({ name: "jq" })), "brew upgrade 'jq'");
  assert.equal(L.upgradeCommand(pkg({ manager: "npm", name: "typescript" })), "npm install -g 'typescript@latest'");
  assert.equal(L.upgradeCommand(pkg({ manager: "cargo", name: "bat" })), "cargo install 'bat' --force");
});

/* ---------- sample data ---------- */
ok("packages: unique ids, known managers, sane flags", () => {
  const ids = D.packages.map(L.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of D.packages) {
    assert.ok(D.managers[p.manager], p.name);
    assert.ok(p.installed && p.latest, p.name);
    if (p.outdated) assert.notEqual(p.installed, p.latest, p.name + " is outdated but equal");
    if (!p.outdated) assert.equal(p.installed, p.latest, p.name + " differs but is not outdated");
    if (L.hasIssue(p)) assert.ok(p.reason, p.name + " has an issue without a reason");
  }
});
ok("the sample shows every state: each manager, outdated, deprecated, disabled and a replacement", () => {
  for (const m of Object.keys(D.managers)) assert.ok(D.packages.some((p) => p.manager === m), m);
  assert.ok(D.packages.some((p) => p.outdated) && D.packages.some((p) => p.deprecated) && D.packages.some((p) => p.disabled) && D.packages.some((p) => p.replacement));
});
ok("catalog entries are unique and brew/cargo only; intervals match the Settings picker", () => {
  const ids = D.catalog.map(L.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(D.catalog.every((c) => ["brew", "cargo"].includes(c.manager)));
  assert.deepEqual(D.intervals.map((i) => i.hours), [1, 3, 6, 12, 24]);
  assert.equal(D.intervals[4].label, "Daily");
});

/* ---------- Desktop Shell rules ---------- */
const R = (x, y, w, h) => ({ x, y, w, h });
ok("tiling: a taskbar along the bottom trims the bottom, with the app's 8 px gap", () => {
  assert.deepEqual(L.cut(R(0, 570, 960, 30), R(0, 0, 960, 600)), R(0, 0, 960, 562));
});
ok("tiling: edge columns and strips trim the side that loses least", () => {
  const s = R(0, 0, 1000, 800);
  assert.deepEqual(L.cut(R(780, 0, 220, 800), s), R(0, 0, 772, 800));
  assert.deepEqual(L.cut(R(0, 0, 220, 800), s), R(228, 0, 772, 800));
  assert.deepEqual(L.cut(R(0, 700, 1000, 100), s), R(0, 0, 1000, 692));
  assert.deepEqual(L.cut(R(0, 0, 1000, 100), s), R(0, 108, 1000, 692));
  assert.deepEqual(L.cut(R(2000, 0, 10, 10), s), s, "a strip that is not on screen changes nothing");
});
ok("tiling: freeArea applies every strip and skips cleared ones", () => {
  const s = R(0, 0, 960, 600);
  const a = L.freeArea(s, [R(0, 570, 960, 30), null, R(790, 0, 170, 570)]);
  assert.deepEqual(a, R(0, 0, 782, 562));
  assert.deepEqual(L.freeArea(s, [null, null]), s);
});
const SIZES = { taskbar: 30, column: 172, strip: 118, folders: 138 };
const S0 = Object.assign({}, D.settingsDefaults, { showTaskbar: true });
ok("layout: widgets on the right, folders on the left, taskbar along the bottom", () => {
  const z = L.layout(960, 600, S0, SIZES);
  assert.deepEqual(z.taskbar, R(0, 570, 960, 30));
  assert.deepEqual(z.widgets, R(788, 0, 172, 570));
  assert.equal(z.folders.x, 0); assert.equal(z.folders.w, 138);
});
ok("layout: widgets on the left push the folders to the opposite (right) side", () => {
  const z = L.layout(960, 600, Object.assign({}, S0, { edge: "Left" }), SIZES);
  assert.deepEqual(z.widgets, R(0, 0, 172, 570));
  assert.equal(z.folders.x + z.folders.w, 960 - 0);
});
ok("layout: a top or bottom strip keeps the folders clear of it", () => {
  const top = L.layout(960, 600, Object.assign({}, S0, { edge: "Top" }), SIZES);
  assert.deepEqual(top.widgets, R(0, 0, 960, 118));
  assert.equal(top.folders.x, 0);
  const bottom = L.layout(960, 600, Object.assign({}, S0, { edge: "Bottom" }), SIZES);
  assert.deepEqual(bottom.widgets, R(0, 570 - 118, 960, 118));
});
ok("layout: switching widgets or folders off clears their strips", () => {
  const z = L.layout(960, 600, Object.assign({}, S0, { showWidgets: false, showFolders: false }), SIZES);
  assert.equal(z.widgets, null); assert.equal(z.folders, null); assert.ok(z.taskbar);
});
ok("start menu: app search is case-insensitive and instant; files are capped", () => {
  assert.deepEqual(L.searchApps(D.apps, "ghost").map((a) => a.id), ["ghostty"]);
  assert.deepEqual(L.searchApps(D.apps, " "), []);
  assert.ok(L.searchFiles(D.files, "thesis").length === 2);
  assert.ok(L.searchFiles(["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"], "a").length <= 6);
});
ok("start menu: frequent apps exclude pins and are ordered by use", () => {
  const f = L.frequent({ notes: 9, preview: 5, textedit: 5, sysinfo: 2, ghostty: 40 }, ["ghostty", "notes"], 5);
  assert.deepEqual(f, ["preview", "textedit", "sysinfo"]);
  assert.deepEqual(L.frequent({ a: 3, b: 2, c: 1 }, [], 2), ["a", "b"]);
  assert.deepEqual(L.togglePin(["a"], "b"), ["a", "b"]);
  assert.deepEqual(L.togglePin(["a", "b"], "a"), ["b"]);
});
ok("settings dependencies: a child is usable only while its parent is on", () => {
  assert.equal(L.enabledByKey("showNowPlaying", { showWidgets: true }), true);
  assert.equal(L.enabledByKey("showNowPlaying", { showWidgets: false }), false);
  assert.equal(L.enabledByKey("youtubeLoops", { showWidgets: true, showNowPlaying: false }), false);
  assert.equal(L.enabledByKey("youtubeLoops", { showWidgets: true, showNowPlaying: true }), true);
  assert.equal(L.enabledByKey("foldersIncludeDownloads", { showFolders: false }), false);
  assert.equal(L.enabledByKey("keepWindowsClear", {}), true);
});
ok("desktopctl: parses the verbs and targets of the repo's script", () => {
  const sv = D.services;
  assert.deepEqual(L.parseCtl("desktopctl", sv), { verb: "status", targets: sv });
  assert.deepEqual(L.parseCtl("desktopctl stop widgets", sv), { verb: "stop", targets: ["widgets"] });
  assert.deepEqual(L.parseCtl("desktopctl restart all", sv).targets, sv);
  assert.ok(L.parseCtl("desktopctl stop nope", sv).error.includes("Unknown service 'nope'"));
  assert.ok(L.parseCtl("desktopctl dance", sv).usage);
  assert.ok(L.parseCtl("ls", sv).error.includes("command not found"));
  assert.deepEqual(sv, ["taskbar", "folders", "widgets", "hotkeys"]);
});
ok("calendar grid, clock and mm:ss", () => {
  const g = L.monthGrid(2026, 10); // November 2026 starts on a Sunday and has 30 days
  assert.equal(g[0][0], 1); assert.equal(g.flat().filter(Boolean).length, 30); assert.ok(g.every((w) => w.length === 7));
  assert.equal(L.clock(new Date(2026, 0, 1, 0, 5)), "12:05 AM");
  assert.equal(L.clock(new Date(2026, 0, 1, 15, 4)), "3:04 PM");
  assert.equal(L.mmss(214), "3:34"); assert.equal(L.mmss(-3), "0:00");
});

/* ---------- Desktop Shell sample data ---------- */
const symbols = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
ok("every app, place and file type has a glyph in the page's symbol sprite", () => {
  for (const a of D.apps) assert.ok(symbols.has("g-" + a.glyph), a.id + " glyph " + a.glyph);
  for (const p of D.places) assert.ok(symbols.has("g-" + p.glyph), p.id);
  const used = [...read("assets/shell.js").matchAll(/g\("([a-z-]+)"/g)].map((m) => m[1]);
  for (const g of new Set(used)) assert.ok(symbols.has("g-" + g), "shell.js uses missing glyph " + g);
  const map = read("assets/shell.js").match(/FILE_ICON = \{([^}]+)\}/)[1];
  for (const g of [...map.matchAll(/: "([a-z]+)"/g)].map((m) => m[1])) assert.ok(symbols.has("g-" + g), "file icon " + g);
  for (const i of ["i-box", "i-box-fill", "i-refresh", "i-power", "i-trash", "i-warn", "i-search", "i-gear", "i-sync", "i-check", "i-shield", "i-octagon", "i-x", "i-wifi", "i-battery", "i-warn-o"]) assert.ok(symbols.has(i), i);
});
ok("pinned apps, quick launch and settings keys all exist", () => {
  const ids = new Set(D.apps.map((a) => a.id));
  assert.equal(ids.size, D.apps.length);
  for (const id of [...D.defaultPinned, ...D.quickLaunch]) assert.ok(ids.has(id), id);
  assert.equal(D.defaultPinned.length, 8, "the app pins at most eight");
  for (const m of D.settingsMenu) if (m !== "-") assert.ok(m.key in D.settingsDefaults, m.key);
  for (const m of D.settingsMenu) if (m !== "-" && m.needs) assert.ok(m.needs in D.settingsDefaults, m.needs);
  assert.deepEqual(D.edges, ["Right", "Left", "Top", "Bottom"]);
});
ok("folders: unique ids, items typed, and one real folder inside a folder to zoom into", () => {
  const ids = D.folders.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  const types = new Set(["doc", "zip", "image", "music", "code", "folder"]);
  const walk = (items) => items.forEach((i) => { assert.ok(types.has(i.type), i.name); assert.ok(i.name); if (i.type === "folder") { assert.ok(Array.isArray(i.items)); walk(i.items); } });
  D.folders.forEach((f) => { assert.ok(f.title && f.items.length, f.id); walk(f.items); });
  assert.ok(D.folders.some((f) => f.items.some((i) => i.type === "folder")));
});

/* ---------- the page ---------- */
const allJs = ["assets/data.js", "assets/logic.js", "assets/sfx.js", "assets/depdeck.js", "assets/shell.js", "assets/app.js"].map(read).join("\n");
ok("every id the scripts look up exists in the page", () => {
  // ids in the page, plus ids the scripts write into the DOM they build (id=\"...\" inside strings)
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).concat([...allJs.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  const wanted = [...allJs.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
  for (const id of new Set(wanted)) assert.ok(ids.has(id), "missing #" + id);
  for (const s of ["data", "logic", "sfx", "depdeck", "shell", "app"]) assert.ok(html.includes(`assets/${s}.js`) && fs.existsSync(path.join(root, `assets/${s}.js`)), s);
});
ok("no external requests: nothing but same-site files is loaded", () => {
  const loads = [...html.matchAll(/<(?:script|link|img|source|iframe)\b[^>]*?(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^#/.test(u));
  for (const u of loads) {
    if (u === "https://dhairyab0069.github.io/macos-tools-io/") continue; // the canonical link
    assert.ok(!/^(https?:)?\/\//.test(u), "external load: " + u);
    assert.ok(fs.existsSync(path.join(root, u)), "missing file: " + u);
  }
  assert.ok(!/url\(\s*["']?(https?:)?\/\//.test(css), "css loads something external");
  assert.ok(!/@import|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|new Image\(/.test(allJs + css), "scripts or css request something");
  assert.ok(!/googleapis|gstatic|cdnjs|jsdelivr|unpkg|google-analytics|gtag/i.test(html + allJs + css));
});
ok("links go only to the two repos, their owner's pages and the Himawari page", () => {
  const hrefs = [...html.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]);
  const allowed = [/^https:\/\/github\.com\/dhairyab0069\/(DepDeck|desktop-shell-mac|macos-tools-io)$/, /^https:\/\/dhairyab0069\.github\.io\/(himawari-io\/|macos-tools-io\/)?$/];
  for (const h of hrefs) assert.ok(allowed.some((r) => r.test(h)), "unexpected link " + h);
  assert.ok(hrefs.includes(D.repos.depdeck) && hrefs.includes(D.repos.shell));
  assert.ok(!/releases/.test(html), "no release link: neither repo has a release yet");
});
ok("canonical, Open Graph, icons and images", () => {
  assert.ok(html.includes('<link rel="canonical" href="https://dhairyab0069.github.io/macos-tools-io/">'));
  assert.ok(html.includes('property="og:url" content="https://dhairyab0069.github.io/macos-tools-io/"'));
  assert.ok(html.includes('property="og:image" content="https://dhairyab0069.github.io/macos-tools-io/assets/og-image.png"'));
  assert.ok(html.includes('rel="icon"') && html.includes("favicon-64.png"));
  assert.match(html, /<html lang="en">/); assert.match(html, /name="viewport"/);
  const dims = (f) => { const b = fs.readFileSync(path.join(root, f)); assert.equal(b.slice(1, 4).toString(), "PNG"); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  assert.deepEqual(dims("favicon-64.png"), [64, 64]);
  assert.deepEqual(dims("assets/og-image.png"), [1200, 630]);
  assert.ok(fs.existsSync(path.join(root, ".nojekyll")));
});
ok("the page says these are recreations, and both screens carry the label", () => {
  assert.ok(/In-page recreations/.test(html) && /not screenshots/i.test(html));
  assert.equal((html.match(/In-page recreation, not a screenshot/g) || []).length, 2);
  assert.ok(/sample data/i.test(html));
});
ok("css respects reduced motion and dark mode", () => {
  assert.ok(/prefers-reduced-motion: reduce/.test(css) && /prefers-color-scheme: dark/.test(css));
  assert.ok(!/font-face|fonts\./.test(css));
});
ok("sound is off by default, synthesized, and needs no audio files", () => {
  const ctx = { window: {}, document: { hidden: false }, localStorage: { getItem: () => null, setItem() {} } };
  ctx.globalThis = ctx; vm.runInNewContext(read("assets/sfx.js"), ctx);
  assert.equal(ctx.window.MT_SFX.isOn(), false);
  assert.doesNotThrow(() => ctx.window.MT_SFX.play("click"), "playing while off is a no-op");
  assert.ok(/createOscillator/.test(read("assets/sfx.js")));
  assert.ok(!/<audio|new Audio\(|(src|href)=["'][^"']*\.(mp3|wav|ogg|m4a)/i.test(html + allJs));
  assert.ok(html.includes('id="snd"') && html.includes("Sound off"));
  assert.deepEqual(fs.readdirSync(path.join(root, "assets")).filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f)), []);
});
ok("no commit-trailer or tool credit text slipped into the page", () => {
  assert.ok(!/Co-Authored-By|Generated with/i.test(html + allJs + read("README.md")));
});

console.log(`\n${n} checks passed`);

# macos-tools-io

The project page for two macOS apps, with a playable drawing of each:
**[dhairyab0069.github.io/macos-tools-io](https://dhairyab0069.github.io/macos-tools-io/)**

- **[DepDeck](https://github.com/dhairyab0069/DepDeck)**: a menu bar app for managing command-line tools and dependencies across Homebrew, npm (global) and cargo.
- **[Desktop Shell](https://github.com/dhairyab0069/desktop-shell-mac)**: a Windows XP-style taskbar and Start menu, iOS-style desktop folders and Aero widgets for macOS.

## These are recreations, not screenshots

Everything on the page is drawn with HTML, CSS and JavaScript, following the two apps' source code.
The package names, versions, files and the song are made-up sample data. Nothing is installed, no
command is run, and nothing leaves the browser.

| Display A: DepDeck | Display B: Desktop Shell |
|---|---|
| A drawn macOS menu bar with the DepDeck item (icon, outdated count, warning count). The popover has the app's five tabs: Installed (filter, update, uninstall), Updates (Update All), Issues (Replace with, Uninstall), Search (Homebrew and crates.io), Settings (auto-install, interval). Updates animate, can fail on demand to show the error banner, and a scheduled check can be fast-forwarded. Light and dark. | A drawn Luna desktop. XP taskbar (start, quick launch, one button per open window, Downloads, tray clock), the Start menu (pinned and frequent apps, search, All Programs, places, recent documents, Desktop Settings, Turn Off), iOS-style folders that zoom open and rearrange, Aero widgets (Now Playing, calendar, battery, CPU and memory, storage) dockable to any edge, draggable windows, and a terminal that understands `desktopctl`. Window placement follows the app's real tiling rule. |

The two screens share one frame (bezel, label, demo controls) and keep their own looks: a modern
translucent menu bar for DepDeck, Luna blue for the shell.

Keyboard: every control is a real button or input. In the Start menu the arrow keys move within and
between columns, Right or Enter opens a flyout, Esc closes. Tap Option (Alt) with the desktop
focused or hovered for Start; Ctrl+Cmd+T opens the Ghostty window. Dark mode is followed.

## The workbench around the tools

The page itself is a small workbench, drawn on one canvas with one animation loop:

- **Pegboard background:** dots that glow and shift around the pointer, tool silhouettes (screwdriver, spanners, hammer, nut, tape rule) that drift and lean toward it, a few sparks when you click bare background, and a soft glow inside buttons (buttons never move).
- **Toolbox tray:** pick up the DepDeck or Desktop Shell card by its grip, flip it to read the facts, and drop it in the *Now using* slot. That tool's drawn screen lights up and opens. Flip and Use now buttons do the same without dragging.
- **Feature chips:** each chip lights up the matching part of the drawn screen (for example *Update All* opens the Updates tab and pulses that button; *Aero widgets* unfolds and highlights the widget panel).
- **Scroll assembly:** purely decorative and fast: parts settle the last few pixels and bolts turn as each section arrives. Content is always visible and readable, and nothing plays a sound for it.
- **How it is built:** an animated diagram for each app, drawn only from what the repositories' READMEs and code do. DepDeck: the three parsers (`brew info --json=v2 --installed`, `npm ls -g` / `npm outdated -g`, `cargo install --list` plus the crates.io API) into `Package` and the Store. Desktop Shell: `launchd`, the four services, `ShellKit` (one settings domain, the changed notification) and a tiling map that uses the same cut rule as the app, with a choice of widget edge.
- **Dock:** Reset, Shuffle sample data, jump to either tool, and copy the build commands of the tool you are using.

## Sound, motion and effects

A three-way theme control and four icon buttons are fixed at the top right and stay visible while scrolling (icons only, so they fit a phone):

| Button | What it switches |
|---|---|
| Speaker | Sound |
| Wave | Motion: the background loop, drift, scroll assembly, diagram flow, widget numbers, and every animation inside both recreations |
| Burst | Effects: pointer glow, click sparks and the glow inside buttons |
| Pause ring | Quiet everything: all three off; pressed again, the previous state is restored |

Each is a real button with `aria-pressed`, an `aria-label` that states the state in words (*Sound on*), a tooltip, a 44 px target and a visible focus ring.

**Defaults on a first visit: sound on, motion on, effects on.** Motion starts off only if the system asks for reduced motion
(`prefers-reduced-motion`, which also keeps the page still whatever the button says). Browsers only start audio after a first
pointer, key or touch, so the audio context is created and resumed then. Choices are saved in `localStorage` under fresh keys
(`mt2-sound`, `mt2-motion`, `mt2-fx`), so an older saved "off" cannot carry over. The loop and all sound stop while the tab is hidden.

The sounds are toolbox sounds synthesized in the browser with the Web Audio API (filtered noise plus a few inharmonic sine partials for metal;
no audio files, no extra requests): ratchet clicks (Update All is a ratchet run), spanner tightening, screwdriver turns, drawer slides (folders
open), latch clacks (Start menu), a bolt drop, a measuring-tape snap, a toolbox lid, and a dull clunk for a failed update. Volume is low,
there are no hover sounds, two sounds never start within 30 ms of each other, and at most 36 voices sound at once.

## Theme: light, dark or auto

The page follows one shared setting, the same as every other page on `dhairyab0069.github.io` (one origin, one `localStorage` value):
key `theme`, values `light`, `dark` or `auto` (absent means auto). An inline script in `<head>` resolves it before the CSS paints and sets
`data-theme-mode` (what was chosen) and `data-theme` (what shows) plus `style.colorScheme` on `<html>`. The CSS tokens live under
`:root[data-theme="light"]` (bright workshop) and `:root[data-theme="dark"]` (night workshop), with a `prefers-color-scheme` fallback on
`:root:not([data-theme])`. The sun, moon and half-circle radio buttons (`role="radiogroup"`, 44 px) sit in the fixed control group. Choosing
writes the key and dispatches `themechange` on `window`; a change on another page arrives as a `storage` event and applies live; in auto the
system setting is followed. The canvas re-reads its colours on `themechange`, the DepDeck popover follows light or dark like a real macOS popover,
and the Luna-blue shell stays Luna blue in both (only its frame changes). The switch is a short circle reveal (View Transition) with a soft
two-note cue, and instant when motion is off or reduced. `assets/theme.js` holds all of it.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The page: copy, the icon sprite and the two stage frames |
| `assets/style.css` | The shared frame and both looks |
| `assets/data.js` | All sample data (packages, apps, folders, settings menu) |
| `assets/logic.js` | The rules, with no DOM: menu bar label, tiling map, layout, Start search, `desktopctl` parsing |
| `assets/depdeck.js`, `assets/shell.js` | The two recreations |
| `assets/prefs.js` | The Sound, Motion and Effects switches and Quiet everything (rules plus wiring) |
| `assets/sfx.js` | The synthesized toolbox sounds |
| `assets/bench.js` | The pegboard canvas and its one loop, sparks, magnets, hover ticks, scroll assembly |
| `assets/toolbox.js` | Tool cards and the Now using slot, feature chips, the dock, the two diagrams |
| `assets/app.js` | Scaling of the stages and start-up |
| `assets/og-image.png`, `favicon-64.png` | Social preview and icon |
| `tests/run.js` | Checks, run with node |

No build step, no libraries, no web fonts, no external requests.

## Develop and test

```sh
open index.html          # or any static server
node tests/run.js        # or: npm test
```

The tests cover the rules in `logic.js` (including a port of the app's `DesktopLayout.cut`), the
consistency of the sample data, the symbol sprite, links (only the two repos, their owner's pages and
Himawari; no release links, because neither repo has a release yet), the absence of external
requests, canonical and Open Graph tags, the default-on switches (including Quiet everything and the reduced-motion rule), the sample-data shuffle, and that
sound is synthesized with no audio files.

Hosted by GitHub Pages from `main` (the root); `.nojekyll` is present.

## Design

[DESIGN.md](DESIGN.md) documents the design (purpose, theme, tokens, motion, sound, controls, accessibility, decisions, how to extend).

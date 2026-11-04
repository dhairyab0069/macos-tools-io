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
focused or hovered for Start; Ctrl+Cmd+T opens the Ghostty window. `prefers-reduced-motion` turns
animation off, and dark mode is followed.

The **Sound** switch (bottom right) is off until pressed. The effects are synthesized in the browser
with the Web Audio API: no audio files, no extra requests.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The page: copy, the icon sprite and the two stage frames |
| `assets/style.css` | The shared frame and both looks |
| `assets/data.js` | All sample data (packages, apps, folders, settings menu) |
| `assets/logic.js` | The rules, with no DOM: menu bar label, tiling map, layout, Start search, `desktopctl` parsing |
| `assets/depdeck.js`, `assets/shell.js` | The two recreations |
| `assets/sfx.js`, `assets/app.js` | Optional sound; scaling of the stages and start-up |
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
requests, canonical and Open Graph tags, and that sound is off by default.

Hosted by GitHub Pages from `main` (the root); `.nojekyll` is present.

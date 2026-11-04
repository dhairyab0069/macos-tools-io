# macOS tools: design

Written 2026-11-04 from the page as it stands (the page already follows the shared design language; this file documents it). Keep it current: every customisation gets a line in "Decisions".

## Purpose
The project page for two macOS apps, each with a playable drawing: **DepDeck** (a menu bar app that manages command-line tools across Homebrew, npm and cargo) and **Desktop Shell** (a Windows XP-style taskbar and Start menu, iOS-style folders and Aero widgets for macOS). Readers are people deciding whether to install either. Both screens are recreations drawn in HTML, CSS and JavaScript from the two apps' source; the package names, versions, files and the song are made-up sample data, nothing is installed and nothing leaves the browser. The page around them is a **workbench**: a pegboard background on one canvas, a toolbox tray where you drag a tool card into the "Now using" slot to light up its screen, feature chips that light up the matching part of the screen, a scroll assembly that settles parts and turns bolts, "How it is built" diagrams for each app, and a Dock (Reset, Shuffle sample data, jump to either tool, copy build commands).

## Theme choice and why
**Workshop**: warm paper, white benches and aluminium frames by day; ink-blue bench, dim panels and glowing lamps by night. The page is a place where tools are laid out, so it looks like the room they live in. The frame (page and bezel) stays neutral graphite and paper; each screen keeps its own look: a modern translucent menu bar for DepDeck (which follows light or dark like a real macOS popover) and Luna blue for the shell (Luna blue in both themes; only its frame changes). Both sets are designed, not inverted.

## Tokens
Defined once in `assets/style.css`; components read roles.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f4f1ec` | `#111217` |
| `--panel` | `#ffffff` | `#1b1d24` |
| `--ink` | `#1c1d22` | `#eceae4` |
| `--muted` | `#5b5d66` | `#a6a8b2` |
| `--line` | `#d6d0c4` | `#2e313b` |
| `--link` | `#2f4bb8` | `#9fb2ff` |
| `--dd-ink` (DepDeck) | `#4a3bd6` | `#b0a9ff` |
| `--sh-ink` (Desktop Shell) | `#1d54cc` | `#92b3ff` |
| `--bezel`, `--bezel-ink` | `#dedbd3`, `#24262d` | `#0b0c0f`, `#c5c8d2` |

Shared motion tokens: `--t-fast` .14 s, `--t-base` .24 s, `--t-slow` .4 s, `--ease` (a soft settle) and `--ease-snap` (one small snap, used only when a card seats).

## Theme modes (light, dark, auto)
Shared protocol for all of the owner's pages (one origin): localStorage `theme` = `light` | `dark` | `auto` (absent = auto). An inline script in `<head>` sets `data-theme-mode`, `data-theme` and `style.colorScheme` before the CSS paints; tokens under `:root, :root[data-theme="light"]`, `:root[data-theme="dark"]` and a `:root:not([data-theme])` fallback. The radiogroup (sun, moon, half circle; 44 px) sits in the fixed control group. `assets/theme.js` writes the key, dispatches `themechange`, follows `storage` from other pages and the system in auto; the change is a View Transition circle reveal with a soft two-note cue (instant when motion is off or reduced). The canvas re-reads its colours on `themechange`.

## Motion spec
- Personality: workmanlike and quick; things settle, they do not bounce. Buttons never move.
- Pegboard canvas (`assets/bench.js`): dots that glow and shift around the pointer, drifting tool silhouettes that lean toward it, a few sparks on a mouse click on bare background, a soft glow inside buttons. One loop at 25 fps, stops when hidden or Motion is off; resting dots drawn in a single path.
- Scroll assembly is decorative and fast (a 10 px settle, bolts turning); content is always visible and nothing plays a sound for it.
- Inside the recreations: update runs, the Start menu, the widget panel, flows in the diagrams. Motion off stops all of it.
- Gate: Motion on AND the system not asking for reduced motion AND the tab visible; `prefers-reduced-motion` also keeps the page still whatever the button says.

## Sound spec
- Palette: **toolbox**, synthesized with Web Audio (filtered noise plus a few inharmonic sine partials for metal; no files, no requests): ratchet clicks (Update All is a ratchet run), spanner tightening, screwdriver turns, drawer slides (folders open), latch clacks (Start menu), a bolt drop, a measuring-tape snap, a toolbox lid, and a dull clunk for a failed update.
- Quiet by design: low master gain and a compressor, no hover sounds, one sound per action, two sounds never start within 30 ms, at most 36 voices. Nothing plays while the tab is hidden.
- Unlock: the audio context is created and resumed at the first pointer, key or touch.

## Interaction inventory
| Where | Interaction | Feedback |
|---|---|---|
| Toolbox tray | drag a card by its grip, flip to read facts, "Use now" | card seats with one snap; that tool's screen lights up and opens |
| Feature chips | click | matching part of the screen opens and pulses |
| DepDeck popover | five tabs (Installed, Updates, Issues, Search, Settings), Update All, fail on demand, fast-forward the scheduled check | ratchet sounds, error banner |
| Desktop Shell | Start menu with arrow keys, Right or Enter opens a flyout, Esc closes; Option taps Start; Ctrl+Cmd+T opens Ghostty; folders, widgets | latch and drawer sounds |
| Dock | Reset, Shuffle, jump, copy build commands | the tool opens, or the commands are copied |
| Header (fixed) | theme group and four symbols | circle reveal, glyph state |

## Accessibility notes
- Fixed control group, icons only so it fits a phone: Sound (speaker), Motion (waves), Effects (sparkle), Quiet everything (circle with a bar), plus the theme radiogroup. Each is a real button with `aria-pressed` or `aria-checked`, a label that states the state, a tooltip, a 44 px target and a visible focus ring. Quiet restores the previous state.
- Defaults on a first visit: sound, motion and effects on; Motion starts off only under `prefers-reduced-motion`. Keys `mt2-sound`, `mt2-motion`, `mt2-fx` are fresh so an older saved "off" cannot carry over.
- Every control inside the recreations is a real button or input; keyboard model for the Start menu is documented in the README.
- Scrolls clear the 72 px bar and the dock; focus is restored to the same control when a card moves to the slot.
- Contrast at least 4.5:1 in both sets.

## Decisions and trade-offs
| Date | Decision | Why |
|---|---|---|
| earlier | Recreations, labelled as such, from the repositories' code, with made-up sample data | honesty; nothing is installed or run |
| earlier | Interaction pass (`docs/INTERACTION.md`): buttons never move, no cursor trail, no hover or reveal sounds, one sound per action | the first version "felt weird" |
| earlier | Shared theme protocol; DepDeck follows light or dark, the shell stays Luna blue | consistency with the owner's other pages without losing the shell's identity |
| 2026-11-04 | Documented the design in this file | the page already conformed; no behaviour changed |

## How to extend
- Sample data: edit `assets/data.js`; rules without DOM live in `assets/logic.js` and are tested.
- New sound: add it to `assets/sfx.js` with a gap and the voice cap in mind; no hover or reveal sounds.
- New global preference: `assets/prefs.js` (rules plus wiring), versioned key.
- Tokens: change `assets/style.css` in both sets; anything that caches colours re-reads on `themechange`.
- After any change: `npm test`, look at a screenshot in light and dark, and add a line to "Decisions".

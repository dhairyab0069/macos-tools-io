# Interaction notes

The owner said the interaction "feels weird". What was wrong, and what changed. One motion language now: three durations
(`--t-fast` .14 s, `--t-base` .24 s, `--t-slow` .4 s) and two easings (`--ease`, a soft settle; `--ease-snap`, one small snap used only when a card seats).

| Felt weird | Why | Change |
|---|---|---|
| Buttons slid away from the pointer | Magnetic buttons translated the click target by up to 5 px | No offset any more. Mouse only, a soft glow leans toward the pointer inside the button (no transform, no layout) |
| A trail of squares followed the cursor and sparks fired on every press | Trail on every move, sparks on any pointerdown | Trail removed. Sparks (7) only for a mouse click on bare background, never on controls, text or cards |
| Clicking the grip loaded the tool, dragging started a tool jump | Grip was both a button and a drag handle, spring-back with overshoot | A mouse click on the grip does nothing (Enter or Space still loads). 6 px (10 px touch) threshold, a ghost follows the pointer while the real card stays as a dashed outline, the slot lights up and says "Drag it here", release glides the card in and seats it, anywhere else it glides straight back and a note says why, Escape cancels, and "Put it back" and the tray are the ways out |
| Content hid until scrolled to | Scroll assembly set opacity 0 | Always visible. Only a 10 px settle and bolts turning, fast, with no sound |
| Sounds fired on hover, on scroll reveal, and twice per click | Hover ticks, reveal sounds, a global click plus each handler's own sound | No hover or reveal sounds, one sound per action, 30 ms global gap, master gain .26 to .2 |
| Widgets lost clicks and the artwork animation restarted every second | The widget panel was rebuilt with innerHTML each tick | Updated in place (a small DOM morph), so nodes, hover, focus and animations survive |
| Chip and dock scrolls ended under the bar or the dock | Fixed offset ignored the bars | Scroll clear of the 72 px bar and the dock, smooth only while motion is on, action fires after 120 ms |
| Canvas cost | About a thousand fills per frame at 30 fps | Resting dots drawn in one path, 25 fps, stops when hidden or motion is off |
| Focus vanished when a card moved to the slot | The focused node was re-parented | Focus is restored to the same control |

Theme: see the Theme section of the README. The Quiet button is a circle with a bar (do not disturb), and Effects is a sparkle, so neither looks like the sun, moon or pause symbols used elsewhere.

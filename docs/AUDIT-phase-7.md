# Phase 7 unslop audit

Method: followed the unslop rules in `docs/DESIGN.md`, including "Phase 7 motion and 3D additions". Ran the dev server and drove headless Chrome over the DevTools Protocol. Took screenshots of My view at 1600 by 1000 in light and dark, at three points: Level 4 at the merge conflict, after the conflict was fixed, and in the flat (2D) mode. Took a second set at 1180 by 900 to check the narrowest left column, including a click on a level button on the 3D path. Performance was measured on the production build in the same way as Phase 6 (see below).

Result: light slop. Three fixes were made during the audit (below). Six notes carry forward.

This audit covers 7h and 7i in detail. 7a to 7g were built and ticked earlier in this phase and still have their owner checks open in the tracker. The checks below that apply to the whole phase (motion rules, themes, performance, tests) were run over all of it.

## What was built in this pass

- **7h Level map as a 3D path.** `src/components/levelmap/LevelPathScene.tsx` is its own lazy chunk. It draws a stepping-stone per level, a medal on every level whose badge is earned, and a plinth at the end holding the three badges that are not about one level. The learner's figure stands on the level that is loaded. Choosing another level makes the figure hop across each stone in between, once. A newly earned medal rises onto its stone, once. A stone finished in the seat being played turns flat green, and the loaded level has a thin accent rim. The level buttons are ordinary HTML laid under the stones, so the keyboard, focus rings and screen readers work as before. The plain logic (layout, hops, pebbles, what each stone shows) is in `levelPath.ts`. Badges come from the same `computeBadges` as the Progress Card. The 2D fallback is the flat row of buttons from before, plus a "Badges 3 of 8" line. The 3D-or-flat choice is shared with the pipeline and the ticket journey, through a small icon button beside the level title.
- **7i Conflict scene.** This replaces 7g's red barrier with a merge gate between the developer desk and GitHub. Your parcel (accent) waits on one side. The teammate's parcel (dark grey) hops down from GitHub to the other side, then the flat red gate shakes once. When the conflict is fixed, the bar lifts and their parcel rides through into yours. Pushing carries the one parcel on as before. The gate's tag sits below the gate and names both parcels with matching swatches ("Yours", "Theirs", then "Yours and theirs, merged"). Positions and timing are in `src/components/pipeline/mergeGate.ts`. The 2D list shows the same story in its "Stopped" row: a "Yours" chip, a red bar that shakes once, and a "Theirs" chip that slides in, which become one chip once the conflict is fixed.
- **Shared helper.** `placeLabel` moved out of the ticket scene into `src/components/pipeline/placeLabel.ts` so the level path uses the same code.

## Signs checked

| Area | Result |
| --- | --- |
| Gradients, glows, particles, coloured shadows | None. Medals, stones, gate and parcels are flat Lambert colours from the theme tokens. No new lights |
| Colour | One accent: your parcel, your figure, earned medals, the current stone's rim. Pass is the same flat green as the stations; the closed gate is the same flat red as a failed test |
| Colour is never the only signal | Stones have numbered buttons (with a check when finished); the plinth has a "Badges n of 8" tag; the gate tag names "Yours" and "Theirs" beside swatches in the parcels' colours; the 2D rows say the same in words |
| Motion | Every motion plays once and is started by a learner action: choosing a level (the hop), finishing a level (the medal), a pull that stops (their parcel and one shake), fixing the conflict (bar lifts, parcels merge). Nothing loops. Transform and colour only |
| Reduced motion | Every new motion reads its end state when reduced motion is on: the figure stands on the stone, the medal is there, the gate shows its end state. The 2D motions use the existing `motion-*` classes, which reduced motion turns off. Covered by tests (`gateFrame(..., Infinity)`), not checked with the OS setting in a browser |
| 2D fallback | Both new views have one. It is shown with no WebGL, on a weak device, if the 3D chunk fails, and when the learner chooses it |
| Lazy loading | `LevelPathScene` is its own chunk (2.3 kB gzip). Nothing 3D is requested before first paint (see Performance) |
| Icons | lucide `Box`, `Rows3` and `Check` at 16px and 1.5 stroke. The 2D gate row reuses the list's existing 14px status icons (see note 4) |
| Copy | Sentence case, no exclamation marks: "Badges 3 of 8", "Yours", "Theirs", "Yours and theirs, merged", "Show the levels as a 3D path" |
| States | Level buttons on the path keep the current (accent border), hover and focus states of the flat row; `aria-current` on the loaded level |
| Themes | Checked light and dark. The scenes read the live tokens, so a theme change recolours them |
| Dependencies | None added |

## Fixed during the audit

1. **The gate's tag hid the gate.** Centred over the gate, the two-line tag covered both parcels and the GitHub label. It now hangs below the gate, in the open corner of the base.
2. **The teammate's parcel looked white.** Its wide ribbons used the card colour, so the grey box read as a white one. Its ribbons now use a mid grey, and the two parcels are told apart at a glance.
3. **3D could load before first paint.** `useAfterFirstPaint` (shared by all three scenes) waited only for React's first render. On a slow screen that came before anything was painted: the 3D chunks were requested about 200 ms before first contentful paint. This happened on the last commit too, so it was there before this pass. The hook now waits for the browser's own first-contentful-paint entry, and falls back to "after the next frame" in browsers without paint timing. Also, the medals were enlarged by 40%, because at the narrow column they read as pins.

## Performance

Production build, `vite preview`, headless Chrome 153, three runs each:

| Measure | Result |
| --- | --- |
| First contentful paint | 0.93 to 1.43 s. The last commit, built and measured the same way on this machine, gave 1.06 to 1.13 s, so this is the machine and its software renderer, not this phase. Phase 6 recorded 96 ms on a different run; the two are not comparable |
| 3D chunks on a weak device (headless Chrome uses a software renderer) | Never requested; the 2D views show |
| 3D chunks on a capable device (renderer hint hidden) | Requested 20 to 30 ms after first contentful paint, in every run |
| 3D chunk sizes, gzip | three.js and the shared station parts 244.6 kB; pipeline scene 3.2 kB; ticket journey 2.5 kB; level path 2.3 kB |
| Main bundle, gzip | 137.2 kB, up from 135.2 kB before 7h and 7i (the plain layout and timing modules, which the 2D views also use) |
| Console errors | None from Phase 7 code. See note 1 |

## Notes carried forward

1. **A console error that comes from older code.** React reports a `<div>` and a `<p>` nested inside a `<p>`, from the jargon tooltip inside the step card's lead line (`StepCard`, `JargonText`). It shows in development only and is not from this phase. It is worth a small fix: the tooltip's body should be a `<span>`.
2. **Headless Chrome only.** The 3D screenshots used a software renderer, with the app told to draw 3D. Not checked on a real graphics card, in Firefox or Safari, or with the OS reduced-motion setting turned on.
3. **The 3D-or-flat choice is one switch for all three scenes.** Turning the level map flat also turns the pipeline and ticket journey flat. That matches 7f's decision, but the icon button in the left panel is small for a choice that wide.
4. **Icon size in the 2D gate row.** It reuses the station list's 14px status icons in 20px boxes. DESIGN.md asks for 16 or 18. The whole list does this, from Phase 3.
5. **The teammate's parcel only appears at the conflict.** It does not sit at GitHub from the moment the teammate pushes. That would show the change earlier, but the pull is the moment Git meets it, which is the lesson.
6. **Medal rise when a level finishes.** It plays behind the Mistakes Replay popup that opens at the end of a level, so most learners will see the medal already standing when they close it. Delaying it until the popup closes would need the popup state in the scene.

## Behaviour checks

Headless Chrome, no exceptions. Level 4 frontend at the pull: `stallAt` is `dev`, the gate is closed with both parcels and both developers at the desk, and the tag names both parcels. After the fix: the gate is open, there is one parcel, and the tag reads "Merge finished. Waiting to be pushed". Flat mode: the gate row and the badge line show. Clicking the level 5 button on the path loads Level 5, and the figure hops 2 to 3 to 4 to 5. At the narrowest column (about 250 px) the five buttons do not overlap.

`npm test` runs 278 tests (up from 253 at the start of 7h and 7i). New: the path layout and fit at three widths, pebble placement, the walk between levels, the map model (seat-specific green, badges in both seats, plinth badges matching the Progress Card), the merge gate's phase, points in both layouts and timeline, and a store run through Level 4 in both seats that checks the gate goes closed, then merged, then gone. `npm run build` passes.

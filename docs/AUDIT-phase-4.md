# Phase 4 unslop audit

Method: followed the unslop skill. Rendered My view, Pipeline view and Team view in headless Chrome in light and dark, at 1440 by 900 and 1280 by 720, at the start of Level 1 and part-way through it (tests passed, review approved), and checked each against `docs/DESIGN.md`.

Result: light slop. Three problems were found while rendering and fixed in this phase. Four notes carry forward.

## Signs checked

| Area | Result |
| --- | --- |
| Gradients, glows, coloured shadows, blur | None in the interface. One deliberate exception: the soft contact shadow under each station is a 64px canvas picture drawn once and reused, plain black at 20% opacity. The PRD asks for baked contact shadows, and this is that. There are no real-time shadows and no coloured ones |
| 3D status colour | Stations change to a flat muted green or red (pad tint, pennant and test lamp). Active is a thin accent frame on the pad. No glow, no emissive material, no bloom |
| Emoji | None. Icons are lucide, 16px, stroke 1.5 |
| Colour | The scene reads the same tokens as the page (`--card`, `--accent`, `--pass`, `--fail` and the neutral ramp) and re-reads them when the theme changes, so light, dark and system all work. No colour exists only in the scene |
| Type | Station name tags and Team view use the existing scale (12, 13, 14, 16). Weights 400 and 500 |
| Copy | Sentence case, no exclamation marks, greetings or hype. Team view says who is waiting on whom in plain words |
| Spacing and radii | 4px scale. Name tags and Team view cards follow the existing radius tokens |
| Motion | The only movement is the parcel hopping to the next station, once per change, on the app easing curve (cubic-bezier 0.22, 1, 0.36, 1). Nothing loops. With reduced motion on, the parcel jumps instead |
| Focus and states | The scene toggle uses the shared button style and focus ring. Team view's skip button is disabled when there is no current step |
| Moments | The diorama is the first of the two signature moments from `DESIGN.md`. The PR and test log were Phase 3 |

## Fixed during the phase

1. **Turned scene hid the back row.** A first attempt turned the diorama 45 degrees so it filled narrow panels. It squashed the depth and the front stations covered the back ones, with labels landing on the wrong station. Reverted to the classic isometric diamond. The narrow My view zone now shows a fixed-shape scene with the station list underneath, instead of a scene floating in empty space.
2. **Labels crashed on unmount.** The first version put the name tags in a library helper that threw a `removeChild` error when you left the view. The tags are now plain HTML laid over the canvas and moved to their station on every drawn frame. That also removed the library helper (`@react-three/drei`) from the project.
3. **Camera fit wasted room.** The camera fitted a box around the whole scene, leaving a band of empty space above the stations. It now fits the slab corners and each station's pad and label height.

## Notes carried forward

1. **Scene chunk size.** The 3D chunk is 929 kB (246 kB gzipped), nearly all three.js. It is a separate file, not referenced from `index.html`, and is requested only after first paint and only when the device is not skipped. The main bundle did not grow. Revisit in the Phase 6 performance check.
2. **Weak-device rule is a guess.** The scene is skipped when the browser reports 2 GB of memory or less, 2 cores or fewer, or a software renderer. Safari and Firefox report no memory figure, so for them only cores and renderer count. The rule has not been tried on real low-end hardware. The toggle always lets a learner switch either way.
3. **Second developer not seen in play.** The extra person and monitor appear when the Git simulation reports a conflict. Level 1 never has one, so this state is built and typed but was not seen rendered. Check it when Level 4 exists.
4. **Small scene in My view.** In the narrow zone the scene is about 34 pixels per unit, so name tags sit close together. It stays readable at 1280 wide. Pipeline view shows the same scene at roughly twice that size.

## Behaviour checks

Automated in headless Chrome (a throwaway script, not part of the repo), no console errors in the final run: the list shows first on the software-rendered test browser (as designed) and the toggle switches to the scene; the scene draws, fits and relabels in both themes; the parcel and station colours follow the Level 1 steps through to tests passed and review approved; switching between My, Pipeline and Team view keeps the same run; leaving the scene view no longer throws.

In the repo, `npm test` now runs 96 tests. New: `src/components/pipeline/sceneLayout.test.ts` (route layout, easing, weak-device rule, 3D or list choice), `src/store/teamFeed.test.ts` (who waits on whom, feed lines), and store tests for the parcel path and the feed.

## Not covered

The 3D scene was seen only under software rendering. Frame rate on a real graphics card and on a weak laptop is not measured.

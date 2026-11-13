# Phase 9 unslop audit

Method: followed `docs/DESIGN.md`, including the new "Phase 9 guidance and layout additions". Built the production bundle, ran `vite preview`, and drove headless Chrome over the DevTools protocol. Screenshots at 1440 by 900, 1024 by 768 and 390 by 844, in light and dark. The run covered the tour (all three cards), the first steps of Level 1 (chat reply, pull, ticket move), a failed commit, "Show me" on a phone, Pipeline view, Team view, the Field guide, and the level-complete moment after auto-filling Level 1. No console errors in any run.

Result: light slop. Four fixes were made during the audit (below).

## Signs checked

| Area | Result |
| --- | --- |
| Gradients, glows, particles, coloured shadows | None added. The outline is a flat dashed accent line |
| Colour | One accent: the outline, "Show me", the tab's "Next" tag and the medal. Warnings use the existing flat red |
| Colour is never the only signal | The step card names the control in words. Warnings carry an icon. The narrow-screen tab says "Next" in text |
| Motion | Transform and opacity only, plus one colour fade for the outline. All play once on a learner action or on mount. Nothing loops or pulses |
| Reduced motion | `.spotlight` joins the reduced-motion list in `index.css`. FLIP skips its animation. "Show me" scrolls without smoothing |
| Height | Not animated. The output box keeps one height instead |
| Icons | lucide `LocateFixed`, `CircleAlert`, `Award`, `Compass` at 16 or 18px, 1.5 stroke |
| Copy | Sentence case, no exclamation marks. Tour and step card copy says what to do in plain words |
| Focus | "Show me" moves keyboard focus to the control. The tour focuses its main button. The outline turns solid when its control has keyboard focus, so focus stays clear |
| Themes | Light and dark checked at all three widths |
| Dependencies | None added |

## Fixed during the audit

1. **Tour card covered its own subject.** Card 2 sat over the step card it describes. Cards now sit beside the left and right zones and along the bottom of the middle one.
2. **Page grew by 3px.** Two screen-reader-only labels in the code zone were placed against the page, not the zone, so the window could scroll a little. Each zone is now the box they are placed in.
3. **Stray scrollbar in the header.** The view tabs' sideways scroll showed a vertical bar on wide screens. It only scrolls below 768px now.
4. **Editor scrolled out of view on narrow screens.** "Keep the newest line in view" in chat and the terminal also scrolled the page. They now scroll only their own box.

## Notes for the owner

1. **Breakpoint.** The three columns need about 1150px, so the one-zone layout starts below 1200px, not at Tailwind's 1280px. On a 1280px laptop you still get three columns.
2. **Outline everywhere.** The outline shows on every learner step. Anyone who wants less help can ignore it. A setting to turn it off would be a small addition if wanted.
3. **Seen while testing, not changed.** After Level 1 is auto-filled, ORD-14 stays in "In progress" on the board. That is how the level data is written (no step moves it to Done). Left as is.

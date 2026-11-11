# Phase 3 unslop audit

Method: followed the unslop skill. Rendered My view in Chrome in light and dark at 1440 and 1280 wide, in the recap, Sync Check, editor, pull request and replay states, and checked each against `references/signs.md` and `docs/DESIGN.md`.

Result: light slop. Four problems were found while rendering and fixed in this phase. Three notes carry forward.

## Signs checked

| Area | Result |
| --- | --- |
| Gradients, glows, coloured shadows, blur | None. Popups use a flat 40% dim layer with no blur. The only shadow is the 5% hairline shadow on small light-mode elements |
| Emoji | None. Icons are lucide, 16px, stroke 1.5, one set |
| Colour | Warm ramp and three text roles only. Accent is used for the selected tab and role, the selected Git action, the Run and Merge buttons, the active pipeline station and the step progress bar. Green and red appear only as passed and failed (checks, stations, test log) |
| Type | Figtree and JetBrains Mono. Weights 400 and 500. No uppercase labels, no italics, tabular numerals |
| Copy | Sentence case. No exclamation marks, greetings or hype. Error and warning text says what happened and what to do |
| Spacing | 4px scale. Panels padded 16, step card 16, ticket cards 12, controls 32 tall |
| Radii | Panels 16. Everything inside a panel uses 6, since 16 minus 16 padding would be 0 and the floor is 4 |
| Motion | Colour and opacity transitions only, 150ms, one easing curve. No looping animation |
| Focus and states | Visible 2px accent focus ring on every control, including the code editor and dialogs. Hover, selected and disabled states are distinct |
| Signature | The order-ticket tag (ticket number, dashed torn edge, type) is on every ticket |
| Moments | The pull request page with its test log is built. The 3D diorama arrives in Phase 4; the right zone is a flat station list meanwhile |
| Template check | The screen no longer fits any product: ticket slips, a real Git command under every button, and a kitchen-line pipeline are specific to this one |

## Fixed during the phase

1. **Editor jumped files.** When the code step completed, the editor switched from `CheckoutButton.jsx` to `CartSummary.jsx`. It now stays on the file you were editing.
2. **Hover cards forced scrollbars.** The invisible hover cards were wider than their zone, which added a sideways scrollbar to the centre zone, and the Sync Check dialog clipped its own hover card. Hover cards are narrower, the centre zone clips sideways overflow, and dialogs no longer clip. Long lists inside dialogs scroll themselves.
3. **Accent overuse in the editor.** Syntax colouring used the accent for keywords and green for strings. Code is now monochrome: keywords in primary text at weight 500, strings, tags and numbers in secondary text, comments muted. Accent and green keep their meaning.
4. **Auto-fill showed a template.** Skip and auto-fill logged the push as `git push -u origin {branch}` instead of the real branch name. The command ran correctly but the terminal displayed the placeholder. Fixed in the engine, with a regression test.

## Notes carried forward

1. **Short windows scroll.** At 1280 by 800 the centre zone scrolls to reach the terminal. It never scrolls the page. A taller window shows everything.
2. **Editor bundle size.** CodeMirror is 399 kB (136 kB gzipped) as a lazy chunk, loaded when My view opens. The main bundle is 99 kB gzipped. Revisit in the Phase 6 performance check.
3. **Hover card position.** Cards open below the word and can be cut off at a zone's edge for a word near the right side. Fine for Level 1 prompts. Revisit if a later prompt places a term at the far right.

## Behaviour checks

Automated in Chrome (a throwaway script, not part of the repo), all passing with no console errors: recap opens and closes; chat choices; Sync Check opens when you move the ticket or create a branch before pulling, refuses a non-pull command, shows the hint, and carries out the held-back action after a correct pull; Skip and auto-run and Ignore both work; branch, edit, commit, push, pull request and merge through the real UI including typing in CodeMirror; the bad branch name warning; test log and pipeline stations; Mistakes Replay for a clean run, an auto-filled run and an ignore-everything run; level completion saved and kept after reload; Jargon Helper in Off, First time and Always modes with the cheat sheet; role bar behaviour; tab switching keeps the run; no page scroll at 1280 by 800.

In the repo, `npm test` now runs 72 tests, including `src/store/levelStore.test.ts`, which drives a full Level 1 through the same store actions the buttons call.

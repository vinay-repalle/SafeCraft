# Phase 5 unslop audit

Method: followed the unslop skill. Rendered My view in headless Chrome at 1440 by 900 in light, in the level map, Level 3 after the red test, Level 4 at the teammate push and at the conflict, Level 2 from the backend seat, Team view and the observe-only message, and checked each against `docs/DESIGN.md`. Read all ten level files for copy.

Result: light slop. Nothing visual had to be fixed. Copy was checked by search and by reading. Six notes carry forward.

## Signs checked

| Area | Result |
| --- | --- |
| New UI | One new component, the level map: five 32px buttons in a row, the selected one with the accent border, a completed one with a 16px lucide check in the pass colour. No new colours, shapes or motion |
| Gradients, glows, shadows, emoji | None added |
| Copy | A search of all level and jargon files found no exclamation marks, no greetings and no em dashes. Teammates talk like colleagues: "Agreed. I'll return estimatedMinutes as a number", not "Great question!" |
| Realistic content | The same food app, real file shapes, real Git output. The conflict markers, the `CONFLICT (content)` line and the "Automatic merge failed" line are what Git prints |
| Template check | Each level has its own trap taken from real work: text instead of a number in an API, money printed without decimals, two people renaming one line, a requirement that changes mid-ticket |
| States | Failed tests show in red in the pipeline list, the pull request tab and the step card, with plain words on what to do next. The conflict shows as a row on the pull request page |

## What was built

- **Engine**, each with tests: `after` on a step (a teammate pushes, or the project manager edits a ticket), `testsRan`, `conflict` and `conflictResolved` checks, chat replies that record a mistake, five level-specific mistakes, and detection of committed conflict markers.
- **Content**: Levels 2 to 5, and all five levels again from the backend seat. 9 new level files, 3 new jargon terms.
- **Backend role**: the role bar switches seat and restarts the same level from the other side. Completion is saved per role, so Level 2 can be finished once as each.
- **UI**: level map, Next level button, failed-test guidance, a conflict row on the pull request page, Sync Check closes and explains when a pull stops on a conflict.

## Notes carried forward

1. **Typed answers are strict.** Code steps check for an exact piece of text, so `Delivery: ${deliveryFee.toFixed(2)} (incl. tax)` must match character for character, including spacing. Each step has a hint that shows the shape. Looser checks (ignoring spacing) would be a small engine change if learners trip on it.
2. **Level 3 depends on following the ticket.** The red test is guaranteed because the step demands the ticket's exact line, and the tests ask for slightly more. A learner who writes the better version straight away cannot finish that step. That is deliberate, and the prompt says "the exact line".
3. **Typing was not tested in a browser.** The browser run used Skip and auto-fill and the buttons. Typing into CodeMirror was covered in Phase 3 only. The engine tests do type the edits, through the same action the editor sends.
4. **Level text for the backend seat was read, not played by a person.** All ten level files play to the end in tests, and Level 2 from the backend seat was driven in the browser. Levels 1, 3, 4 and 5 from the backend seat were checked by the engine tests only.
5. **Not built, not in the phase list.** "A day in this role" cards, the "Just watch" mode for observe-only roles, and Pro Mode scoring. Observe-only roles see a short message in My view and can use Team view and Pipeline view.
6. **Main bundle grew.** All ten level files are bundled into the main file, which went from 330 kB (102 kB gzipped) to 445 kB (115 kB gzipped). Loading each level on demand would win most of that back. Revisit in the Phase 6 performance check.

## Behaviour checks

Headless Chrome, no console errors: level map selection; Level 3 shows the red test, Sam's question and the failed station; Level 4 shows the teammate push, the markers in the editor, the real conflict output in the terminal and a second developer in the 3D scene; switching to Backend developer restarts the level from that seat with its own tickets and files; Level 2 from the backend seat; Team view with the push shown under both roles; the observe-only message.

In the repo, `npm test` runs 142 tests (up from 96). New: `src/engine/levels.test.ts` (every level from both seats, the red test, the conflict, the changed ticket, each new mistake) and store tests for role, level switching, conflict handling and the feed.

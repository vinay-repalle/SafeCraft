# Build Tracker

Status: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

Claude writes files and lists what changed. The owner runs it, checks the "done when" gate, and does all Git and deploy work.

## Phase 1: Foundation
Done when: the app opens, light/dark/system theme works and survives reload, exported progress imports back.
- [x] Vite, React, TypeScript, Tailwind setup
- [x] Design tokens (neutral ramp, one accent, type, spacing) in `src/index.css`
- [x] Theme: light, dark, system (default system, saved, no flash on load)
- [x] App shell, role bar, view tabs (placeholder views only)
- [x] Zustand store with localStorage (`src/store/`)
- [x] Progress export/import (`src/utils/progressFile.ts`)
- [x] Unslop audit: see [AUDIT-phase-1.md](AUDIT-phase-1.md)
- [x] Owner check of the "done when" gate, then Git

## Phase 2: Engine and Level 1 data
Done when: a Level 1 run passes in a test harness and the engine emits events.
- [x] gitSim (`src/engine/gitSim.ts`: branches, commits, pull, push, conflicts, plus the GitHub pull request side)
- [x] jiraSim (`src/engine/jiraSim.ts`)
- [x] testRunner (`src/engine/testRunner.ts`)
- [x] levelRunner (`src/engine/levelRunner.ts`: steps, Sync Check gates, mistakes, events, Skip & Auto-Fill)
- [x] jargon.json (16 terms)
- [x] level1.json (food ordering app, 13 steps, 8 replay rules)
- [x] Test harness: Vitest, `npm test`, 61 tests including full Level 1 runs
- [x] Level data validator and authoring guide: [LEVEL-AUTHORING.md](LEVEL-AUTHORING.md)
- [x] Unslop audit: see [AUDIT-phase-2.md](AUDIT-phase-2.md)
- [x] Owner check of the "done when" gate, then Git

## Phase 3: Level 1 playable (demo)
Done when: Level 1 plays end to end in My View.
- [x] Jira board and chat (`src/components/jira/`; order-ticket tag on every ticket)
- [x] CodeMirror editor and Git buttons with real commands (`src/components/editor/`; buttons show the command, a mini terminal logs it)
- [x] Sync Check popup (pull before start and before push; type, hint, skip and auto-run, ignore)
- [x] Jargon Helper (underlined terms, hover and first-time cards, Off / First time / Always, cheat sheet panel)
- [x] Skip & Auto-Fill (on every learner step)
- [x] Mistakes Replay
- [x] Pull request page and test log, and a flat pipeline station list (the 3D scene replaces the list in Phase 4)
- [x] Level store bridging engine and UI (`src/store/levelStore.ts`), with tests
- [x] Unslop audit: see [AUDIT-phase-3.md](AUDIT-phase-3.md)
- [x] Owner check of the "done when" gate, then Git

## Phase 4: 3D pipeline and views
Done when: Level 1 drives the 3D scene and all views work smoothly.
- [x] Diorama with code-built low-poly stations (`src/components/pipeline/`: orthographic isometric camera, render on demand, no real-time shadows, pixel ratio capped at 1.5, parcel carried between stations, flat green or red for pass and fail, second developer for conflicts)
- [x] Team View (`src/views/TeamView.tsx`: all five roles side by side, who is waiting on whom, a feed that ripples each action to the roles it affects)
- [x] Pipeline View (`src/views/PipelineView.tsx`: full-size scene plus the current step, no code)
- [x] Lazy loading and 2D fallback (scene is a separate chunk loaded after first paint; list shown without WebGL, on weak devices, if the scene crashes, or by choice)
- [x] Level store tracks the package and the team feed, with tests
- [x] Unslop audit: see [AUDIT-phase-4.md](AUDIT-phase-4.md)
- [x] Owner check of the "done when" gate, then Git

## Phase 5: Levels 2 to 5
Done when: all five levels are playable and the Backend role works.
- [x] Engine additions, each with tests: teammate or project manager events after a step (`after`), `testsRan`, `conflict` and `conflictResolved` checks, chat replies that record a mistake, level-specific mistakes, conflict commit detection
- [x] Level 2: API contract handshake (`level2.json`)
- [x] Level 3: failed tests and PR review (`level3.json`: a red test every learner sees, then fix, re-run, reviewer comment)
- [x] Level 4: merge conflict (`level4.json`: a teammate pushes the same line, Git stops, the learner resolves it)
- [x] Level 5: sudden requirement change (`level5.json`: the ticket changes under the learner, contract and code change together)
- [x] Backend role: all five levels written from the backend seat (`levelN-backend.json`), role bar switches seat, completion saved per role
- [x] Level map in My view (all levels open, "Start here" hint only), Next level button, failed-test guidance, conflict handling in Sync Check
- [x] Unslop audit: see [AUDIT-phase-5.md](AUDIT-phase-5.md)
- [x] Owner check of the "done when" gate, then Git

## Phase 6: Field Guide, exports, polish
Done when: v1 scope works, the unslop checklist passes, the build is ready to deploy.
- [x] Field Guide (8 articles in `src/content/guides/`, list with read marks, linked from every term that has a guide)
- [x] Cheat Sheet export (Markdown and PDF from the cheat sheet dialog)
- [x] Progress Card (PNG drawn in the browser, preview and download, badges worked out from progress)
- [x] unslop audit pass: see [AUDIT-phase-6.md](AUDIT-phase-6.md)
- [x] Performance check (first paint 96 ms locally, 3D scene not loaded at first paint, results in the audit)
- [x] Deploy readiness (favicon, page description, `engines`, [DEPLOY.md](DEPLOY.md))
- [x] Owner check of the "done when" gate, then Git

## Phase 7: Visual learning (added after the v1 deploy)
Done when: the hardest ideas (commit, branch, pull, push, conflict) each have a visual that updates with what the learner does, the 3D additions work with a 2D fallback, and the unslop checklist passes.
Order: 2D first (7a to 7e), then 3D (7f, 7g), then 7h and 7i last. Owner checks between groups. Motion rules: see "Phase 7 motion and 3D additions" in [DESIGN.md](DESIGN.md). The prompt for this phase is in [PHASE-7-PROMPT.md](PHASE-7-PROMPT.md).
- [x] 7a Git graph (2D SVG: commits, branches, merges, push to remote, conflict; driven by gitSim events; panel beside the editor with a toggle that is remembered). `src/engine/gitGraph.ts` works the graph out from `GitSim.graphState()`; `src/components/git/GitGraph.tsx` draws it; open by default, saved under its own localStorage key `synccraft-ui`
- [x] 7b Conflict resolver (2D: "yours", "theirs", "result" panels). `src/engine/conflictResolve.ts` and `src/components/editor/ConflictResolver.tsx`. Opens in the editor whenever a file has conflict markers. Level 4 (both seats) uses it. Level 5 as written has no conflict, so it only appears there if the learner causes one (owner decision pending)
- [x] 7c Jargon mini-animations (play once with replay; commit, branch, pull, push, pull request, merge conflict). Data in `src/content/termAnimations.ts`, drawn by `src/components/sketch/Sketch.tsx`; shown in the first-time term card and behind "Watch it" in the cheat sheet
- [x] 7d Field Guide diagrams (one inline SVG per article, 8 in all). Data in `src/content/guideDiagrams.ts`, same sketch format, still
- [x] 7e Small feedback motion (step done, Sync Check popup; opacity and transform only). Step bars grow in and a "Step N done" line rises in; popups rise in; Sync Check output fades in. Motion classes in `src/index.css`, reduced motion shows the end state
- [x] Owner check of the 2D group
- [x] 7f Ticket journey in 3D (a ticket moves between the five roles; 2D fallback). `src/store/ticketJourney.ts` works out who has held the ticket from the steps in order (the project manager wrote it; QA and the reviewer are included even though the engine runs their steps in the same moment as the learner's). `src/components/team/TicketScene.tsx` (own lazy chunk) is a row of five desks above Team view's columns, each desk over its own column at any width (`ticketLayout.ts`); the ticket hops one stop at a time. 2D fallback: a row of cards on the same grid with the ticket tag on the holder. Shares the 3D-or-list choice with the pipeline
- [x] 7g Pipeline upgrades (conveyor while tests run, flat red plus one shake on failure, parcel stalls at a conflict; 2D fallback). The engine runs tests instantly, so the store records the run (`testRun`) and the screen plays it over 1.6 s before showing the result (`pipelineMotion.ts`). Conveyor from GitHub to the test server moves only during a run and the parcel rides it; a failed run turns the test server flat red, then one 0.4 s shake. A pull that stops on a conflict records `stallAt`; the parcel waits in the gap after the developer desk behind a flat red gate until the work is pushed. 2D list: a bar fills once during the run, the row shakes once, a "Stopped: merge conflict" row. Fixed on the way: parcel trips now time from the clock, not frame deltas (after an idle spell the first frame's delta made it arrive in one jump)
- [x] Owner check of the 3D group
- [x] 7h Level map as a 3D path with badges (2D list stays as the fallback). `src/components/levelmap/LevelPathScene.tsx` (own lazy chunk): a stepping-stone per level, a medal on each level whose badge is earned, a plinth with the other three badges at the end, the learner's figure on the loaded level. The figure hops across each stone in between when a level is chosen, and a new medal rises once. A stone finished in this seat is flat green. The level buttons are HTML under the stones. Plain logic and badges (same `computeBadges` as the Progress Card) in `levelPath.ts`. 2D fallback: the flat row plus a "Badges n of 8" line. Shares the 3D-or-flat choice
- [x] 7i Conflict scene (two parcels meet at a merge gate). Replaces 7g's red barrier: your parcel and the teammate's (from GitHub) wait either side of a flat red gate, which shakes once. When the conflict is fixed the bar lifts and their parcel rides into yours, and a push carries it on. Logic and timing in `src/components/pipeline/mergeGate.ts`. 2D: the list's "Stopped" row shows Yours, a red bar and Theirs, then one merged chip
- [x] Tests for every new piece of logic (Vitest), performance check (first paint, 3D chunk size). 278 tests. 3D now waits for the browser's first-contentful-paint entry (`useAfterFirstPaint`); results in the audit
- [x] Unslop audit: [AUDIT-phase-7.md](AUDIT-phase-7.md)
- [x] Owner check of the "done when" gate, then Git

## Phase 8: Landing page (after Phase 7's owner checks)
Done when: the site opens on a landing page that shows the real game world in 3D, explains how to play, and leads into the game; the unslop checklist passes; nothing 3D loads before first paint.
Built 2026-11-13. Audit: [AUDIT-phase-8.md](AUDIT-phase-8.md).
- [x] Routes: landing page at `/`, game at `/play` (a small path check, no router package). A visitor with saved progress sees "Continue: Level N" instead of "Start level 1". `public/_redirects` so a direct link to `/play` works on Cloudflare Pages. `src/app/route.ts` (path check, `startTarget`, `useRoute` store on the History API), `src/app/Link.tsx`; `/play?level=N` opens that level once (`useEnsureLevel`), then the address drops to `/play`. The game's name in the header links back to `/`
- [x] Hero: plain headline and one line, "Start level 1" and "How to play". The kitchen diorama as a still first, the 3D scene swapped in after first paint. The camera settles once and stays still. Still: `isoStill.ts` + `DioramaStill.tsx` (SVG, same isometric angle and theme colours); 3D: `LandingScene.tsx` (own lazy chunk) fades in over it after its first frame; settle 1.6 s, none under reduced motion
- [x] "Follow one order": a scroll-scrubbed 3D story (scroll position drives the camera, stops when scrolling stops, rewinds on scroll up) along the real route. A text card beside each stop. Reuses the existing station, ticket and gate models. Nine stops in route order: ticket, frontend and backend in parallel, merge gate closed, gate lifted, pull request on GitHub, tests red, tests green, review, live. **Changed from the order written here:** the merge gate comes before GitHub, because that is where 7i put it in the diorama (see the audit). Logic in `story.ts` (frames, `progressFromCenters`, `storyPose`), sticky scene and cards in `LandingPictures.tsx`
- [x] The five roles: one card each, playable or observe only
- [x] How to play: four steps with `Sketch` drawings, the five levels from the level data, the helpers (Jargon helper, Field guide, Cheat sheet, Skip and auto-fill), progress saved in the browser. Written once as the first Field Guide article, "How to play", and shown on the landing page; a help icon in the header opens it. Data in `landing.ts`, drawn by `HowToPlay.tsx` in both places, listed by `guides.ts` (`howToPlayGuide`)
- [x] Reduced motion and no WebGL: a still picture per scroll stop (also on a weak device, a failed chunk or a lost WebGL context)
- [x] Copy in `src/content/landing.ts`; tests for the scroll-to-stop logic and the routes. Also tests for the still pictures and the copy rules; 322 tests
- [x] Unslop audit and performance check: AUDIT-phase-8.md
- [ ] Owner check of the "done when" gate, then Git

## Open items
- [x] Palette: warm ramp with paprika accent, Figtree and JetBrains Mono, approved by owner
- [x] Doc fixes: PRD path in CLAUDE.md and README, theme type includes 'system', editor is CodeMirror
- [x] LICENSE: MIT, copyright "vinay" (`LICENSE`, and `license` in `package.json`)
- [ ] Decide whether "A day in this role" cards, "Just watch" mode and Pro Mode belong in v1 (in the PRD, not in any phase list; see AUDIT-phase-6 note 5)

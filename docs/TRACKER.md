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
- [ ] Owner check of the "done when" gate, then Git

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
- [ ] Owner check of the "done when" gate, then Git

## Phase 6: Field Guide, exports, polish
Done when: v1 scope works, the unslop checklist passes, the build is ready to deploy.
- [x] Field Guide (8 articles in `src/content/guides/`, list with read marks, linked from every term that has a guide)
- [x] Cheat Sheet export (Markdown and PDF from the cheat sheet dialog)
- [x] Progress Card (PNG drawn in the browser, preview and download, badges worked out from progress)
- [x] unslop audit pass: see [AUDIT-phase-6.md](AUDIT-phase-6.md)
- [x] Performance check (first paint 96 ms locally, 3D scene not loaded at first paint, results in the audit)
- [x] Deploy readiness (favicon, page description, `engines`, [DEPLOY.md](DEPLOY.md))
- [ ] Owner check of the "done when" gate, then Git

## Open items
- [x] Palette: warm ramp with paprika accent, Figtree and JetBrains Mono, approved by owner
- [x] Doc fixes: PRD path in CLAUDE.md and README, theme type includes 'system', editor is CodeMirror
- [x] LICENSE: MIT, copyright "vinay" (`LICENSE`, and `license` in `package.json`)
- [ ] Decide whether "A day in this role" cards, "Just watch" mode and Pro Mode belong in v1 (in the PRD, not in any phase list; see AUDIT-phase-6 note 5)

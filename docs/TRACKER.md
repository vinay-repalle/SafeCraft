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
- [ ] Owner check of the "done when" gate, then Git

## Phase 3: Level 1 playable (demo)
Done when: Level 1 plays end to end in My View.
- [ ] Jira board and chat
- [ ] CodeMirror editor and Git buttons with real commands
- [ ] Sync Check popup
- [ ] Jargon Helper
- [ ] Skip & Auto-Fill
- [ ] Mistakes Replay

## Phase 4: 3D pipeline and views
Done when: Level 1 drives the 3D scene and all views work smoothly.
- [ ] Diorama with code-built low-poly stations
- [ ] Team View
- [ ] Pipeline View
- [ ] Lazy loading and 2D fallback

## Phase 5: Levels 2 to 5
Done when: all five levels are playable and the Backend role works.
- [ ] Level 2: API contract handshake
- [ ] Level 3: failed tests and PR review
- [ ] Level 4: merge conflict
- [ ] Level 5: sudden requirement change
- [ ] Backend role

## Phase 6: Field Guide, exports, polish
Done when: v1 scope works, the unslop checklist passes, the build is ready to deploy.
- [ ] Field Guide (5+ articles, growing to 8)
- [ ] Cheat Sheet export
- [ ] Progress Card
- [ ] unslop audit pass
- [ ] Performance check
- [ ] Deploy readiness

## Open items
- [x] Palette: warm ramp with paprika accent, Figtree and JetBrains Mono, approved by owner
- [x] Doc fixes: PRD path in CLAUDE.md and README, theme type includes 'system', editor is CodeMirror
- [ ] LICENSE: owner to choose

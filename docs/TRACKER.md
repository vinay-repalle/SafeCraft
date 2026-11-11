# Build Tracker

Status: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

Claude writes files and lists what changed. The owner runs it, checks the "done when" gate, and does all Git and deploy work.

## Phase 1: Foundation
Done when: the app opens, light/dark/system theme works and survives reload, exported progress imports back.
- [x] Vite, React, TypeScript, Tailwind setup (step 1; palette approved, wiring starts at step 2)
- [ ] Design tokens (neutral ramp, one accent, type, spacing)
- [ ] Theme: light, dark, system
- [ ] App shell, role bar, view tabs
- [ ] Zustand store with localStorage
- [ ] Progress export/import

## Phase 2: Engine and Level 1 data
Done when: a Level 1 run passes in a test harness and the engine emits events.
- [ ] gitSim
- [ ] jiraSim
- [ ] testRunner
- [ ] levelRunner
- [ ] jargon.json
- [ ] level1.json (food ordering app)

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

# Phase 7 prompt (paste into a new chat with the Opus model)

```
You are working on SyncCraft, a browser teamwork simulator that teaches Git, Jira and team workflow. v1 is built and deployed. We are starting Phase 7: visual learning.

Before planning, read these in order:
1. CLAUDE.md (the working rules; they override your defaults)
2. docs/SyncCraft Master PRD & Technical Blueprint.md
3. docs/DESIGN.md, including the section "Phase 7 motion and 3D additions"
4. docs/TRACKER.md, Phase 7
5. The existing code you will build on: src/engine/gitSim.ts, src/engine/levelRunner.ts, src/store/levelStore.ts, src/components/pipeline/, src/views/TeamView.tsx, src/components/LevelMap.tsx, src/content/

Goal: learners should see what Git and teamwork actions do, not only read about them. The hardest ideas (commit, branch, pull, push, merge conflict) need a visual that updates with what the learner does.

Work in this order, one sub-step at a time. After each sub-step, stop, list what changed, tick it in docs/TRACKER.md, and wait for me to say "next".

2D first
- 7a Git graph: inline SVG showing commits, branches, merges, the push to the remote, and a conflict. Driven by gitSim state and events, not by separate fake data. A panel beside the editor with a toggle; the choice is remembered in the UI store.
- 7b Conflict resolver: three panels ("yours", "theirs", "result"). The learner picks lines and watches the result build. Used in Levels 4 and 5.
- 7c Jargon mini-animations: each plays once when the card opens, with a replay button. Start with commit, branch, pull, push, pull request, merge conflict. Make it easy to add more terms.
- 7d Field Guide diagrams: one inline SVG per article (8).
- 7e Small feedback motion: a step completing, the Sync Check popup. Opacity and transform only.
Then stop for my check of the 2D group.

3D next
- 7f Ticket journey: a ticket moves between the five roles. Build on the existing scene and Team View.
- 7g Pipeline upgrades: a conveyor that moves only while tests run, a failing station turns flat red and shakes once, the parcel stalls at a conflict.
Then stop for my check of the 3D group.

Last
- 7h Level map as a 3D path with badges.
- 7i Conflict scene: two parcels meet at a merge gate.

Rules
- Follow docs/DESIGN.md exactly. There is a tension to respect: it says "no looping animation" and "flat green or red, not a glow". So: explaining animations play once and have a replay button; failures use flat red plus one short shake; no sparks, glow or particles. Respect prefers-reduced-motion by showing the end state.
- Every 3D view needs a 2D fallback (no WebGL, weak device, learner's choice). Keep 3D in lazy chunks. Render on demand, pixel ratio capped at 1.5, no real-time shadows, low-poly built in code.
- Works in light, dark and system themes. Visible focus rings. Every shape that carries meaning also has a text label, so colour is never the only signal.
- Do not add any npm package without asking me first. React Three Fiber is already installed; check whether drei is before using it.
- Write a Vitest test for every new piece of logic (for example, how the graph is worked out from gitSim state). Run npm test and npm run build and report the results honestly.
- Explain each new concept the first time you use it.
- When all steps are done, write docs/AUDIT-phase-7.md (unslop audit plus a performance check of first paint and the 3D chunk size) and update docs/TRACKER.md.
- Never run git init, add, commit, push, or open pull requests. Never deploy. Do not edit global git config. Only write and edit files, then list what changed. I do all Git and deploy work.

First reply: do not write code yet. Give me a short plan for 7a only (files to add or change, how the graph is derived from gitSim, how it is tested) and any questions. Then wait for my go-ahead.
```

Notes for the owner:
- Switch the model with `/model` before pasting.
- Assumptions made in the prompt: the Git graph is a toggle panel beside the editor, and the 2D group comes before the 3D group.

# SyncCraft: working rules for Claude

## Git and deploy
- Never run `git init`, `git add`, `git commit`, `git push`, or open pull requests. The owner does all Git work.
- Never deploy. The owner deploys.
- This folder uses the personal Git identity through an `includeIf` rule. Do not edit global git config.
- Only write and edit files, then list what changed.

## Project
- Read `docs/SyncCraft Master PRD & Technical Blueprint.md` before planning. Follow its folder structure and phases.
- Track progress in `docs/TRACKER.md`.
- Follow `docs/DESIGN.md` (unslop rules) for all UI work.
- Stack: React, Vite, TypeScript, Tailwind, React Three Fiber, CodeMirror, Zustand. Package manager: npm.
- Files live directly in this folder, with no `synccraft/` subfolder.
- Themes: light, dark and system.
- Explain each new concept the first time it is used.

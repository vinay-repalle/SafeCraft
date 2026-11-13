# SyncCraft

A free, browser-only 3D teamwork simulator. Learn how software teams work together, from the first ticket to the live product: Jira tickets, API contracts, Git branches, pull requests and automated tests.

Everything runs in the browser. There is no backend, no database and no login.

## Status

Phase 6 (Field Guide, exports, polish) is built and waiting for owner check. All five levels play from the frontend and backend seats, and the four views work. See [docs/TRACKER.md](docs/TRACKER.md) for progress and [the PRD](<docs/SyncCraft Master PRD & Technical Blueprint.md>) for the full plan.

## Stack

React, Vite, TypeScript, Tailwind CSS, React Three Fiber, CodeMirror, Zustand.

## Getting started

```bash
npm install
npm run dev      # development server
npm run build    # typecheck and production build
npm test         # engine, store, content and export tests
```

The game (`/play`) is desktop only: designed for windows 1280px wide or more. The landing page (`/`) also works on a phone.

## Docs

- [PRD and technical blueprint](<docs/SyncCraft Master PRD & Technical Blueprint.md>)
- [Build tracker](docs/TRACKER.md)
- [Writing a level](docs/LEVEL-AUTHORING.md)
- [Design rules](docs/DESIGN.md)
- [Deploying](docs/DEPLOY.md)

## Credits

UI approach follows the [unslop](https://github.com/heydamir/unslop) skill by Damir Sokolovsky, licensed CC BY 4.0.

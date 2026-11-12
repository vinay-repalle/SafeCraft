# Deploying SyncCraft

SyncCraft is a static site. The build writes plain files to `dist/`, and any static host can serve them. There is no server, database or environment variable.

Claude does not deploy. The owner runs these steps.

## Settings for Vercel, Netlify or Cloudflare Pages

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20.19 or newer (22 recommended) |

The app has one page and no router, so no redirect or rewrite rules are needed.

## Before the first deploy

1. `npm ci`
2. `npm test` passes.
3. `npm run build` finishes with no errors. One warning about the 3D scene chunk being over 500 kB is expected: it loads only when the learner turns the scene on.
4. `npm run preview`, then open the printed address and check: the theme survives a reload, a level plays, the Field guide opens, Cheat sheet and Progress card download.
5. Choose a licence and add a `LICENSE` file (open item in [TRACKER.md](TRACKER.md)).

## What loads when

| File | Size (gzip) | Loads |
| --- | --- | --- |
| Main bundle (app, levels, guides, engine) | about 125 kB | at first load |
| Code editor chunk | about 136 kB | when My view opens |
| 3D scene chunk | about 246 kB | when the learner turns the 3D scene on |

## Browser support

Current Chrome, Edge, Firefox and Safari on a desktop, at 1280 px wide or more. The 3D scene needs WebGL; without it the app shows the 2D station list.

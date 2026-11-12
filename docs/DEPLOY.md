# Deploying SyncCraft

SyncCraft is a static site. The build writes plain files to `dist/`, and any static host can serve them. There is no server, database or environment variable.

Claude does not deploy. The owner runs these steps.

## Which host: Cloudflare Pages (recommended)

Both work, because the app is plain static files. Cloudflare Pages is the better fit here:

- **Commercial use:** Vercel's free Hobby plan is for non-commercial use only. Cloudflare Pages' free plan has no such rule.
- **Bandwidth:** Cloudflare Pages has no bandwidth cap on static files. Vercel Hobby caps it, and a shared learning tool that goes viral could hit that.
- **Headers:** `public/_headers` already sets caching and security headers for Cloudflare Pages. Vercel would need a separate `vercel.json`.
- **Pick Vercel instead if** you want the simplest GitHub import, preview URLs on every pull request with comments, and this stays a personal, non-commercial project.

## Settings for Cloudflare Pages (also right for Vercel and Netlify)

| Setting | Value |
| --- | --- |
| Framework preset | Vite (or None) |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` (Cloudflare reads this name; Vercel uses the Node setting in project settings) |

The app has one page and no router, so no redirect or rewrite rules are needed.

## Before the first deploy

Checked by Claude on 2026-11-12: `npm test` (169 passed), `npm run build` (no errors, `dist/` is 1.9 MB). You still do step 4.

1. `npm ci`
2. `npm test` passes.
3. `npm run build` finishes with no errors. One warning about the 3D scene chunk being over 500 kB is expected: it loads only when the learner turns the scene on.
4. `npm run preview`, then open the printed address and check: the theme survives a reload, a level plays, the Field guide opens, Cheat sheet and Progress card download.
5. Licence: MIT, already added as `LICENSE`.

## Deploying to Cloudflare Pages

1. Push the repo to GitHub (you do the Git work).
2. In the Cloudflare dashboard: Workers & Pages, Create, Pages, Connect to Git, pick the repo.
3. Enter the settings from the table above and save. Every push to `main` then deploys on its own.
4. After the first deploy, open the `*.pages.dev` address and repeat the step 4 check above on the live site.

## If you choose Vercel

Import the repo at vercel.com/new. It detects Vite and fills in the same settings. To get the same caching, add a `vercel.json` with a `headers` rule for `/assets/(.*)`; ask Claude to write it.

## What loads when

| File | Size (gzip) | Loads |
| --- | --- | --- |
| Main bundle (app, levels, guides, engine) | about 125 kB | at first load |
| Code editor chunk | about 136 kB | when My view opens |
| 3D scene chunk | about 246 kB | when the learner turns the 3D scene on |

## Browser support

Current Chrome, Edge, Firefox and Safari on a desktop, at 1280 px wide or more. The 3D scene needs WebGL; without it the app shows the 2D station list.

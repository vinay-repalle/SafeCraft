# Phase 8 unslop audit

Method: followed the unslop rules in `docs/DESIGN.md`, including "Phase 7 motion and 3D additions". Built the production bundle, ran `vite preview` and drove headless Chrome 153 over the DevTools Protocol. Took screenshots at 1440 by 900 (light and dark) and 390 by 844 (phone). Captured the hero, six stops of the scroll story plus one between two stops, the roles, How to play, the reduced-motion page, the game opened from "Continue", and the How to play article in the Field guide. Headless Chrome draws WebGL in software, so the app treats it as a weak device. For the 3D screenshots the renderer's name was hidden, the same as the Phase 7 audit. The weak-device run kept it.

Result: light slop. Five fixes were made during the audit (below). Six notes carry forward.

## What was built

- **Routes.** `src/app/route.ts` is a small path check with no router package. `/` is the landing page and `/play` is the game. Any other address shows the landing page. `/play?level=N` opens that level once, then the address drops back to `/play`. `Link` (`src/app/Link.tsx`) is a real `<a href>`. A plain click swaps the page with no reload, and a Ctrl, Cmd or middle click opens a new tab as usual. Back and Forward work. A visitor with saved progress sees "Continue: Level N", where N is the first level not finished in their seat. Someone who has finished all five sees "Open the levels". `public/_redirects` answers a direct visit to `/play` on Cloudflare Pages and Netlify.
- **Hero.** A plain headline, one line, "Start level 1" (or "Continue") and "How to play". The picture is the game's own diorama. A still SVG is drawn first, then the 3D scene fades in over it after first paint, once it has drawn its first frame. The camera settles once (a small turn and zoom over 1.6 s) and then stays still. Under reduced motion there is no settle.
- **Follow one order.** Nine text cards beside a sticky 3D scene (on a phone, the scene sits above the cards). The page's scroll position is the story's clock. As each card crosses the reading line, the camera glides to that stop, the parcel hops or rides, the conveyor runs and the merge gate closes or lifts. Nothing moves when scrolling stops, and scrolling up plays it backward. The stops are: ticket written, frontend and backend in parallel, the merge gate closed, the gate lifted, a pull request on GitHub, tests red, tests green, review, live. It reuses the station, parcel, conveyor, gate and ticket models. The logic is plain numbers in `src/components/landing/story.ts`.
- **The five roles.** One card each, marked "Playable" or "Observe only".
- **How to play.** Four steps, each with a `Sketch` drawing. Then the five levels, read from the level data (on the landing page each links into that level), the four helpers, and how progress is saved. It is written once in `src/content/landing.ts`. The same component draws it on the landing page and as the first Field guide article. A help icon in the game's header opens that article.
- **Reduced motion, no WebGL, weak device.** The story becomes a grid of nine cards, each with a still picture of its stop. No scroll tracking, nothing moves. The still pictures are drawn by `isoStill.ts` from the same stations and the same isometric angle as the 3D camera, in the theme's colours.
- **Shared code.** The camera fit, the conveyor and the gate's posts moved from the game's `Scene.tsx` to `src/components/pipeline/sceneParts.tsx`. The ticket model moved to `stations.tsx`. The parcel spot and label heights moved to the plain `sceneLayout.ts`. The game's scenes behave as before.

## A change from the tracker's wording

The tracker lists the stops as "conveyor to GitHub, test server red then green, merge gate (7i), review, live". In the diorama the merge gate stands between the developer desk and GitHub, where 7i put it. Keeping that order would make the parcel travel back from the test server to the desk. The story follows the route instead: merge gate, then GitHub, then the tests. Swapping it back is a one-line change to the frame list in `story.ts` and the stop list in `landing.ts`.

## Signs checked

| Area | Result |
| --- | --- |
| Gradients, glows, particles, coloured shadows | None. 3D and stills use flat theme colours. The header is a solid page colour, with no blur or glass |
| Colour | One accent: the primary button, your parcel, the active station, the current card's border, the playable roles. Pass and fail are the same flat green and red as the game |
| Colour is never the only signal | Every station tag says its state in words ("Failed", "Work is here"). Each card says what happens. The gate's red is described in the card text |
| Motion | The scroll story moves only while the reader scrolls. The hero's settle plays once on load and never loops. The 3D fades in over the still once (opacity only). The card border change is a colour transition |
| Reduced motion | No settle, no scroll story, still pictures per stop. Checked with the emulated OS setting: 9 stills, no canvas |
| 2D fallback | Every 3D picture has a still: before load, with no WebGL, on a weak device, if the chunk fails or the WebGL context is lost |
| Lazy loading | The landing scene is its own chunk (2.7 kB gzip) and shares three.js with the game. Nothing 3D is requested before first paint (see Performance) |
| Icons | lucide `ArrowRight`, `Highlighter`, `Library`, `BookOpen`, `FastForward`, `HardDrive`, `CircleHelp`, at 16 or 18 px and 1.5 stroke |
| Type | Figtree and JetBrains Mono only. Sizes from the locked scale; the headline is `text-display` (28 px), the largest step. Weights 400 and 500 |
| Copy | Sentence case, no exclamation marks, no hype. Feature names as the game shows them ("Field guide", "Skip and auto-fill", "Mistakes replay"). Claims are what the PRD says: free, no sign-up, runs in the browser, progress stays in the browser. Checked by `landing.test.ts` |
| Radii | Panels 16, cards 12, tags 6, buttons 8 |
| States | Focus rings on every link and button. Hover on nav links, level rows and buttons. `aria-current="step"` on the current card |
| Themes | Light and dark checked. Stills use CSS variables and the 3D reads the tokens, so a theme change recolours both |
| Dependencies | None added |

## Fixed during the audit

1. **Cut-off station tags.** Zoomed in, tags at the edge of the 3D panel were cut in half ("eloper desk"). A tag that would cross the edge is now hidden.
2. **Crowded hero on a phone.** At 358 px wide the six tags piled on top of each other. Below 560 px the hero names only the station that has the work.
3. **Still pictures cropped the wrong area.** The SVG was shown in a box of a different shape from its crop, so it showed more than the crop and dropped tags that were in view. The crop now takes the shape of its box. It names only the stations the stop is about and nudges a tag inside the picture rather than dropping it.
4. **Two red blocks at the desk.** In the stills, the developer's shirt and your parcel were both plain accent blocks. The parcel now has its ribbon, as in 3D.
5. **The "tall" still.** A test assumed the tall layout makes a taller picture. Seen from the isometric corner it is the wide layout mirrored, the same size, which is also how the game's scenes behave. The test now says so.

## Performance

Production build, `vite preview`, headless Chrome 153. Three loads of `/` each, capable and weak device.

| Measure | Result |
| --- | --- |
| First contentful paint | 992, 144, 132 ms (the first run includes the browser starting up) |
| Requested before first paint | `index`, `jsx-runtime`, `pipelineMotion` (plain shared helpers, no three.js), the CSS and two fonts |
| 3D chunks on a capable device | Requested 4 to 21 ms after first contentful paint in every run. Both scenes mount at once, because the story starts within a screen of the hero |
| 3D chunks on a weak device | Never requested; no canvas |
| Startup JavaScript, gzip | 150.4 kB (143.4 + 3.7 + 3.4), up from 137.2 kB. About 3.5 kB of that is React's JSX helper, which the bundler now splits into its own file. The rest is the landing page, its copy and the still-picture code |
| Landing scene chunk, gzip | 2.7 kB, plus the shared three.js chunk (243 kB) |
| Console errors | None on `/`, `/play` or the phone layout |

## Behaviour checks

Headless Chrome, no exceptions.

- With progress saved (levels 1 and 2 done as frontend), the hero button reads "Continue: Level 3". Clicking it opens `/play` on Level 3 with no reload, and the page title is "Play · SyncCraft".
- The header's help icon opens "How to play" in the Field guide. Back returns to the landing page.
- A direct load of `/play?level=4` opens Level 4 and the address becomes `/play`. `/play` and `/play/` both answer 200 from the preview server.
- The phone layout has no sideways scroll.
- Halfway between stops 5 and 6, the parcel is halfway along the conveyor.

`npm test` runs 322 tests (up from 278). New:
- Routes: addresses, levels in the address, link clicks, the start button for each kind of visitor.
- Story: the reading line, rewind, the parcel at every stop in both layouts, the conveyor, the gate and the hero frame.
- Still pictures: the projection, crops inside the picture, tags inside the picture, theme colours only.
- Landing copy: the copy rules, sentence case, all five roles, the four sketches.
- How to play as the first article.

`npm run build` passes.

## Notes carried forward

1. **The landing page works on a phone; the game does not.** The PRD says desktop only. The landing page is often the first thing someone opens from a shared link, so it works at any width. The 1280 px minimum moved from the page body to the game's shell, and the game behaves as before. The PRD and DESIGN.md still say "desktop only" for the game, which stays true.
2. **Headless Chrome only.** The 3D was checked with a software renderer. It was not checked on a real graphics card, in Firefox or Safari, or on a real phone with touch scrolling.
3. **Two WebGL scenes on one page.** The hero and the story each have their own canvas. Both render on demand, so they cost nothing while still, but a very old device might refuse a second WebGL context. If that happens the story falls back to its still picture.
4. **The story uses the game's 3D-or-flat choice.** If a learner switched the game to the flat views, the landing page shows stills too, until a reload (the choice is not saved).
5. **Reading the How to play article does not mark it "read" on the landing page.** Only opening it in the Field guide counts, as for every article. It now counts toward the "Field guide" badge, which needs nine articles instead of eight.
6. **The old console error from Phase 7 (note 1) is still there.** It is a `<div>` inside a `<p>` in the step card's jargon tooltip, from older code. It shows only in development.

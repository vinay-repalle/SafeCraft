# Phase 6 unslop audit

Method: followed the unslop skill. Rendered the Field guide, the cheat sheet, the progress card and the header in headless Chrome in light and dark at 1440 by 900, and the header again at 1280 by 800, and checked each against `docs/DESIGN.md`. Read all eight articles for copy.

Result: light slop. One fix made during the audit (below). Five notes carry forward.

## Signs checked

| Area | Result |
| --- | --- |
| New UI | Field guide (article list and reading column), a "Read the guide" link on term cards and the cheat sheet, Markdown and PDF buttons, a Progress card button and dialog. All use existing tokens, panel and button classes, 16px lucide icons at 1.5 stroke |
| Gradients, glows, shadows, emoji | None added. The progress card is flat fills and hairline borders |
| Type | Figtree and JetBrains Mono only. Reading column is 16px on a 24px line, capped at 672px wide. Headings are 500 weight, sentence case |
| Copy | A search of the articles and new UI found no exclamation marks, greetings or em dashes. A test enforces this for the articles, including emoji |
| Realistic content | Same Bowlful food app and the same ticket numbers as the levels. The conflict article shows real Git markers |
| Motion | None added. The only transitions are colour on hover |
| States | List items have hover, current (accent border) and read (check) states. Focus rings are the global ones |
| Themes | Checked light and dark. The progress card reads the live theme tokens, so it matches either |

## Fixed during the audit

- The progress card preview was 528px wide in the 576px dialog, so its type was unreadably small. The dialog now has a wide option (896px), and the card is 1200 by 540 instead of 1200 by 630 so it carries no dead space.

## What was built

- **Field Guide**: 8 articles in `src/content/guides/*.md` (the PRD's full list, each about 280 to 310 words), a small Markdown reader (`src/utils/miniMarkdown.ts`, no new dependency), a list with read marks and "x of 8 read", and links from every term that has a guide.
- **Cheat Sheet export**: Markdown and PDF from the cheat sheet dialog. The PDF is written by hand (`src/utils/pdf.ts`, no library). It opens in a real reader: checked with `pdftotext` and `pdfinfo`.
- **Progress Card**: PNG drawn on a canvas in the browser, with a preview, level boxes with both seats, badges, and totals.
- **Badges**: worked out from progress each time (`src/utils/badges.ts`): one per level, Both seats, All five levels, Field guide. They are not stored, so an imported file cannot carry one that was not earned. The saved `badges` list stays in the progress file but is unused.
- **Navigation**: the open view and the open article moved from `App` into a small unsaved store, `src/store/uiStore.ts`, so a term card anywhere can open its article.
- **Deploy readiness**: `public/favicon.svg`, a page description, `engines` in `package.json`, `docs/DEPLOY.md`, README status.

## Performance check

Production build, local preview, headless Chrome:

| Measure | Result |
| --- | --- |
| First contentful paint | 96 ms |
| JavaScript at first load | main bundle 120 kB, code editor chunk 131 kB (both gzip sizes are about 125 and 136) |
| 3D scene chunk (246 kB gzip) | not requested at first load |
| Main bundle, gzip | 124.8 kB, up from 115 kB after Phase 5 (the guides and exports) |
| Console errors | none |

Level files are still in the main bundle (163 kB raw, roughly 20 kB gzip). Loading them per level would need `load()` in the level store to become asynchronous. The saving is small next to the scene and editor chunks, so it was left.

## Notes carried forward

1. **Opening an article counts as reading it.** There is no "mark as read" step. Cheap and predictable, but a learner who clicks through the list marks them all.
2. **The PDF uses the standard PDF fonts.** They cover basic Latin only, so any other character prints as `?`. Every term today is plain English, so nothing is lost. A term with an accented name would need an embedded font.
3. **The 3D scene was not run in this check.** Headless Chrome here showed the 2D station list, so the scene's lazy load on demand was not re-measured. Phase 4's audit covers it.
4. **Not tested in other browsers.** Chrome only. The PDF and PNG downloads were checked by intercepting the file, not through a real save dialog.
5. **Still not built, and not in the phase list:** "A day in this role" cards, "Just watch" mode for observe-only roles, Pro Mode scoring. All three are in the PRD. The tracker has no line for them, so confirm whether they belong in v1 before deploy.

## Behaviour checks

Headless Chrome, no console errors: the Field guide lists 8 articles and counts reads; opening an article saves it to progress; a term card's "Read the guide" opens its article; the cheat sheet's guide link closes the dialog and opens the article; Markdown and PDF downloads produce the right file names and content; the PDF opens with `pdftotext`; the progress card draws from saved progress in light and dark; the header fits at 1280px with no sideways scroll.

In the repo, `npm test` runs 169 tests (up from 142). New: article content and link checks, the Markdown reader, the PDF writer (table of byte positions, escaping, page breaks), both cheat sheet formats, badges and the card layout, and the UI store.

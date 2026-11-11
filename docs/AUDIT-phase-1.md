# Phase 1 unslop audit

Method: followed the unslop skill (audit against `references/signs.md`, then the checklist) on the built app, rendered in Chrome at 1440 and 1280 wide, light and dark, plus the error and focus states. Direction is the one in `docs/DESIGN.md`.

Result: light slop, no heavy tells. Two things found while rendering were fixed during the phase (below). Three notes carry forward.

## Signs checked

| Area | Result |
| --- | --- |
| Gradients, glows, coloured shadows, blobs | None. Only shadow is `0 1px 2px` at 5% in light; none in dark |
| Emoji | None. Icons are lucide, 16px, stroke 1.5, one set |
| Colour | One warm ramp, three text roles, one accent. Accent appears on the active tab underline, the active role border and focus rings only |
| Type | Figtree plus JetBrains Mono (mono not used yet). Weights 400 and 500 only. No uppercase tracked labels, no italics, tabular numerals on |
| Copy | Sentence case, no exclamation marks, no greetings, no hype, no badges. Labels have no trailing periods |
| Spacing | 4px scale throughout. Header and role bar 56, controls 32, theme buttons 28, cards padded 20 |
| Radii | Nested: theme switch 8 outside, 2px padding, 6 inside. Controls 8, cards 12, panels 16 |
| Motion | Colour transitions only, 150ms, one easing curve. Nothing loops. Reduced-motion respected |
| Focus and states | Visible 2px accent focus ring on every control. Hover, pressed and active states distinct |
| Contrast | Muted text 5.1:1 on page and 4.7:1 on raised (light); 5.7:1 and 4.8:1 (dark). Error text 5.1:1 (light), 4.9:1 (dark) |

## Fixed during the phase

1. A long import error shared a row with the role bar and squeezed the role labels into wrapped, overlapping text. The message now sits in an overlay under the buttons, and controls no longer shrink.
2. The 1024px minimum width could not fit the role bar and the export and import buttons (about 1210px). Minimum is now 1280px.

## Notes carried forward

1. **Template check is only partly met.** The warm ramp and paprika accent give a food-and-craft feel, but the shell has no Moment yet. The order-ticket tag (Signature) and the 3D diorama arrive in Phases 3 and 4. Re-audit then.
2. **Placeholder cards have empty space.** Intentional while the three zones are placeholders. They fill in Phases 3 and 4.
3. **Header tab focus ring is a tall box** (full header height). Acceptable, but could be made an inset ring if it looks heavy in use.

## Behaviour checks (automated, Chrome)

Passed: system theme is the default and follows the OS live; explicit light and dark ignore the OS; theme and role survive reload; no flash of the wrong theme (set before React loads); damaged saved data falls back to defaults; all four tabs and role selection work; export writes a `.json` file; importing it restores the exact saved state, which also survives reload; bad files are rejected with a plain message and state is kept.

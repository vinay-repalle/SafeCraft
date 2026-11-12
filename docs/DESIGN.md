# Design Rules

Based on [unslop](https://github.com/heydamir/unslop) (CC BY 4.0, Damir Sokolovsky).

## Direction
- **Product:** SyncCraft, a teamwork simulator
- **Character:** warm, tactile, workshop-like
- **World:** a food-ordering kitchen and delivery app
- **Moments:** the 3D diorama and the PR/test log
- **Signature:** a small order-ticket-style tag on every Jira ticket

## Themes
Light, dark and system. System is the default and follows the OS.

## Rules
- **Spacing:** 4px grid. Panels 16, cards 20 to 24.
- **Colour:** one tinted neutral ramp, three text roles, one accent. Hairline borders. No gradients, glows or coloured shadows.
- **Icons:** lucide, 16 or 18px, 1.5 stroke. No emoji.
- **Type:** one interface family plus one mono. Weights 400 to 500, 600 at most. Sentence case. Tabular numerals.
- **Copy:** no exclamation marks, greetings or hype. Realistic mock data.
- **Radii:** nested (inner = outer minus padding). Controls 8 to 10, cards 12 to 16.
- **Motion:** no looping animation. Animate only colour, opacity and transform. One easing curve.
- **3D:** stations change to a flat muted green or red, not a glow.

## Phase 7 motion and 3D additions
These add to the rules above. They do not replace them.
- **Explaining motion:** an animation that teaches (a jargon loop, a Git graph change) plays once, started by a learner action or by opening the card. It has a replay button. It never loops by itself.
- **Reduced motion:** when the OS asks for reduced motion, show the end state with no movement.
- **Git graph and diagrams:** inline SVG, drawn with the neutral ramp and the one accent. Pass or fail uses the same flat green and red as the 3D stations. Every shape has a text label, so colour is never the only signal.
- **Failure in 3D:** a station turns flat red and shakes once (transform only). No sparks, no glow, no particles.
- **Conveyor and parcel motion:** moves only while something is running, then stops. The scene still renders on demand.
- **3D fallback:** every new 3D view has a 2D equivalent for weak devices, no WebGL, and learners who choose it.
- **New 3D code** loads in the existing lazy chunk or its own lazy chunk. Nothing 3D loads before first paint.
- **Dependencies:** no new npm package without asking the owner first.
- **States:** visible focus rings, clear active and hover states.

## Do not
Rename features, invent claims, or swap one trend (glass, grain, neon, bento) for another.

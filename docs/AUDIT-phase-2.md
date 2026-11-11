# Phase 2 unslop audit

Phase 2 adds the engine and the Level 1 content. There is no new screen, so the visual passes (spacing, colour, icons, type, layout, motion) have nothing to audit yet. The audit covers what Phase 2 does produce: copy, mock data and the signature.

## Copy and content

| Check | Result |
| --- | --- |
| Exclamation marks, greetings, hype words | None in `level1.json` or `jargon.json`. Checked by search |
| Emoji | None. The only non-ASCII character is a middle dot inside a sample button label (`Place order · $12.40`), which is code, not interface text |
| Sentence case | Step prompts, ticket titles, term names and replay text are sentence case. Proper names (Jira, GitHub, Git, PR) keep theirs |
| Realistic mock data | One believable app (Bowlful), real-sounding tickets (ORD-9 to ORD-15) with a mix of stories, a bug and a task, named teammates (Priya Nair, Marcus Webb), and real-looking Git output |
| Plain language | Each term has one line of meaning, an everyday analogy and a real example. Commands are the real commands |
| No invented claims | Git output follows real Git messages. Known simplifications are listed in the header of `src/engine/gitSim.ts` |
| Replay says what it would have caused | Each of the 8 mistakes has a rule in the form "you did X, on a real team that causes Y" |

## Signature and Moments (for later phases)

The order-ticket tag (Signature) needs a ticket on screen, so it arrives with the board in Phase 3. The 3D diorama (Moment) is driven by the `pipeline` events the engine already emits: `client > pm > dev > github > tests > live`, with `fail` available for red tests. Stations are described by status only (`active`, `pass`, `fail`), which maps to the flat muted colours in DESIGN.md with no glow.

## Notes carried forward

1. **Template check:** still only partly met until Phases 3 and 4 put the ticket tag and the diorama on screen.
2. **Hard-coded names:** the app name Bowlful and the remote URL `github.com:bowlful/app.git` are fixed in the engine for now. Fine for one level; revisit if a second app appears in Level 2 or later.
3. **Merge logic is simplified** (whole-file with a shared start and end rule). It is enough for Level 1 and for Level 4's same-line conflict. A level that needs several separate conflict areas in one file would need a richer merge.

## Gate check

"A Level 1 run passes in a test harness and the engine emits events": `npm test` runs 61 tests, including a full correct run, a full Skip & Auto-Fill run, a full "learning the hard way" run, and the event order the UI and 3D scene depend on. Two deliberate engine breaks (disabling the start gate, never rejecting a push) were each caught by a failing test, then reverted.

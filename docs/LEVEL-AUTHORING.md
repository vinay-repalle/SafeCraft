# Writing a level

A level is data. Adding a level should mean writing JSON files in `src/content/levels/`, not changing engine code. If a level needs something the engine cannot do, extend the engine once, with a test, and then use it from data.

## Two seats, two files

Every level is written twice, once for each playable role, because a backend developer's day is not a frontend developer's day:

- `levelN.json` is the frontend developer's version.
- `levelN-backend.json` is the backend developer's version, with `"perspective": "backend"`.

They share a title, a "why it exists" line and a lesson. The files, tickets, teammates and prompts differ. Register both in `src/content/index.ts`. `getLevel(id, role)` returns the right one, and the level map and role bar switch between them.

## Steps

1. Copy the closest existing level and change the story: `scenario` (app, ticket, files, optional `otherTickets` and `remoteCommits`), `tests`, `steps` and `replay`.
2. Register it in `src/content/index.ts`.
3. Run `npm test`. The "level data" test runs `validateLevel` on every level and lists problems in plain English (unknown ticket, missing autoFill, unknown jargon term, missing replay rule).
4. Add a test that plays it through `LevelRunner`. `src/engine/levels.test.ts` already plays every level from both seats with `{ type: 'autoFill' }` until it finishes, which proves Skip & Auto-Fill works on every step. Add a test for whatever makes the level different.

## The pieces

| Piece | What it is |
| --- | --- |
| `perspective` | `'frontend'` (default) or `'backend'`: whose seat the learner sits in |
| `scenario.files` | The starting files in the fake repository |
| `scenario.remoteCommits` | Teammate commits already on origin when the level starts, so the learner begins behind. `role` says which role the teammate has |
| `tests` | Rule-based "unit tests" run on the pull request's files (`includes`, `excludes`, `matches`, `fileExists`) |
| `steps[].check` | A rule answered from simulated state: `ticketStatus`, `branchNamed`, `fileContains`, `branchHasCommit` (with `minCount`), `syncResolved`, `pushed`, `prRaised`, `testsPassed`, `testsRan`, `prApproved`, `prMerged`, `deployed`, `chatDone`, `conflict`, `conflictResolved` |
| `steps[].autoFill` | What Skip & Auto-Fill does. Meaning depends on `kind`; see the comment in `src/engine/types.ts` |
| `steps[].auto` | Steps the engine performs for an observe-only role: `runTests`, `approvePr`, `deploy` |
| `steps[].stationEvent` | Which 3D station lights up when the step completes |
| `steps[].after` | Something that happens right after the step completes: `remoteCommit` (a teammate pushes to origin) or `ticketUpdate` (the project manager edits a ticket) |
| `steps[].chat.replies[].mistake` | Choosing this reply counts as that mistake in Mistakes Replay |
| `replay` | One rule per mistake: what the learner did, and what it would have caused on a real team |

## Patterns the levels use

- **A red test you cannot avoid (Level 3).** The step's check demands the exact line the ticket suggests, and the tests demand a little more (two decimals, rounding to cents). Everyone who follows the ticket sees red, reads the log, and fixes it. Use `testsRan` on the step that runs the tests, so a failed run still moves on, then `branchHasCommit` with `minCount: 2` for the fix commit.
- **A teammate changes the ground under you (Levels 2, 4, 5).** Put `after.remoteCommit` on the step that should trigger it. A different file gives a clean merge on the next pull. The same line gives a conflict.
- **A merge conflict (Level 4).** Make the learner's change and the teammate's change touch the same line. Then use a `git` step with `check: { type: 'conflict' }` for the pull, a `code` step that requires the combined line and excludes `<<<<<<<`, and a `git` step with `conflictResolved` for the merge commit.
- **A requirement change (Level 5).** `after.ticketUpdate` on a chat step edits the ticket on the board. The tests then check that contract and code agree.

## Mistakes the engine already notices

General, so every level must give each a `replay` rule: `skipped-start-pull`, `branch-behind-main`, `unclear-branch-name` (needs a `branchNamed` check in the level), `committed-on-main`, `vague-commit-message`, `skipped-prepush-pull`, `pushed-to-main`, `pr-out-of-date`.

Level-specific. A level needs a `replay` rule only for the ones it can trigger: `unagreed-contract`, `ignored-failing-tests`, `dismissed-review`, `overwrote-teammate` (all set by a chat reply's `mistake`), and `committed-conflict-markers` (the engine notices it when a commit still contains `<<<<<<<`; any level with a `conflict` step should explain it).

A new kind of mistake means adding an id to `LEVEL_MISTAKE_IDS` in `src/engine/types.ts`. If a chat reply cannot trigger it, also add a detection in `levelRunner.ts`.

## Writing rules

Follow `docs/DESIGN.md` for copy: sentence case, no exclamation marks, no greetings or hype, realistic mock data, plain language. Every term used in a step must exist in `src/content/jargon.json`. A term is only underlined if its word appears in that step's prompt, so write the prompt with the word in it ("assigned you a ticket"); the first-time card shows either way.

Keep teammates consistent across levels: Priya Nair (project manager), Marcus Webb (backend), Aisha Khan (frontend), Tomás Rivera (backend), Sam Okafor (QA), Dana Whitfield (reviewer).

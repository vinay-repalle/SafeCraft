# Writing a level

A level is data. Adding Level 2 to 5 should mean writing `src/content/levels/levelN.json`, not changing engine code. If a level needs something the engine cannot do, extend the engine once, with a test, and then use it from data.

## Steps

1. Copy `level1.json` and change the story: `scenario` (app, ticket, files, optional `otherTickets` and `remoteCommits`), `tests`, `steps` and `replay`.
2. Register it in `src/content/index.ts`.
3. Run `npm test`. The "level data" test runs `validateLevel` on every level and lists problems in plain English (unknown ticket, missing autoFill, unknown jargon term, missing replay rule).
4. Add a test that plays the level through `LevelRunner`, as `levelRunner.test.ts` does for Level 1. Playing it with `{ type: 'autoFill' }` until it finishes proves Skip & Auto-Fill works on every step.

## The pieces

| Piece | What it is |
| --- | --- |
| `scenario.files` | The starting files in the fake repository |
| `scenario.remoteCommits` | Teammate commits already on origin when the level starts, so the learner begins behind |
| `tests` | Rule-based "unit tests" run on the pull request's files (`includes`, `excludes`, `matches`, `fileExists`) |
| `steps[].check` | A rule answered from simulated state: `ticketStatus`, `branchNamed`, `fileContains`, `branchHasCommit`, `syncResolved`, `pushed`, `prRaised`, `testsPassed`, `prApproved`, `prMerged`, `deployed`, `chatDone` |
| `steps[].autoFill` | What Skip & Auto-Fill does. Meaning depends on `kind`; see the comment in `src/engine/types.ts` |
| `steps[].auto` | Steps the engine performs for an observe-only role: `runTests`, `approvePr`, `deploy` |
| `steps[].stationEvent` | Which 3D station lights up when the step completes |
| `replay` | One rule per mistake: what the learner did, and what it would have caused on a real team |

## Mistakes the engine already notices

`skipped-start-pull`, `branch-behind-main`, `unclear-branch-name` (needs a `branchNamed` check in the level), `committed-on-main`, `vague-commit-message`, `skipped-prepush-pull`, `pushed-to-main`, `pr-out-of-date`. Every level must give each one a `replay` rule. A new kind of mistake means adding an id to `MISTAKE_IDS` in `src/engine/types.ts` and a detection in `levelRunner.ts`.

## Writing rules

Follow `docs/DESIGN.md` for copy: sentence case, no exclamation marks, no greetings or hype, realistic mock data, plain language. Every term used in a step must exist in `src/content/jargon.json`.

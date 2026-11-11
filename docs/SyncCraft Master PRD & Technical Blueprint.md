# SyncCraft: Master PRD & Technical Blueprint

Nov 11, 2026 · @Vinay

## 1. Vision

SyncCraft is a free, visual playground that teaches anyone how software teams work together, from the first idea to the live product.

It is a browser-only 3D teamwork simulator, like Flexbox Froggy but for collaboration: Jira tickets, API contracts, Git branches, Pull Requests and automated tests.

**Guiding principles**

- **Teamwork first, tools second.** Each level starts with the human idea ("two people cannot edit the same line at once"), then shows the tool that solves it.
- **No prior knowledge assumed.** Learners may be beginners, students or experienced developers from any domain. Nothing requires having built a solo project.
- **Learn the meaning, not just the click.** Every term and shortcut is explained where it appears, and can be turned off.
- **Nothing is locked.** All levels are open. The goal is understanding how things work and what each is used for.
- **Free forever.** 100% client-side, hosted on Vercel, Netlify or Cloudflare Pages, with no backend or database costs.

## 2. The Problem

People who can build alone often freeze in their first team project, because nobody taught them the rhythm of working together.

**What a fresher faces on day one**

- A Jira board full of tickets, with no idea which to pick or how it connects to code.
- Frontend and backend built at the same time by two people, with no way to avoid waiting on each other.
- A push that overwrites a teammate's work, or a scary Git merge conflict.
- A Pull Request with failing automated tests, and no idea of the sync, test, review and ship cycle.

**Why current learning fails.** Blogs and videos are passive: watching someone explain Jira does not prepare you for doing it. Games like Flexbox Froggy and Learn Git Branching teach isolated syntax, not the full journey from a client's idea to a live product.

## 3. Decisions Locked

These were agreed in discussion and are fixed for v1.

| Area | Decision |
| --- | --- |
| Name | SyncCraft |
| Audience | Anyone: beginners, students, experienced developers, any domain. Teamwork is taught from scratch. |
| Language | English only |
| Platform | Desktop only (the 3-zone layout and 3D scene do not suit small screens) |
| Hosting | 100% client-side, free on Vercel, Netlify or Cloudflare Pages. No backend, no database, no login. |
| Progress storage | Browser localStorage, plus export/import of progress |
| Access | All levels open from the start. A map shows a "Start here" hint only. |
| Code tasks | Tiny edits early, small real snippets from Level 3. Skip & Auto-Fill on every step. |
| Git | Buttons by default, each showing the real command. Optional mini terminal. |
| Teammates | Scripted chat with multiple-choice replies and branching outcomes |
| Feedback | Gentle by default (hints, retries). Optional Pro Mode with scoring and timers. |
| Look | Polished low-poly isometric 3D, clean and playful, light and dark theme |
| Source code | Public on GitHub. Claude never runs git commit or git push in this project. |

**Working rule.** Claude only writes and edits files and reports what changed. All Git actions (add, commit, push, pull requests) are done by the project owner.

## 4. Core Experience

Learners are never tied to one role or domain: they can switch views and roles at any time, and every level opens with a short recap so they can start anywhere.

**The three-zone playground (My View).** Every level splits the screen so one action visibly causes reactions across the team.

- **Left: Mini-Jira board and team chat.** Tickets move through To Do, In Progress, Review and Done. Simulated teammates chat with multiple-choice replies.
- **Center: Code and Git box.** A VS Code-style editor for tiny tasks, plus Git buttons (Create Branch, Commit, Pull, Push, Raise PR). Each button shows its real command.
- **Right: 3D pipeline visualizer.** An isometric diorama of client, ticket, developer desk, GitHub, test server and live cloud, lighting up as work moves.

**Four views**

| View | What it shows |
| --- | --- |
| My View | The three-zone layout from the chosen role's point of view (default) |
| Team View | All roles side by side; one action ripples across every panel so you see who waits on whom |
| Pipeline View | Full-screen 3D diorama of the whole journey, no code |
| Field Guide | Short jargon-free docs, linked from every highlighted term |

**Roles**

| Role | v1 status | What they do |
| --- | --- | --- |
| Frontend Developer | Playable | UI code, mock data, API integration |
| Backend Developer | Playable | Endpoints, API contract, database changes |
| QA Tester | Observe-only | Test cases, bug reports, verifying fixes |
| Project Manager | Observe-only | Tickets, priorities, requirement changes |
| Code Reviewer | Observe-only | Reading PRs and leaving comments |

A role bar at the top switches roles in one click, even mid-level. Each role has an "A day in this role" card. Progress is tracked per role.

**Play modes**

- **Learn:** the learner types code and clicks the right workflow buttons; a client-side validator checks the work.
- **Observe ("Just watch"):** the whole workflow plays automatically so the learner sees how it connects first.
- **Skip & Auto-Fill:** on any coding step, fills the answer so the learner still experiences the PR, tests and deploy flow.
- **Pro Mode (optional):** adds scoring and timers; default stays gentle with hints and retries.

## 5. Levels

All five levels are open from the start. Each starts from a pre-set scenario (so it never depends on earlier levels) and opens with a 20-second recap card and a one-line "Why this exists". Scenarios use everyday products (a food ordering app, a library app) so any background can follow. A 10-second intro scene shows a client giving a requirement to the project manager, who drops a ticket on the board.

| Level | Teamwork idea | Tool taught | What the learner does | Habit |
| --- | --- | --- | --- | --- |
| 1. First Ticket & Branch | Everyone gets their own copy of the notebook | Jira ticket, Git branch | Pull latest, pick a ticket, move it to In Progress, create a well-named branch, ship a tiny text change | Pull before you start |
| 2. API Contract Handshake | Agree on the plan so two people can build at once | API contract (request/response JSON), mock data | Chat with the backend teammate, agree on the JSON shape, build the frontend against mock data | Communicate early |
| 3. Failed Tests & PR Review | Ask a teammate to check your homework before it goes in the class book | Pull Request, automated tests, code review | Raise a PR, read the red test log, fix the code, re-submit, answer reviewer comments, get approval | Review kindly, ask when blocked |
| 4. Merge Conflict | Two people erased and rewrote the same sentence | Merge conflict, resolving | Watch two developers edit one file in 3D, see why it collides, resolve without deleting a teammate's work | Pull before you push |
| 5. Sudden Requirement Change | Plans change; talk first, then update everything together | Ticket update, contract update, redeploy | Sync with the teammate, update ticket and API contract, deploy the change cleanly | Handle change calmly |

**How a level runs**

1. Recap card and "Why this exists".
2. Sync Check popup (pull) before work starts.
3. Scenario steps across the three zones, with Skip & Auto-Fill available.
4. Tests and review in the 3D pipeline, ending in a live release.
5. Mistakes Replay: what went wrong and what it would have caused on a real team.

**Success and failure.** Gentle mode gives hints and retries with no penalty. Pro Mode scores mistakes such as pushing straight to main or skipping a pull.

## 6. Key Features

**Jargon Helper.** Teaches meanings and shortcuts in context so learners can use them in real work.

- Terms (Ticket, Branch, PR, Merge Conflict, API Contract) get a dotted underline; hover or tap shows a one-line meaning, an everyday analogy and a real example.
- Real commands and keyboard shortcuts show next to each action (for example, commit shows `git commit -m "message"`).
- A term card pops up the first time the term appears in a level.
- A Cheat Sheet panel collects every term and shortcut met so far, linked to the Field Guide.
- Setting with three modes: **Off**, **First time only**, **Always on**. Saved in localStorage.
- All definitions live in one local JSON file.

**Sync Check popup.** Teaches pull-before-start and pull-before-push.

- Appears before moving a ticket to In Progress or creating a branch (`git pull origin main`), and again before pushing or raising a PR (`git pull origin <branch>`).
- Shows one line on why it matters, a box to type the command, a Hint button and Jargon Helper terms.
- **Skip & Auto-run:** the game runs the pull and shows it in 3D.
- **Ignore (learn the hard way):** available in every level. Skipping the start pull flags "branch is behind main" and the PR later shows "out of date". Skipping the pre-push pull gets the push rejected with the real Git message and a plain-English explanation; in Level 4 this leads into the merge conflict.
- Gentle mode: warning and retry. Pro Mode: lost points.

**Mistakes Replay.** After each level, a short recap of what the learner did wrong and what it would have caused on a real team (for example, "You pushed to main, so the live site would have broken").

**Code review step.** Inside Level 3, the learner reads a teammate's PR, leaves comments and sees replies.

**Cheat Sheet export.** Download every term and command learned as Markdown or PDF.

**Progress Card.** Download an image of badges and completed levels, rendered in the browser.

**Field Guide.** A separate tab of 2-minute jargon-free visual guides, readable before or after any level. Starting set: What is a Pull Request?, Why we never push directly to main, How frontend and backend work in parallel, What is a branch?, What is a merge conflict?, What is an API contract?, What are automated tests?, Reading a Jira board.

**Progress export/import.** Because progress lives in one browser, a button exports and imports it as a file.

## 7. Visual Design & 3D

The look is polished low-poly isometric, not photorealistic: photorealism is what causes lag, while low-poly with good lighting feels premium and stays smooth on ordinary laptops.

**Making it feel real**

- The editor looks like VS Code, the board like Jira, the PR page like GitHub and test output like a real terminal. This does more for realism than the 3D does.
- Clean and playful style with a light and dark theme toggle.

**Performance rules**

| Rule | Detail |
| --- | --- |
| Camera | Fixed orthographic isometric camera |
| Shadows | Baked or soft contact shadows, no real-time shadows, no heavy post-processing |
| Rendering | `frameloop="demand"`: render only when something moves |
| Models | Under about 5,000 polygons each, compressed glTF |
| Pixel ratio | Capped at 1.5 |
| Loading | 3D loads lazily after the UI appears; a 2D fallback shows on weak devices |
| Libraries | React Three Fiber and drei, importing only what is used |

**The diorama.** A small scene with stations: client, project manager desk, developer desk, GitHub, test server, live cloud. A glowing package moves between stations as work progresses; stations turn green or red for passing or failing tests, and a second developer appears for merge conflicts.

## 8. Technical Architecture

Everything runs in the browser: a content layer feeds a small simulation engine, which drives the three UI zones and the 3D scene.

&#91;embedded content: architecture · content, engine, UI, store\]

Content files feed the engine; the engine emits events that every on-screen zone listens to, and saves progress to the browser.

| Concern | Choice |
| --- | --- |
| Framework | React with Vite and TypeScript |
| Styling | Tailwind CSS |
| 3D | React Three Fiber and drei |
| Code editor | CodeMirror |
| Tests and PR checks | Client-side JavaScript rule or AST checks that simulate unit tests |
| State | Zustand, persisted to localStorage |
| Docs | Local Markdown/MDX files rendered in the Field Guide |
| Export | Browser-only: Markdown/PDF cheat sheet, canvas-rendered progress card |
| Hosting | Vercel, Netlify or Cloudflare Pages (static) |

**Simulation engine.** Git, Jira and tests are not real: small TypeScript modules keep a fake repository, board and test runner in memory. A level file lists steps; the level runner checks each step and emits events. The UI and the 3D scene both listen to those events, so one action updates the board, the editor and the diorama together.

## 9. Folder Structure & Data Models

Content (levels, terms, guides) lives in data files, so adding a level never means changing engine code.

```text
synccraft/
  public/models/            compressed .glb 3D assets
  src/
    app/                    App shell, router, theme
    views/                  MyView, TeamView, PipelineView, FieldGuide
    components/
      jira/                 Board, Ticket, ChatPanel
      editor/               CodeEditor, GitButtons, MiniTerminal
      pipeline/             Scene, stations, package animation
      jargon/               JargonText, TermCard, CheatSheet
      popups/               SyncCheck, MistakesReplay, RoleCard
    engine/
      gitSim.ts             simulated branches, commits, pull, push, conflicts
      jiraSim.ts            ticket states and transitions
      testRunner.ts         client-side rule/AST checks that act as tests
      levelRunner.ts        runs a level's steps from its data file
      scoring.ts            Pro Mode only
    content/
      levels/level1.json ... level5.json
      jargon.json           terms, analogies, commands, shortcuts
      guides/*.mdx          Field Guide articles
    store/                  Zustand stores + localStorage persistence
    utils/                  export (Markdown, PDF, progress card)
  docs/PROJECT_DOC.md       this document
```

**Level data (shape).** A level is a list of steps; the engine runs them in order.

```ts
type Level = {
  id: number; title: string; whyItExists: string; recap: string;
  scenario: { app: string; ticket: Ticket; files: SimFile[] };
  steps: Step[];
  replay: ReplayRule[];          // what mistake => what real-world result
};

type Step = {
  id: string;
  role: 'frontend' | 'backend' | 'qa' | 'pm' | 'reviewer';
  kind: 'chat' | 'board' | 'code' | 'git' | 'syncCheck' | 'pr' | 'tests' | 'review' | 'deploy';
  prompt: string;
  check?: RuleCheck;             // client-side validator
  autoFill?: string;             // used by Skip & Auto-Fill
  terms?: string[];              // jargon ids shown here
  stationEvent?: PipelineEvent;  // drives the 3D scene
};
```

**Saved progress (localStorage).**

```ts
type Progress = {
  completed: Record<number, { frontend?: boolean; backend?: boolean }>;
  badges: string[]; seenTerms: string[]; guidesRead: string[];
  settings: { jargonMode: 'off' | 'first' | 'always'; theme: 'light' | 'dark' | 'system'; proMode: boolean; role: string };
};
```

## 10. Build Phases

Six phases, each ending in something you can open in the browser and test, so you always have a working app.

&#91;embedded content: roadmap · 6 phases, each with a done-when gate\]

The phases run in order; Level 1 is built and polished first as the demo.

**How we work each phase**

1. Claude writes or edits the files for one small step and lists what changed.
2. You run it locally and check it against the phase's "done when".
3. You do the Git work yourself: branch, commit, push and pull request. Claude never runs these.
4. Every new concept (a hook, a store, a 3D camera) is explained as it is first used.

**Order inside each level.** Data file first, then the engine step it needs, then the UI, then the 3D event.

## 11. MVP Scope, v2 and Risks

**v1 (MVP).** Level 1 fully polished first as the demo, then Levels 2 and 3, then 4 and 5. Frontend and Backend roles playable; QA, PM and Code Reviewer observe-only. My View, Team View, Pipeline View and Field Guide. Jargon Helper, Sync Check, Skip & Auto-Fill, Mistakes Replay, Cheat Sheet export, Progress Card, progress export/import. Ship with at least 5 Field Guide articles, growing to 8.

**v2 backlog**

- QA, PM and Code Reviewer fully playable.
- Interview Mode: five scenario questions at the end ("Tests failed on your PR. What do you do?").
- More levels (hotfix, release day, code review as a full mini-game).
- Optional accounts and sync via a free backend (Supabase or Firebase) if the project grows.
- Privacy-friendly analytics (Plausible or PostHog) to see where learners get stuck.

**Out of scope for v1.** Mobile layout, other languages, leaderboards, real AI teammates (needs a server and API key), real Git or GitHub connection.

**Risks**

| Risk | Mitigation |
| --- | --- |
| 3D lag on weak laptops | Orthographic camera, render on demand, light models, 2D fallback |
| Scope creep from five roles and four views | Two playable roles; others observe-only; Level 1 polished first |
| Simulated Git feels fake | Show the real command on every button; optional mini terminal; real Git error messages |
| Progress lost when browser data is cleared | Export/import progress file |
| Cheating the client-side validator | Accepted; it is a learning game |
| Writing 5 levels takes long | Data-driven level files and a shared engine, so each level is mostly content |

**Open questions**

- Which everyday app should Level 1 use: food ordering or library?
- Preferred colour palette once a first mockup exists?

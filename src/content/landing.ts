// Every line of copy on the landing page (Phase 8), in one place, plus "How to play".
//
// "How to play" is written once, here. The landing page draws it as a section, and the Field
// guide lists it as its first article (see guides.ts and src/components/landing/HowToPlay.tsx).
// The five levels are not copied in: both read them from the level data, so a renamed level
// changes everywhere.
//
// Copy rules (docs/DESIGN.md): sentence case, no exclamation marks, no hype, no invented claims.
// landing.test.ts checks them.
import type { Station } from '../engine/types'
import type { Role } from '../store/types'
import type { Sketch } from './sketch'

export const HERO = {
  title: 'See how a software team gets one change to customers',
  lead: 'SyncCraft is a free simulator that runs in your browser. You join a small team building a food ordering app, pick up a ticket and carry one change from the board to the live app, through branches, pull requests, tests and merge conflicts.',
  note: 'Free. No sign-up. Your progress stays in this browser.',
  howToPlay: 'How to play',
}

// The scroll story. Each stop is one text card beside the 3D scene; story.ts says what the
// scene shows at each stop. The order follows the real route a change takes through the
// diorama. `level` is the level that teaches it.
export type StopId = 'ticket' | 'parallel' | 'conflict' | 'merged' | 'github' | 'tests-red' | 'tests-green' | 'review' | 'live'

export const STORY = {
  title: 'Follow one order',
  lead: 'One change to Bowlful, a food ordering app: the checkout button should say “Place order”, not “Pay now”. Scroll to follow it from the client to customers.',
  stops: [
    {
      id: 'ticket',
      title: 'The client asks for a change',
      body: 'The restaurant owner says customers read “Pay now” as an instant charge. The project manager writes it up as ticket ORD-14: what to change, and why.',
      level: 1,
    },
    {
      id: 'parallel',
      title: 'Frontend and backend build at once',
      body: 'The frontend developer builds the screen while the backend developer builds the endpoint behind it. They agreed the JSON that passes between them first, so neither waits for the other.',
      level: 2,
    },
    {
      id: 'conflict',
      title: 'Two changes meet at the same line',
      body: 'Before pushing, you pull the latest work. A teammate changed the same line, so Git stops at the merge gate and asks which version to keep.',
      level: 4,
    },
    {
      id: 'merged',
      title: 'You choose, Git merges',
      body: 'You keep both edits in one line. The gate lifts, and the two changes travel on together as one commit.',
      level: 4,
    },
    {
      id: 'github',
      title: 'A pull request on GitHub',
      body: 'You push your branch and open a pull request: a request to add your work to main, where the whole team can see it.',
      level: 1,
    },
    {
      id: 'tests-red',
      title: 'The tests say no',
      body: 'The conveyor carries the change to the test server. One automated test fails and the server turns red. Nothing reaches customers.',
      level: 3,
    },
    {
      id: 'tests-green',
      title: 'Fix it, run them again',
      body: 'You read the test log, fix the line it points to and push again. The tests run again and pass.',
      level: 3,
    },
    {
      id: 'review',
      title: 'A teammate reviews it',
      body: 'The code reviewer reads the change, asks one question and approves it. Only then can it be merged into main.',
      level: 3,
    },
    {
      id: 'live',
      title: 'Live for customers',
      body: 'The change is merged and released. The next customer to open Bowlful sees “Place order”.',
      level: 1,
    },
  ] as { id: StopId; title: string; body: string; level: number }[],
}

export const ROLES = {
  title: 'Five roles, two seats',
  lead: 'You play the frontend or the backend developer. The other three work alongside you, and Team view shows what each of them is doing.',
  playable: 'Playable',
  observe: 'Observe only',
  detail: {
    frontend: 'Builds the screens customers use, first against mock data, then against the real API.',
    backend: 'Builds the endpoints, agrees the API contract and changes the database.',
    qa: 'Writes test cases, reports bugs and checks the fixes.',
    pm: 'Writes the tickets, sets priorities and brings requirement changes.',
    reviewer: 'Reads each pull request and leaves comments before it is merged.',
  } satisfies Record<Role, string>,
}

// The station names the still pictures and the 3D labels use come from stationInfo.ts. This
// only says which stations each stop's text is about, for the screen-reader line under a still.
export const STOP_STATIONS: Record<StopId, Station[]> = {
  ticket: ['client', 'pm'],
  parallel: ['dev'],
  conflict: ['dev', 'github'],
  merged: ['dev', 'github'],
  github: ['github'],
  'tests-red': ['tests'],
  'tests-green': ['tests'],
  review: ['github', 'tests'],
  live: ['live'],
}

// ---------------------------------------------------------------------------------------------
// How to play. Four small drawings, in the same sketch format as the Field Guide diagrams.
// Canvas: 240 x 120. landing.test.ts runs checkSketch on each.

const SW = 240
const SH = 120

const seatSketch: Sketch = {
  id: 'how-seat',
  width: SW,
  height: SH,
  title: 'Pick a seat',
  caption: 'Frontend or backend developer. The other three roles are observe only.',
  items: [
    { kind: 'box', x: 12, y: 18, w: 100, h: 34, label: 'Frontend', tone: 'accent' },
    { kind: 'box', x: 128, y: 18, w: 100, h: 34, label: 'Backend', tone: 'muted' },
    { kind: 'text', x: 120, y: 80, text: 'Pick one in the role bar', tone: 'muted', anchor: 'middle' },
    { kind: 'text', x: 120, y: 102, text: 'QA, PM, reviewer: observe', tone: 'muted', anchor: 'middle' },
  ],
}

const ticketSketch: Sketch = {
  id: 'how-ticket',
  width: SW,
  height: SH,
  title: 'Read the ticket, talk to the team',
  caption: 'Your ticket is on the board. Teammates write in the chat and you choose a reply.',
  items: [
    { kind: 'box', x: 12, y: 10, w: 92, h: 100, label: 'To do', labelAt: 'top', tone: 'muted' },
    { kind: 'tag', x: 33, y: 56, label: 'ORD-14', tone: 'accent' },
    { kind: 'box', x: 120, y: 18, w: 108, h: 30, label: 'Backend: JSON?', tone: 'muted' },
    { kind: 'box', x: 120, y: 62, w: 108, h: 30, label: 'You: agreed' },
  ],
}

const gitSketch: Sketch = {
  id: 'how-git',
  width: SW,
  height: SH,
  title: 'Change the code, use Git',
  caption: 'Make a small edit. Each Git button shows the real command it runs.',
  items: [
    { kind: 'line', points: [[24, 88], [84, 88]], tone: 'muted' },
    { kind: 'line', points: [[84, 88], [112, 48], [204, 48]], tone: 'accent' },
    { kind: 'dot', x: 24, y: 88, label: 'main', tone: 'muted', hollow: true },
    { kind: 'dot', x: 144, y: 48, label: 'commit', tone: 'accent', labelAt: 'above' },
    { kind: 'dot', x: 204, y: 48, label: 'push', tone: 'accent', labelAt: 'above' },
    { kind: 'text', x: 228, y: 100, text: 'git push', tone: 'muted', anchor: 'end' },
  ],
}

const followSketch: Sketch = {
  id: 'how-follow',
  width: SW,
  height: SH,
  title: 'Follow it to customers',
  caption: 'Tests, review, release. Then Mistakes replay shows what a slip would have caused.',
  items: [
    { kind: 'box', x: 8, y: 20, w: 64, h: 32, label: 'Tests', tone: 'pass' },
    { kind: 'line', points: [[72, 36], [88, 36]], tone: 'muted', arrow: true },
    { kind: 'box', x: 88, y: 20, w: 64, h: 32, label: 'Review', tone: 'pass' },
    { kind: 'line', points: [[152, 36], [168, 36]], tone: 'muted', arrow: true },
    { kind: 'box', x: 168, y: 20, w: 64, h: 32, label: 'Live', tone: 'accent' },
    { kind: 'text', x: 120, y: 88, text: 'Then Mistakes replay', tone: 'muted', anchor: 'middle' },
  ],
}

export type HelperId = 'jargon' | 'guide' | 'cheat' | 'skip'

export const HOW_TO_PLAY = {
  slug: 'how-to-play',
  title: 'How to play',
  intro: 'SyncCraft runs in your browser. In each level you carry one change from a ticket to the live app, as one member of a five-person team.',
  stepsTitle: 'Four steps',
  steps: [
    { title: 'Pick a seat', body: 'Choose Frontend developer or Backend developer in the role bar. Every level is written for both seats.', sketch: seatSketch },
    { title: 'Read the ticket, talk to the team', body: 'Your ticket is on the board. Teammates write in the chat, and you reply by choosing an answer.', sketch: ticketSketch },
    { title: 'Change the code, use Git', body: 'Make a small edit in the editor. Each Git button shows the real command it runs, and Sync check reminds you to pull first.', sketch: gitSketch },
    { title: 'Follow it to customers', body: 'Watch the tests, the review and the release in the pipeline. At the end, Mistakes replay shows what any slip would have caused on a real team.', sketch: followSketch },
  ],
  levelsTitle: 'The five levels',
  levelsLead: 'All five are open from the start. Level 1 is the place to begin.',
  helpersTitle: 'Helpers',
  helpers: [
    { id: 'jargon', name: 'Jargon helper', body: 'Underlined terms explain themselves, with an everyday comparison. Set it with the Terms switch: off, first time or always.' },
    { id: 'guide', name: 'Field guide', body: 'Short articles of two minutes or less, linked from every term that has one.' },
    { id: 'cheat', name: 'Cheat sheet', body: 'Every term and command you have met, ready to download as Markdown or PDF.' },
    { id: 'skip', name: 'Skip and auto-fill', body: 'Stuck on a code step? It fills in the answer, so you still see the pull request, the tests and the release.' },
  ] as { id: HelperId; name: string; body: string }[],
  progressTitle: 'Your progress',
  progressBody: 'Progress is saved in this browser only. Nothing is sent anywhere. To move to another browser, export it to a file and import it there.',
}

export const CLOSING = {
  title: 'Take one change to customers',
  lead: 'Start with Level 1. You can switch seats, views and levels at any time.',
}

export const FOOTER = 'SyncCraft is open source under the MIT licence and runs entirely in your browser.'

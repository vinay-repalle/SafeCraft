import type { Sketch } from './sketch'

// Field Guide diagrams (Phase 7d): one still picture per article, shown under its title.
// Same format as the jargon animations (see sketch.ts), with no timing, so they never move.
// The key is the article's slug. The tests check there is one for every article in GUIDE_ORDER.
//
// Canvas: 480 x 180.

const W = 480
const H = 180

const board: Sketch = {
  id: 'reading-a-jira-board',
  width: W,
  height: H,
  title: 'A Jira board',
  caption: 'Tickets move left to right. Each column says how far along the work is.',
  items: [
    { kind: 'box', x: 8, y: 8, w: 106, h: 150, label: 'To do', labelAt: 'top', tone: 'muted' },
    { kind: 'box', x: 126, y: 8, w: 106, h: 150, label: 'In progress', labelAt: 'top', tone: 'muted' },
    { kind: 'box', x: 244, y: 8, w: 106, h: 150, label: 'Review', labelAt: 'top', tone: 'muted' },
    { kind: 'box', x: 362, y: 8, w: 106, h: 150, label: 'Done', labelAt: 'top', tone: 'muted' },
    { kind: 'tag', x: 34, y: 56, label: 'ORD-17', tone: 'muted' },
    { kind: 'tag', x: 152, y: 56, label: 'ORD-14', tone: 'accent' },
    { kind: 'tag', x: 270, y: 56, label: 'ORD-12', tone: 'muted' },
    { kind: 'tag', x: 388, y: 56, label: 'ORD-9', tone: 'muted' },
    { kind: 'text', x: 179, y: 92, text: 'Yours, being built', tone: 'muted', anchor: 'middle' },
    { kind: 'line', points: [[118, 140], [242, 140]], tone: 'muted', arrow: true },
    { kind: 'line', points: [[236, 140], [360, 140]], tone: 'muted', arrow: true },
  ],
}

const branch: Sketch = {
  id: 'what-is-a-branch',
  width: W,
  height: H,
  title: 'A branch',
  caption: 'Your branch starts from main, collects your commits, and joins main again through a pull request.',
  items: [
    { kind: 'line', points: [[30, 130], [450, 130]], tone: 'muted' },
    { kind: 'line', points: [[110, 130], [150, 60], [300, 60], [370, 130]], tone: 'accent' },
    { kind: 'dot', x: 30, y: 130, label: 'Earlier', tone: 'muted', hollow: true },
    { kind: 'dot', x: 110, y: 130, label: 'main', tone: 'ink' },
    { kind: 'dot', x: 190, y: 60, label: 'Your commit', tone: 'accent', labelAt: 'above' },
    { kind: 'dot', x: 270, y: 60, label: 'Your commit', tone: 'accent', labelAt: 'above' },
    { kind: 'dot', x: 370, y: 130, label: 'Merged', tone: 'ink' },
    { kind: 'tag', x: 176, y: 96, label: 'feature/ORD-14', tone: 'accent' },
    { kind: 'text', x: 450, y: 160, text: 'main', tone: 'muted', anchor: 'end' },
  ],
}

const pullRequest: Sketch = {
  id: 'what-is-a-pull-request',
  width: W,
  height: H,
  title: 'A pull request',
  caption: 'A pull request asks to merge your branch. Automated tests and a teammate check it before it reaches main.',
  items: [
    { kind: 'tag', x: 8, y: 70, label: 'feature/ORD-14', tone: 'accent' },
    { kind: 'line', points: [[112, 70], [146, 70]], tone: 'muted', arrow: true },
    { kind: 'box', x: 150, y: 50, w: 120, h: 40, label: 'Pull request #1' },
    { kind: 'line', points: [[210, 90], [210, 112]], tone: 'muted' },
    { kind: 'dot', x: 180, y: 128, label: 'Tests', tone: 'pass', labelAt: 'below' },
    { kind: 'dot', x: 240, y: 128, label: 'Review', tone: 'pass', labelAt: 'below' },
    { kind: 'line', points: [[274, 70], [330, 70]], tone: 'muted', arrow: true },
    { kind: 'text', x: 302, y: 58, text: 'Merge', tone: 'muted', anchor: 'middle' },
    { kind: 'tag', x: 336, y: 70, label: 'main', tone: 'ink' },
  ],
}

const neverPushMain: Sketch = {
  id: 'why-we-never-push-directly-to-main',
  width: W,
  height: H,
  title: 'Pushing to main versus a pull request',
  caption: 'A direct push skips every check. The pull request route catches problems before customers see them.',
  items: [
    { kind: 'box', x: 8, y: 70, w: 100, h: 40, label: 'Your laptop' },
    { kind: 'tag', x: 410, y: 90, label: 'main', tone: 'ink' },
    { kind: 'line', points: [[112, 80], [200, 34], [404, 84]], tone: 'fail', dashed: true, arrow: true },
    { kind: 'text', x: 256, y: 30, text: 'Direct push: no tests, no review', tone: 'fail', anchor: 'middle' },
    { kind: 'line', points: [[112, 100], [150, 140]], tone: 'pass', arrow: true },
    { kind: 'tag', x: 154, y: 146, label: 'branch', tone: 'accent' },
    { kind: 'line', points: [[210, 146], [240, 146]], tone: 'pass', arrow: true },
    { kind: 'box', x: 244, y: 128, w: 112, h: 36, label: 'Pull request' },
    { kind: 'line', points: [[360, 140], [404, 100]], tone: 'pass', arrow: true },
    { kind: 'text', x: 300, y: 122, text: 'Tests and review', tone: 'pass', anchor: 'middle' },
  ],
}

const parallel: Sketch = {
  id: 'how-frontend-and-backend-work-in-parallel',
  width: W,
  height: H,
  title: 'Frontend and backend in parallel',
  caption: 'Both sides agree a contract first. Then each builds at the same time and they join up at the end.',
  items: [
    { kind: 'box', x: 180, y: 8, w: 120, h: 36, label: 'API contract', tone: 'accent' },
    { kind: 'line', points: [[220, 44], [110, 78]], tone: 'muted', arrow: true },
    { kind: 'line', points: [[260, 44], [370, 78]], tone: 'muted', arrow: true },
    { kind: 'box', x: 40, y: 80, w: 140, h: 36, label: 'Frontend' },
    { kind: 'box', x: 300, y: 80, w: 140, h: 36, label: 'Backend' },
    { kind: 'text', x: 110, y: 132, text: 'builds on mock data', tone: 'muted', anchor: 'middle' },
    { kind: 'text', x: 370, y: 132, text: 'builds the endpoint', tone: 'muted', anchor: 'middle' },
    { kind: 'line', points: [[110, 138], [200, 160]], tone: 'muted', arrow: true },
    { kind: 'line', points: [[370, 138], [280, 160]], tone: 'muted', arrow: true },
    { kind: 'tag', x: 204, y: 164, label: 'Join up', tone: 'pass' },
  ],
}

const contract: Sketch = {
  id: 'what-is-an-api-contract',
  width: W,
  height: H,
  title: 'An API contract',
  caption: 'The contract is the agreed shape of a request and its answer. Both sides build to it.',
  items: [
    { kind: 'box', x: 8, y: 66, w: 100, h: 40, label: 'Frontend' },
    { kind: 'box', x: 372, y: 66, w: 100, h: 40, label: 'Backend' },
    { kind: 'box', x: 140, y: 16, w: 200, h: 148, label: 'GET /api/orders/:id', labelAt: 'top', tone: 'accent' },
    { kind: 'text', x: 152, y: 66, text: '{', tone: 'muted' },
    { kind: 'text', x: 164, y: 84, text: '"id": "string",' },
    { kind: 'text', x: 164, y: 102, text: '"status": "string",' },
    { kind: 'text', x: 164, y: 120, text: '"minutes": "number"' },
    { kind: 'text', x: 152, y: 138, text: '}', tone: 'muted' },
    { kind: 'line', points: [[112, 80], [136, 80]], tone: 'muted', arrow: true },
    { kind: 'line', points: [[344, 92], [368, 92]], tone: 'muted', arrow: true },
    { kind: 'text', x: 60, y: 126, text: 'asks', tone: 'muted', anchor: 'middle' },
    { kind: 'text', x: 422, y: 126, text: 'answers', tone: 'muted', anchor: 'middle' },
  ],
}

const tests: Sketch = {
  id: 'what-are-automated-tests',
  width: W,
  height: H,
  title: 'Automated tests',
  caption: 'Every pull request runs the tests. Green means it can go on to review. Red means fix it first.',
  items: [
    { kind: 'box', x: 8, y: 70, w: 112, h: 40, label: 'Pull request' },
    { kind: 'line', points: [[124, 90], [164, 90]], tone: 'muted', arrow: true },
    { kind: 'box', x: 168, y: 70, w: 96, h: 40, label: 'Tests run' },
    { kind: 'line', points: [[268, 82], [288, 54]], tone: 'muted', arrow: true },
    { kind: 'line', points: [[268, 98], [288, 126]], tone: 'muted', arrow: true },
    { kind: 'dot', x: 300, y: 46, label: 'All pass: on to review', tone: 'pass', labelAt: 'right' },
    { kind: 'dot', x: 300, y: 134, label: 'One fails: fix first', tone: 'fail', labelAt: 'right' },
  ],
}

const conflict: Sketch = {
  id: 'what-is-a-merge-conflict',
  width: W,
  height: H,
  title: 'A merge conflict',
  caption: 'Two edits to the same line meet. Git marks both and waits for a person to write the final line.',
  items: [
    { kind: 'dot', x: 30, y: 90, label: 'Before', tone: 'muted', hollow: true },
    { kind: 'line', points: [[36, 86], [120, 40]], tone: 'accent' },
    { kind: 'line', points: [[36, 94], [120, 140]], tone: 'muted' },
    { kind: 'dot', x: 126, y: 36, label: 'Delivery: $2.50', tone: 'accent', labelAt: 'right' },
    { kind: 'dot', x: 126, y: 144, label: 'Delivery fee (incl. tax)', tone: 'ink', hollow: true, labelAt: 'right' },
    { kind: 'line', points: [[132, 40], [270, 82]], tone: 'accent' },
    { kind: 'line', points: [[132, 140], [270, 98]], tone: 'muted' },
    { kind: 'tag', x: 274, y: 90, label: 'Conflict', tone: 'fail' },
    { kind: 'line', points: [[346, 90], [380, 90]], tone: 'muted', arrow: true },
    { kind: 'dot', x: 400, y: 90, label: 'You decide', tone: 'pass' },
  ],
}

export const GUIDE_DIAGRAMS: Record<string, Sketch> = Object.fromEntries(
  [board, branch, pullRequest, neverPushMain, parallel, contract, tests, conflict].map((s) => [s.id, s]),
)

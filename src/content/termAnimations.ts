import type { Sketch } from './sketch'

// Jargon mini-animations (Phase 7c). Each plays once when its term card opens, with a Replay button.
// To add one: write a sketch below with `id` set to the term's id in jargon.json, and add it to
// TERM_ANIMATIONS. The tests check every entry (labels, canvas, length) and that the term exists.
//
// Canvas: 320 x 140. Time: `at` in seconds, 3 seconds at most in total.

const W = 320
const H = 140

const commit: Sketch = {
  id: 'commit',
  width: W,
  height: H,
  title: 'Commit',
  caption: 'A commit saves your edits as a named snapshot, on your laptop only.',
  items: [
    { kind: 'box', x: 12, y: 46, w: 96, h: 36, label: 'Your edits' },
    { kind: 'line', points: [[114, 64], [150, 64]], tone: 'muted', arrow: true, at: 0.4 },
    { kind: 'line', points: [[170, 64], [250, 64]], tone: 'muted' },
    { kind: 'dot', x: 170, y: 64, label: 'Earlier', tone: 'muted', hollow: true },
    { kind: 'dot', x: 250, y: 64, label: 'New commit', tone: 'accent', at: 0.9 },
    { kind: 'text', x: 250, y: 36, text: 'git commit -m "..."', tone: 'muted', anchor: 'middle', at: 1.4 },
  ],
}

const branch: Sketch = {
  id: 'branch',
  width: W,
  height: H,
  title: 'Branch',
  caption: 'A branch is your own line of commits. main stays as it was until your work is merged.',
  items: [
    { kind: 'line', points: [[40, 100], [120, 100]], tone: 'muted' },
    { kind: 'dot', x: 40, y: 100, label: 'Earlier', tone: 'muted', hollow: true },
    { kind: 'dot', x: 120, y: 100, label: 'main', tone: 'ink' },
    { kind: 'line', points: [[120, 100], [160, 52], [270, 52]], tone: 'accent', at: 0.4 },
    { kind: 'dot', x: 200, y: 52, label: 'Your commit', tone: 'accent', labelAt: 'above', at: 0.9 },
    { kind: 'dot', x: 270, y: 52, label: 'Another', tone: 'accent', labelAt: 'above', at: 1.4 },
    { kind: 'text', x: 230, y: 104, text: 'main is untouched', tone: 'muted', anchor: 'middle', at: 1.9 },
  ],
}

const pull: Sketch = {
  id: 'pull',
  width: W,
  height: H,
  title: 'Pull',
  caption: 'A pull brings your teammates’ new commits from GitHub down to your laptop.',
  items: [
    { kind: 'box', x: 196, y: 12, w: 112, h: 36, label: 'GitHub' },
    { kind: 'box', x: 12, y: 92, w: 112, h: 36, label: 'Your laptop' },
    { kind: 'line', points: [[196, 40], [130, 100]], tone: 'muted', arrow: true, dashed: true },
    { kind: 'text', x: 172, y: 86, text: 'git pull', tone: 'muted', at: 0.2 },
    { kind: 'dot', x: 150, y: 110, label: 'Teammate’s work', tone: 'ink', hollow: true, labelAt: 'right', at: 0.5, from: [100, -76] },
  ],
}

const push: Sketch = {
  id: 'push',
  width: W,
  height: H,
  title: 'Push',
  caption: 'A push sends your commits from your laptop up to GitHub, where the team can see them.',
  items: [
    { kind: 'box', x: 196, y: 12, w: 112, h: 36, label: 'GitHub' },
    { kind: 'box', x: 12, y: 92, w: 112, h: 36, label: 'Your laptop' },
    { kind: 'line', points: [[130, 100], [196, 40]], tone: 'muted', arrow: true, dashed: true },
    { kind: 'text', x: 172, y: 86, text: 'git push', tone: 'muted', at: 0.2 },
    { kind: 'dot', x: 252, y: 72, label: 'Your commits', tone: 'accent', at: 0.5, from: [-110, 38] },
  ],
}

const pullRequest: Sketch = {
  id: 'pull-request',
  width: W,
  height: H,
  title: 'Pull request',
  caption: 'A pull request asks to merge your branch into main. Tests and a reviewer check it first.',
  items: [
    { kind: 'tag', x: 8, y: 40, label: 'feature/ORD-14' },
    { kind: 'line', points: [[112, 40], [136, 40]], tone: 'muted', arrow: true, at: 0.3 },
    { kind: 'box', x: 140, y: 22, w: 104, h: 36, label: 'Pull request', at: 0.3 },
    { kind: 'dot', x: 156, y: 84, label: 'Tests pass', tone: 'pass', labelAt: 'right', at: 0.9 },
    { kind: 'dot', x: 156, y: 112, label: 'Approved', tone: 'pass', labelAt: 'right', at: 1.4 },
    { kind: 'line', points: [[248, 40], [270, 40]], tone: 'muted', arrow: true, at: 1.9 },
    { kind: 'tag', x: 274, y: 40, label: 'main', tone: 'accent', at: 1.9 },
  ],
}

const mergeConflict: Sketch = {
  id: 'merge-conflict',
  width: W,
  height: H,
  title: 'Merge conflict',
  caption: 'Two people changed the same line. Git cannot choose, so it stops and asks you to.',
  items: [
    { kind: 'box', x: 104, y: 10, w: 112, h: 32, label: 'The same line' },
    { kind: 'dot', x: 80, y: 104, label: 'Your edit', tone: 'accent', at: 0.1, from: [-50, 0] },
    { kind: 'dot', x: 240, y: 104, label: 'Teammate’s edit', tone: 'ink', hollow: true, at: 0.1, from: [50, 0] },
    { kind: 'line', points: [[86, 96], [144, 46]], tone: 'accent', at: 0.8 },
    { kind: 'line', points: [[234, 96], [176, 46]], tone: 'muted', at: 0.8 },
    { kind: 'tag', x: 129, y: 76, label: 'Conflict', tone: 'fail', at: 1.4 },
  ],
}

export const TERM_ANIMATIONS: Record<string, Sketch> = Object.fromEntries(
  [commit, branch, pull, push, pullRequest, mergeConflict].map((s) => [s.id, s]),
)

// The six terms Phase 7c starts with. More can be added to TERM_ANIMATIONS at any time.
export const CORE_ANIMATED_TERMS = ['commit', 'branch', 'pull', 'push', 'pull-request', 'merge-conflict'] as const

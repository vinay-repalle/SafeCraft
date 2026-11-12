// A "sketch" is a small picture described as data (Phase 7c and 7d): boxes, commit dots, lines,
// text and branch tags on a fixed canvas. src/components/sketch/Sketch.tsx draws it as inline SVG.
//
// The same format serves two jobs:
// - Jargon mini-animations (termAnimations.ts): items with `at` appear at that second, and items
//   with `from` slide in from that offset. The animation plays once; a Replay button replays it.
// - Field Guide diagrams (guideDiagrams.ts): the same items with no timing, drawn still.
//
// Adding one means adding data, not code. checkSketch() below is run by the tests on every sketch,
// so a typo (a missing label, a shape off the canvas, a slow animation) fails the build early.

export type Tone = 'ink' | 'muted' | 'accent' | 'pass' | 'fail'

type Timing = {
  at?: number // seconds after the start when this item appears (0 or missing: there from the start)
  from?: [number, number] // slides in from this offset, in canvas units
}

export type SketchItem =
  | ({ kind: 'box'; x: number; y: number; w: number; h: number; label: string; tone?: Tone; dashed?: boolean; labelAt?: 'middle' | 'top' } & Timing)
  | ({ kind: 'dot'; x: number; y: number; label: string; tone?: Tone; hollow?: boolean; labelAt?: 'below' | 'above' | 'right' } & Timing)
  | ({ kind: 'line'; points: [number, number][]; tone?: Tone; dashed?: boolean; arrow?: boolean } & Timing)
  | ({ kind: 'text'; x: number; y: number; text: string; tone?: Tone; anchor?: 'start' | 'middle' | 'end' } & Timing)
  | ({ kind: 'tag'; x: number; y: number; label: string; tone?: Tone } & Timing) // x, y = left edge, vertical middle

export type Sketch = {
  id: string
  width: number
  height: number
  title: string // short name, read by screen readers
  caption: string // one sentence shown under the picture
  items: SketchItem[]
}

export const DOT_R = 7
export const FONT = 11 // canvas units
const CHAR_W = 6.4 // rough width of one character at FONT size
export const TAG_H = 18

// Tags hold mono text, so their width can be worked out from the label length.
export const tagWidth = (label: string) => Math.round(label.length * CHAR_W + 12)
export const textWidth = (text: string) => text.length * CHAR_W

// The longest an explaining animation may run, so it never feels like waiting.
export const MAX_SECONDS = 3
// How long one item's own animation lasts (matches the motion classes in index.css).
export const ITEM_SECONDS = 0.6

export function sketchDuration(sketch: Sketch): number {
  const timed = sketch.items.filter((i) => i.at || i.from)
  return timed.length ? Math.max(...timed.map((i) => (i.at ?? 0) + ITEM_SECONDS)) : 0
}

export const isAnimated = (sketch: Sketch) => sketchDuration(sketch) > 0

// Everything that would make a sketch wrong or unreadable. An empty list means it is fine.
export function checkSketch(sketch: Sketch): string[] {
  const problems: string[] = []
  const { width: W, height: H } = sketch
  const inside = (x: number, y: number) => x >= 0 && x <= W && y >= 0 && y <= H
  const say = (i: number, what: string) => problems.push(`${sketch.id} item ${i}: ${what}`)

  if (!sketch.title.trim()) problems.push(`${sketch.id}: missing title`)
  if (!sketch.caption.trim()) problems.push(`${sketch.id}: missing caption`)

  sketch.items.forEach((item, i) => {
    if ((item.at ?? 0) < 0) say(i, 'starts before 0 seconds')
    switch (item.kind) {
      case 'box':
        if (!item.label.trim()) say(i, 'a box needs a label')
        if (!inside(item.x, item.y) || !inside(item.x + item.w, item.y + item.h)) say(i, 'box is off the canvas')
        if (textWidth(item.label) > item.w - 8) say(i, `label "${item.label}" is wider than its box`)
        break
      case 'dot': {
        if (!item.label.trim()) say(i, 'a dot needs a label, so colour is never the only signal')
        if (!inside(item.x - DOT_R, item.y - DOT_R) || !inside(item.x + DOT_R, item.y + DOT_R)) say(i, 'dot is off the canvas')
        const w = textWidth(item.label)
        const at = item.labelAt ?? 'below'
        const fits = at === 'right' ? item.x + DOT_R + 4 + w <= W : item.x - w / 2 >= 0 && item.x + w / 2 <= W
        const fitsV = at === 'above' ? item.y - DOT_R - 4 - FONT >= 0 : at === 'below' ? item.y + DOT_R + 4 + FONT <= H : true
        if (!fits || !fitsV) say(i, `label "${item.label}" runs off the canvas`)
        break
      }
      case 'line':
        if (item.points.length < 2) say(i, 'a line needs two points')
        if (item.points.some(([x, y]) => !inside(x, y))) say(i, 'line is off the canvas')
        break
      case 'text': {
        if (!item.text.trim()) say(i, 'empty text')
        const w = textWidth(item.text)
        const left = item.anchor === 'middle' ? item.x - w / 2 : item.anchor === 'end' ? item.x - w : item.x
        if (left < 0 || left + w > W || item.y - FONT < 0 || item.y > H) say(i, `text "${item.text}" runs off the canvas`)
        break
      }
      case 'tag':
        if (!item.label.trim()) say(i, 'a tag needs a label')
        if (!inside(item.x, item.y - TAG_H / 2) || !inside(item.x + tagWidth(item.label), item.y + TAG_H / 2)) say(i, `tag "${item.label}" is off the canvas`)
        break
    }
  })

  if (sketchDuration(sketch) > MAX_SECONDS) problems.push(`${sketch.id}: plays for ${sketchDuration(sketch)}s, more than ${MAX_SECONDS}s`)
  return problems
}

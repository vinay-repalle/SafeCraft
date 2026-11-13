// Phase 8: the "Follow one order" scroll story, as plain numbers. No three.js and no React, so
// the 3D scene and the still pictures share one set of rules, and all of it is unit-tested.
//
// "Scroll-scrubbed" means the page's scroll position is the story's clock. Scrolling down plays
// it forward, scrolling up plays it backward, and when scrolling stops, everything stops. Nothing
// moves on its own, so there is no animation to loop or to switch off.
//
// The story is a list of frames, one per text card. A frame says what the scene shows when its
// card is in the middle of the screen: where the camera looks, where the parcel is, and what
// colour each station is. Between two cards the numbers are blended, so the camera glides and
// the parcel travels as the reader scrolls.
import { STATIONS, type Station } from '../../engine/types'
import type { StopId } from '../../content/landing'
import type { StationState } from '../../store/levelStore'
import { gatePoints } from '../pipeline/mergeGate'
import { PARCEL_OFFSET, SPACING, ease, parcelSpot, type XZ } from '../pipeline/sceneLayout'

// Where the parcel can be: on a station's pad, or waiting at the merge gate.
type Place = Station | 'gate'

export type StoryFrame = {
  id: StopId | 'hero'
  focus: readonly Station[] // the stations the camera frames
  zoom: number // 1 shows the whole diorama
  parcel: Place
  stations: Record<Station, StationState>
  secondDev: boolean // the second developer at the desk (frontend and backend at once, then the conflict)
  gate: 'closed' | 'merged' | null
}

const states = (partial: Partial<Record<Station, StationState>>): Record<Station, StationState> => ({
  client: 'idle',
  pm: 'idle',
  dev: 'idle',
  github: 'idle',
  tests: 'idle',
  live: 'idle',
  ...partial,
})
const UP_TO_DEV = { client: 'done', pm: 'done', dev: 'done' } as const

export const STORY_FRAMES: StoryFrame[] = [
  { id: 'ticket', focus: ['client', 'pm'], zoom: 1.45, parcel: 'pm', stations: states({ client: 'done', pm: 'active' }), secondDev: false, gate: null },
  { id: 'parallel', focus: ['dev'], zoom: 1.85, parcel: 'dev', stations: states({ client: 'done', pm: 'done', dev: 'active' }), secondDev: true, gate: null },
  { id: 'conflict', focus: ['dev', 'github'], zoom: 1.55, parcel: 'gate', stations: states({ client: 'done', pm: 'done', dev: 'active' }), secondDev: true, gate: 'closed' },
  { id: 'merged', focus: ['dev', 'github'], zoom: 1.55, parcel: 'gate', stations: states({ client: 'done', pm: 'done', dev: 'active' }), secondDev: true, gate: 'merged' },
  { id: 'github', focus: ['github'], zoom: 1.8, parcel: 'github', stations: states({ ...UP_TO_DEV, github: 'active' }), secondDev: false, gate: null },
  { id: 'tests-red', focus: ['github', 'tests'], zoom: 1.5, parcel: 'tests', stations: states({ ...UP_TO_DEV, github: 'done', tests: 'fail' }), secondDev: false, gate: null },
  { id: 'tests-green', focus: ['tests'], zoom: 1.8, parcel: 'tests', stations: states({ ...UP_TO_DEV, github: 'done', tests: 'pass' }), secondDev: false, gate: null },
  { id: 'review', focus: ['github', 'tests'], zoom: 1.5, parcel: 'tests', stations: states({ ...UP_TO_DEV, github: 'pass', tests: 'pass' }), secondDev: false, gate: null },
  // The last stop pulls back to the whole route, every step behind the change.
  { id: 'live', focus: STATIONS, zoom: 1, parcel: 'live', stations: states({ ...UP_TO_DEV, github: 'pass', tests: 'pass', live: 'pass' }), secondDev: false, gate: null },
]

// The hero picture at the top of the page: the whole diorama, the change waiting at GitHub.
export const HERO_FRAME: StoryFrame = {
  id: 'hero',
  focus: STATIONS,
  zoom: 1,
  parcel: 'github',
  stations: states({ ...UP_TO_DEV, github: 'active' }),
  secondDev: false,
  gate: null,
}

// How far through the story the page is, from where each card's centre is on screen.
//   centers  the vertical centre of each card, in the same units as `line` (pixels from the top
//            of the viewport, from getBoundingClientRect)
//   line     the reading line: the height on screen where a card counts as "current"
// Returns 0 while the first card is at or below the line, n - 1 once the last card has reached
// it, and a fraction in between, so 2.5 means half way from the third card to the fourth.
export function progressFromCenters(centers: readonly number[], line: number): number {
  const n = centers.length
  if (n === 0 || line <= centers[0]) return 0
  for (let i = 0; i < n - 1; i++) {
    const a = centers[i]
    const b = centers[i + 1]
    if (line < b) return i + (b > a ? (line - a) / (b - a) : 1)
  }
  return n - 1
}

// The card that counts as current: the nearest whole stop.
export const stopIndex = (progress: number, count: number) => Math.min(count - 1, Math.max(0, Math.round(progress)))

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpXZ = (a: XZ, b: XZ, k: number): XZ => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function centroid(stations: readonly Station[], positions: Record<Station, XZ>): XZ {
  const sum = stations.reduce<[number, number]>((acc, s) => [acc[0] + positions[s][0], acc[1] + positions[s][1]], [0, 0])
  return [sum[0] / stations.length, sum[1] / stations.length]
}

// Height of the point the camera looks at. At 1 the whole diorama sits centred on screen, the
// same framing as fitCamera, so the last stop matches the hero picture.
export const FOCUS_Y = 1
// The bar lifts in the first part of the step from "conflict" to "merged", then their parcel
// rides into yours, as in the game (mergeGate.ts).
const BAR_SHARE = 0.4

// Everything the scene needs to draw one moment of the story.
//   index    the current card
//   frame    that card's frame (station colours, the second developer, the gate)
//   focus    the point the camera looks at
//   zoom     how far in, 1 being the whole diorama
//   parcel   your parcel: x and z on the floor, and how high it is in a hop
//   theirs   the teammate's parcel at the merge gate, when there is one
//   gate     the merge gate: where it stands, the two sides, how far the bar is lifted, and
//            whether it shows flat red
//   belt     how far the conveyor has moved, in scene units
export type StoryPose = {
  index: number
  frame: StoryFrame
  focus: [number, number, number]
  zoom: number
  parcel: { at: XZ; lift: number }
  theirs: { at: XZ; lift: number } | null
  gate: { at: XZ; yours: XZ; theirs: XZ; barOpen: number; closed: boolean } | null
  belt: number
}

export function storyPose(frames: readonly StoryFrame[], progress: number, positions: Record<Station, XZ>): StoryPose {
  const n = frames.length
  const p = Math.min(n - 1, Math.max(0, progress))
  const i = Math.min(Math.floor(p), Math.max(0, n - 2))
  const t = n > 1 ? p - i : 0
  const k = ease(t)
  const a = frames[i]
  const b = frames[Math.min(i + 1, n - 1)]
  const index = stopIndex(p, n)
  const at = (id: StopId) => frames.findIndex((f) => f.id === id)

  // The merge gate stands between the developer desk and GitHub, as in the game.
  const g = gatePoints(positions.dev, positions.github, PARCEL_OFFSET)
  const place = (where: Place): XZ => (where === 'gate' ? g.yours : parcelSpot(positions[where]))

  // Your parcel. From GitHub to the test server it rides the conveyor at a steady speed; every
  // other trip is a hop, carried by hand.
  const riding = a.parcel === 'github' && b.parcel === 'tests'
  const moving = a.parcel !== b.parcel
  const parcel = { at: lerpXZ(place(a.parcel), place(b.parcel), riding ? t : k), lift: moving && !riding ? Math.sin(Math.PI * k) : 0 }

  const focusA = centroid(a.focus, positions)
  const focusB = centroid(b.focus, positions)
  const focusXZ = lerpXZ(focusA, focusB, k)

  // The teammate's change: it hops down from GitHub to its side of the gate on the way to the
  // conflict, waits there, then rides through the open gate into yours and is gone.
  const parallel = at('parallel')
  const conflict = at('conflict')
  const merged = at('merged')
  let theirs: StoryPose['theirs'] = null
  let gate: StoryPose['gate'] = null
  if (parallel >= 0 && conflict >= 0 && merged >= 0) {
    if (p > parallel && p <= conflict) {
      const hk = ease(clamp01(p - parallel))
      theirs = { at: lerpXZ(parcelSpot(positions.github), g.theirs, hk), lift: Math.sin(Math.PI * hk) }
    } else if (p > conflict && p < merged) {
      const slide = clamp01((p - conflict - BAR_SHARE) / (1 - BAR_SHARE))
      theirs = slide < 1 ? { at: lerpXZ(g.theirs, g.yours, slide), lift: 0 } : null
    }
    if (index === conflict || index === merged) {
      const barOpen = p <= conflict ? 0 : ease(clamp01((p - conflict) / BAR_SHARE))
      gate = { at: g.gate, yours: g.yours, theirs: g.theirs, barOpen, closed: index === conflict }
    }
  }

  // The conveyor moves only while the parcel rides it, and stays where it stopped.
  const ride = at('github')
  const belt = ride >= 0 && at('tests-red') === ride + 1 ? clamp01(p - ride) * SPACING : 0

  return {
    index,
    frame: frames[index],
    focus: [focusXZ[0], FOCUS_Y, focusXZ[1]],
    zoom: lerp(a.zoom, b.zoom, k),
    parcel,
    theirs,
    gate,
    belt,
  }
}

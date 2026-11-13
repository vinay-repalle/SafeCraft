// Phase 8: a still picture of the diorama, worked out as flat shapes for an SVG. It is what the
// landing page shows before the 3D scene has loaded, and instead of it under reduced motion, with
// no WebGL, or on a weak device ("a still picture per scroll stop").
//
// It looks at the same stations from the same isometric angle as the 3D camera, so when the 3D
// scene fades in over it, nothing jumps. Each object is drawn as a box: its top and the two sides
// that face the camera, painted back to front (the "painter's algorithm": draw what is far first,
// so what is near covers it). Colours are CSS colours built from the theme tokens, so light and
// dark mode work with no extra code. No three.js here.
import { STATIONS, type Station } from '../../engine/types'
import type { StationState } from '../../store/levelStore'
import { STATE_TEXT, STATION_INFO } from '../pipeline/stationInfo'
import { LABEL_HEIGHT, PAD, PARCEL_Y, SCENE_TOP, SPACING, parcelSpot, slabSize, stationPositions, type SceneLayout } from '../pipeline/sceneLayout'
import { FOCUS_Y, storyPose, type StoryFrame } from './story'

// Pixels per scene unit in the SVG's own coordinates. The SVG is then scaled to fit its box.
export const UNIT = 48

// The isometric projection. The camera looks along (-1,-1,-1); its "right" on screen is
// (1, 0, -1) and its "up" is (-1, 2, -1), each scaled to length 1. A point's screen position is
// how far it lies along each of those. Screen y grows downward, so "up" is subtracted.
export function project(x: number, y: number, z: number): [number, number] {
  return [((x - z) / Math.SQRT2) * UNIT, ((x + z - 2 * y) / Math.sqrt(6)) * UNIT]
}

const token = (name: string) => `var(--${name})`
const mixCss = (a: string, b: string, amount: number) => `color-mix(in srgb, ${a}, ${b} ${Math.round(amount * 100)}%)`
// The two sides facing the camera are a little darker than the top, as the 3D light makes them.
const side = (fill: string, amount: number) => mixCss(fill, 'black', amount)

const C = {
  card: token('card'),
  raised: token('raised'),
  ink: token('ink'),
  ink2: token('ink-2'),
  ink3: token('ink-3'),
  accent: token('accent'),
  pass: token('pass'),
  fail: token('fail'),
}

// The same pad and pennant colours as stations.tsx and sceneColors.ts.
function padFill(state: StationState): string {
  if (state === 'pass') return mixCss(C.card, C.pass, 0.5)
  if (state === 'fail') return mixCss(C.card, C.fail, 0.5)
  if (state === 'done') return mixCss(C.card, C.ink3, 0.18)
  return C.card
}
function stateFill(state: StationState): string {
  if (state === 'active') return C.accent
  if (state === 'done') return C.ink2
  if (state === 'pass') return C.pass
  if (state === 'fail') return C.fail
  return mixCss(C.raised, C.ink3, 0.35)
}

// One box: centre on the floor (x, z), bottom height y, size [width, height, depth].
type Box = { x: number; z: number; y: number; size: [number, number, number]; fill: string; outline?: string; layer?: number }
export type Face = { points: string; fill: string; stroke?: string }
// A name tag, centred on (x, y), in the SVG's own units. `scale` grows the tags of a cropped
// stop, which is drawn smaller, so they stay readable.
export type StillLabel = { x: number; y: number; id: Station; state: StationState; text: string; width: number; scale: number }

// Tag sizes in the SVG's own units, at scale 1.
export const LABEL_FONT = 13
export const LABEL_H = 24
const LABEL_CHAR = 7.1 // rough width of one character at that size
const LABEL_PAD = 30 // swatch and padding
export type Still = { viewBox: string; faces: Face[]; labels: StillLabel[] }

function boxFaces(b: Box): Face[] {
  const [w, h, d] = b.size
  const x0 = b.x - w / 2
  const x1 = b.x + w / 2
  const z0 = b.z - d / 2
  const z1 = b.z + d / 2
  const y0 = b.y
  const y1 = b.y + h
  const poly = (pts: [number, number, number][]) => pts.map(([x, y, z]) => project(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ')
  return [
    { points: poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]), fill: side(b.fill, 0.1) },
    { points: poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]), fill: side(b.fill, 0.2) },
    { points: poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]), fill: b.fill, stroke: b.outline },
  ]
}

const PAD_H = 0.16
const WOOD = mixCss(C.raised, C.ink3, 0.55)

// A person: a body and a head.
const person = (x: number, z: number, shirt: string): Box[] => [
  { x, z, y: PAD_H, size: [0.42, 0.62, 0.42], fill: shirt },
  { x, z, y: PAD_H + 0.66, size: [0.34, 0.34, 0.34], fill: C.ink3 },
]
const desk = (x: number, z: number): Box[] => [
  { x, z, y: PAD_H + 0.68, size: [1.5, 0.08, 0.8], fill: WOOD },
  { x: x - 0.65, z: z + 0.3, y: PAD_H, size: [0.08, 0.68, 0.08], fill: C.ink3 },
  { x: x + 0.65, z: z + 0.3, y: PAD_H, size: [0.08, 0.68, 0.08], fill: C.ink3 },
]

// The objects on each station, in the station's own coordinates. A simpler version of the 3D
// bodies in stations.tsx: the same footprint, height and colours, built from boxes only.
function stationBoxes(id: Station, state: StationState, secondDev: boolean): Box[] {
  switch (id) {
    case 'client':
      return [...person(-0.35, 0.2, C.ink2), { x: 0.45, z: 0, y: PAD_H + 1.35, size: [1.1, 0.6, 0.1], fill: C.raised }]
    case 'pm':
      return [
        { x: 0, z: -0.85, y: PAD_H + 0.75, size: [1.7, 1.1, 0.06], fill: C.raised },
        { x: 0, z: -0.82, y: PAD_H + 1.42, size: [0.36, 0.22, 0.02], fill: C.accent, layer: 1 },
        ...desk(0, 0.1),
        // The ticket being written, on the desk.
        { x: 0.3, z: 0.25, y: PAD_H + 0.76, size: [0.44, 0.03, 0.58], fill: C.card, layer: 1 },
        ...person(0.95, 0.75, C.ink2),
      ]
    case 'dev':
      return [
        ...desk(0, -0.1),
        { x: 0, z: -0.25, y: PAD_H + 0.95, size: [0.8, 0.5, 0.05], fill: C.ink },
        ...person(0, 0.85, C.accent),
        ...(secondDev ? person(1.0, 0.45, C.ink2) : []),
      ]
    case 'github':
      return [0, 1, 2].map((i) => ({ x: 0, z: 0, y: PAD_H + 0.04 + i * 0.38, size: [1.3, 0.32, 1.3] as [number, number, number], fill: i === 1 ? C.ink2 : mixCss(C.ink2, C.card, 0.25) }))
    case 'tests':
      return [
        { x: 0, z: 0, y: PAD_H, size: [1.2, 1.8, 0.85], fill: C.ink2 },
        { x: 0, z: 0.44, y: PAD_H + 1.4, size: [0.9, 0.2, 0.03], fill: stateFill(state), layer: 1 },
      ]
    case 'live': {
      const cloud = state === 'pass' ? mixCss(C.card, C.pass, 0.5) : state === 'fail' ? mixCss(C.card, C.fail, 0.5) : mixCss(C.card, C.ink3, 0.2)
      return [
        { x: 0, z: 0, y: PAD_H, size: [1.8, 0.3, 1.8], fill: C.ink2 },
        { x: -0.45, z: 0, y: PAD_H + 0.55, size: [0.9, 0.7, 0.8], fill: cloud },
        { x: 0.45, z: 0, y: PAD_H + 0.55, size: [0.9, 0.7, 0.8], fill: cloud },
        { x: 0, z: 0, y: PAD_H + 0.75, size: [1.0, 0.85, 0.9], fill: cloud, layer: 1 },
      ]
    }
  }
}

// The pennant on the back corner of every pad repeats the station state.
const pennant = (state: StationState): Box[] => [
  { x: -PAD / 2 + 0.2, z: -PAD / 2 + 0.2, y: PAD_H, size: [0.06, 0.9, 0.06], fill: C.ink3 },
  { x: -PAD / 2 + 0.42, z: -PAD / 2 + 0.2, y: PAD_H + 0.67, size: [0.4, 0.22, 0.03], fill: stateFill(state) },
]

const BOUNDS_MARGIN = 0.3 // scene units of air around the picture
const STILL_CROP = 0.75
const STILL_LIFT = 0.6

// The picture of one stop of the story (or the hero), for a layout and the area to show.
//   frames, index  the story and the stop to draw (the hero is a story of one frame)
//   crop           true: frame the stations the stop is about, as the 3D camera does there
//                  false: the whole diorama
//   aspect         width / height of the box it is shown in (0: the crop's own shape)
export function buildStill(frames: readonly StoryFrame[], index: number, layout: SceneLayout, crop: boolean, aspect = 0): Still {
  const positions = stationPositions(layout)
  const pose = storyPose(frames, index, positions)
  const frame = frames[index]
  const slab = slabSize(layout)

  // Ground first, in a fixed order: base, path strips, pads. Nothing stands under them.
  const ground: Box[] = [{ x: 0, z: 0, y: -0.4, size: [slab.width, 0.4, slab.depth], fill: mixCss(C.raised, C.ink3, 0.15) }]
  STATIONS.slice(0, -1).forEach((id, i) => {
    const [ax, az] = positions[id]
    const [bx, bz] = positions[STATIONS[i + 1]]
    const across = SPACING - PAD + 0.2
    ground.push({ x: (ax + bx) / 2, z: (az + bz) / 2, y: 0, size: ax !== bx ? [across, 0.06, 0.5] : [0.5, 0.06, across], fill: mixCss(C.raised, C.ink3, 0.3) })
  })
  for (const id of STATIONS) {
    const state = frame.stations[id]
    ground.push({ x: positions[id][0], z: positions[id][1], y: 0, size: [PAD, PAD_H, PAD], fill: padFill(state), outline: state === 'active' ? C.accent : undefined })
  }

  // Everything standing on the ground, sorted far to near.
  const standing: Box[] = []
  for (const id of STATIONS) {
    const [sx, sz] = positions[id]
    for (const b of [...stationBoxes(id, frame.stations[id], frame.secondDev), ...pennant(frame.stations[id])]) standing.push({ ...b, x: b.x + sx, z: b.z + sz })
  }
  // The conveyor from GitHub to the test server.
  const [gx, gz] = parcelSpot(positions.github)
  const [tx, tz] = parcelSpot(positions.tests)
  const along = Math.abs(tx - gx) > Math.abs(tz - gz)
  const beltLong = Math.hypot(tx - gx, tz - gz) + 0.6
  standing.push({ x: (gx + tx) / 2, z: (gz + tz) / 2, y: 0.13, size: along ? [beltLong, 0.05, 0.42] : [0.42, 0.05, beltLong], fill: C.ink2, layer: -1 })
  // The merge gate, closed and red, or open.
  if (pose.gate) {
    const { at: gate, yours, theirs } = pose.gate
    const acrossX = Math.abs(theirs[0] - yours[0]) < Math.abs(theirs[1] - yours[1])
    for (const s of [-1, 1]) standing.push({ x: gate[0] + (acrossX ? s * 0.32 : 0), z: gate[1] + (acrossX ? 0 : s * 0.32), y: 0, size: [0.08, 0.6, 0.08], fill: C.ink3 })
    if (pose.gate.closed) standing.push({ x: gate[0], z: gate[1], y: 0.44, size: acrossX ? [0.76, 0.12, 0.06] : [0.06, 0.12, 0.76], fill: C.fail, layer: 1 })
  }
  // Your parcel, and the teammate's at the gate, each with its ribbon on top as in the 3D scene.
  const parcel = (at: readonly [number, number], body: string, ribbon: string): Box[] => [
    { x: at[0], z: at[1], y: PARCEL_Y, size: [0.42, 0.36, 0.42], fill: body, layer: 2 },
    { x: at[0], z: at[1], y: PARCEL_Y + 0.36, size: [0.44, 0.02, 0.1], fill: ribbon, layer: 3 },
    { x: at[0], z: at[1], y: PARCEL_Y + 0.36, size: [0.1, 0.02, 0.44], fill: ribbon, layer: 3 },
  ]
  standing.push(...parcel(pose.parcel.at, C.accent, C.card))
  if (pose.theirs) standing.push(...parcel(pose.theirs.at, C.ink2, C.ink3))

  // Nearer to the camera means a larger x + z. `layer` lifts small things that sit on or in
  // front of a bigger one (a ticket on a desk) above it when their depths tie.
  standing.sort((a, b) => a.x + a.z - (b.x + b.z) + ((a.layer ?? 0) - (b.layer ?? 0)) * 0.6)

  const faces = [...ground, ...standing].flatMap(boxFaces)

  // The area the 3D camera fits: the base's corners and the top of every pad.
  const pts: [number, number][] = []
  for (const x of [-slab.width / 2, slab.width / 2]) for (const z of [-slab.depth / 2, slab.depth / 2]) pts.push(project(x, -0.4, z))
  for (const [sx, sz] of Object.values(positions)) for (const dx of [-PAD / 2, PAD / 2]) for (const dz of [-PAD / 2, PAD / 2]) pts.push(project(sx + dx, SCENE_TOP, sz + dz))
  const m = BOUNDS_MARGIN * UNIT
  const minX = Math.min(...pts.map((p) => p[0])) - m
  const maxX = Math.max(...pts.map((p) => p[0])) + m
  const minY = Math.min(...pts.map((p) => p[1])) - m
  const maxY = Math.max(...pts.map((p) => p[1])) + m
  let box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  const whole = { ...box }
  if (crop) {
    // A still is often shown smaller than the 3D panel, so it crops a little less, and centres a
    // little higher so the name tags above the stations fit. It takes the shape of the box it is
    // shown in, so what shows is exactly the crop; the whole diorama is widened, not cut.
    const zoom = frame.zoom > 1 ? 1 + (frame.zoom - 1) * STILL_CROP : 1
    const [cx, cy] = zoom > 1 ? project(pose.focus[0], FOCUS_Y + STILL_LIFT, pose.focus[2]) : [box.x + box.w / 2, box.y + box.h / 2]
    let h = box.h / zoom
    let w = aspect > 0 ? h * aspect : box.w / zoom
    if (zoom > 1 && w > box.w) {
      w = box.w
      h = w / aspect
    }
    const place = (lo: number, len: number, size: number, centre: number) => (size >= len ? lo + (len - size) / 2 : Math.min(lo + len - size, Math.max(lo, centre - size / 2)))
    box = { x: place(whole.x, whole.w, w, cx), y: place(whole.y, whole.h, h, cy), w, h }
  }
  // A cropped stop names only the stations it is about, a little larger. A tag that would run off
  // the picture is nudged back inside it (only dropped if the picture is narrower than the tag).
  // The whole diorama names every station.
  const cropped = crop && frame.zoom > 1
  const scale = cropped ? 1.3 : 1
  const named = cropped ? frame.focus : STATIONS
  const labels: StillLabel[] = named.flatMap((id) => {
    const [px, py] = project(positions[id][0], LABEL_HEIGHT[id], positions[id][1])
    const state = frame.stations[id]
    const text = state === 'idle' ? STATION_INFO[id].name : `${STATION_INFO[id].name} · ${STATE_TEXT[state]}`
    const width = Math.round(text.length * LABEL_CHAR + LABEL_PAD)
    const half = (width * scale) / 2
    const halfH = (LABEL_H * scale) / 2
    if (half * 2 > box.w || halfH * 2 > box.h) return []
    const x = Math.min(box.x + box.w - half, Math.max(box.x + half, px))
    const y = Math.min(box.y + box.h - halfH, Math.max(box.y + halfH, py))
    return [{ x, y, id, state, text, width, scale }]
  })
  return { viewBox: [box.x, box.y, box.w, box.h].map((n) => n.toFixed(1)).join(' '), faces, labels }
}


// Pure helpers for the 3D diorama: where stations stand, how the package eases between
// them, and whether this device should draw the scene at all. No three.js in here, so
// all of it is unit-tested in Node and the heavy 3D code stays in its own lazy chunk.
import { STATIONS, type Station } from '../../engine/types'

export type SceneLayout = 'wide' | 'tall'
export type XZ = readonly [number, number]

// Distance between neighbouring station centres, and the width of a station's floor pad.
export const SPACING = 3.4
export const PAD = 2.4
// Border of bare base left around the outermost pads.
export const MARGIN = 0.5

// The stations stand on a U-shaped route, in the order work travels:
//   wide:   client  pm     dev          tall:  client  live
//           live    tests  github              pm      tests
//                                               dev     github
// 'wide' suits a panel wider than it is tall (Pipeline view), 'tall' suits the narrow
// right-hand zone of My view. Both are the same route, turned a quarter turn.
export function stationPositions(layout: SceneLayout): Record<Station, XZ> {
  const result = {} as Record<Station, XZ>
  STATIONS.forEach((station, i) => {
    const lane = i < 3 ? 0 : 1
    const along = lane === 0 ? i : STATIONS.length - 1 - i // 0, 1, 2 along the lane
    const a = (along - 1) * SPACING
    const b = (lane - 0.5) * SPACING
    result[station] = layout === 'wide' ? [a, b] : [b, a]
  })
  return result
}

export const layoutForAspect = (aspect: number): SceneLayout => (aspect >= 1.1 ? 'wide' : 'tall')

// Width and depth of the base slab all the stations stand on.
export function slabSize(layout: SceneLayout): { width: number; depth: number } {
  const long = 2 * SPACING + PAD + 2 * MARGIN
  const short = SPACING + PAD + 2 * MARGIN
  return layout === 'wide' ? { width: long, depth: short } : { width: short, depth: long }
}

// A CSS-style cubic bezier curve, so the package moves on the same easing as the rest of
// the app (cubic-bezier(0.22, 1, 0.36, 1) in index.css). Returns a function that maps
// progress 0..1 to eased progress 0..1.
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  // One coordinate of the curve at parameter t, with end points fixed at 0 and 1.
  const bez = (p1: number, p2: number, t: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    // Find the curve parameter whose x matches, by bisection. 20 steps is far below a pixel.
    let lo = 0
    let hi = 1
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (bez(x1, x2, mid) < x) lo = mid
      else hi = mid
    }
    return bez(y1, y2, (lo + hi) / 2)
  }
}

export const ease = cubicBezier(0.22, 1, 0.36, 1)
export const PACKAGE_SECONDS = 0.8

// "Weak device" check from the PRD risks table: few CPU cores or little memory means the
// 3D scene gets skipped for the 2D list. Both values are hints from the browser and may be
// missing (Safari and Firefox do not report memory), in which case we assume the device is fine.
export function isWeakDevice(hints: { deviceMemory?: number; hardwareConcurrency?: number; renderer?: string }): boolean {
  const { deviceMemory, hardwareConcurrency, renderer } = hints
  if (typeof deviceMemory === 'number' && deviceMemory <= 2) return true
  if (typeof hardwareConcurrency === 'number' && hardwareConcurrency <= 2) return true
  // A software renderer means there is no graphics card doing the work.
  if (renderer && /swiftshader|llvmpipe|software|basic render/i.test(renderer)) return true
  return false
}

// The parcel waits on the front corner of each pad, this far from the station centre on both
// axes. Its base sits on the conveyor belt's height so it rides the belt without sinking in.
// Shared by the game's diorama, the landing page's scenes and the landing page's still pictures.
export const PARCEL_OFFSET: XZ = [0.85, 0.85]
export const PARCEL_Y = 0.19
export const parcelSpot = (p: XZ): XZ => [p[0] + PARCEL_OFFSET[0], p[1] + PARCEL_OFFSET[1]]

// The conveyor between GitHub and the test server: how far it runs past each parcel spot, so
// the parcel starts and ends on the belt, and the gap between its slats.
export const BELT_OVERHANG = 0.3
export const SLAT_GAP = 0.3

// Height of the label above each station, and the highest thing in the scene (used to fit the
// camera). Plain numbers, so the still pictures (isoStill.ts) frame the scene the same way.
export const LABEL_HEIGHT: Record<Station, number> = { client: 2.3, pm: 2.1, dev: 1.9, github: 2.55, tests: 2.2, live: 2.05 }
export const SCENE_TOP = 2.9

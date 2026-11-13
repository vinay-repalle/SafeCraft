// Phase 7i: the conflict scene. When a pull stops on a merge conflict, your parcel (your change)
// and a teammate's parcel (their change, coming down from GitHub) meet at a merge gate between
// the developer desk and GitHub. The gate is flat red and shakes once. When you fix the conflict
// the gate's bar lifts, and their parcel slides into yours: one change, holding both. Pushing
// then carries it on as usual.
//
// This file is the plain part: where the gate and the two parcels stand, and where everything is
// at a given moment. No three.js and no React, so the 3D scene and the 2D list share it and it is
// unit-tested. It builds on the 7g stall (pipelineMotion.ts).
import type { Station } from '../../engine/types'
import { SHAKE_SECONDS, shakeOffset, stallPoint, travel } from './pipelineMotion'
import { PACKAGE_SECONDS, ease, type XZ } from './sceneLayout'

export const GATE_OPEN_SECONDS = 0.4
export const MERGE_SLIDE_SECONDS = 0.6
// How far each parcel waits from the gate, in scene units. The gap between two pads is 1 unit,
// so each parcel sits half on the gap and half on the edge of its own pad.
export const GATE_GAP = 0.55

// Where the conflict is, seen from the screen:
//   closed  the conflict is open: both parcels wait at a closed gate
//   merged  the conflict is fixed but the work has not been pushed: the gate is open and the two
//           changes are one parcel
// null when nothing is stalled.
export type GatePhase = 'closed' | 'merged'

export function gatePhase(stallAt: Station | null, conflictOpen: boolean): GatePhase | null {
  if (!stallAt) return null
  return conflictOpen ? 'closed' : 'merged'
}

// The gate in the gap between two stations, with your parcel on the near side (the station you
// left) and theirs on the far side (the station their change came from). `offset` is the side
// line the parcel always travels along, as in stallPoint.
export function gatePoints(from: XZ, to: XZ, offset: XZ, gap = GATE_GAP): { gate: XZ; yours: XZ; theirs: XZ } {
  const gate = stallPoint(from, to, offset)
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  // The route between two stations always runs along one floor axis.
  const dir: XZ = Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)]
  return {
    gate,
    yours: [gate[0] - dir[0] * gap, gate[1] - dir[1] * gap],
    theirs: [gate[0] + dir[0] * gap, gate[1] + dir[1] * gap],
  }
}

// Everything that moves at the gate, `seconds` after the phase began. Pass Infinity for the end
// state (the first draw, or reduced motion).
//   theirsK        progress of their parcel along its trip, 0..1. In 'closed' the trip is from
//                  GitHub to its side of the gate; in 'merged' it is from there into your parcel
//   theirsLift     how high their parcel is in its hop (0 on the ground)
//   theirsVisible  false once it has merged into yours
//   shake          sideways offset of the gate (multiply by the size you want)
//   barOpen        0 closed, 1 fully lifted
//   moving         true while anything still moves, so the scene asks for another frame
export type GateFrame = { theirsK: number; theirsLift: number; theirsVisible: boolean; shake: number; barOpen: number; moving: boolean }

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function gateFrame(phase: GatePhase, seconds: number): GateFrame {
  if (phase === 'closed') {
    // Their parcel hops down from GitHub (as long as a parcel hop), then the gate shakes once.
    const { k, lift } = travel('hop', clamp01(seconds / PACKAGE_SECONDS))
    return {
      theirsK: k,
      theirsLift: seconds >= PACKAGE_SECONDS ? 0 : lift,
      theirsVisible: true,
      shake: shakeOffset((seconds - PACKAGE_SECONDS) / SHAKE_SECONDS),
      barOpen: 0,
      moving: seconds < PACKAGE_SECONDS + SHAKE_SECONDS,
    }
  }
  // The bar lifts, then their parcel rides through the open gate into yours and is gone.
  const slide = clamp01((seconds - GATE_OPEN_SECONDS) / MERGE_SLIDE_SECONDS)
  return {
    theirsK: travel('ride', slide).k,
    theirsLift: 0,
    theirsVisible: slide < 1,
    shake: 0,
    barOpen: ease(clamp01(seconds / GATE_OPEN_SECONDS)),
    moving: seconds < GATE_OPEN_SECONDS + MERGE_SLIDE_SECONDS,
  }
}

// In words, for the 2D list and screen readers. The 3D labels use the same lines.
export const YOURS_TEXT = 'Yours'
export const THEIRS_TEXT = 'Theirs'
export const MERGED_TEXT = 'Yours and theirs, merged'
export function gateDescription(phase: GatePhase): string {
  return phase === 'closed'
    ? 'Your change and a teammate’s change edit the same lines, so Git cannot put them together on its own.'
    : 'Both changes are now in one commit, ready to push.'
}
